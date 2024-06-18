let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null


const isEvent = key => key.startsWith("on")
const isProperty = key =>
    key !== "children" && !isEvent(key)
const isNew = (prev, next) => key =>
    prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

function commitRoot() {
    deletions.forEach(commitWork);
    commitWork(wipRoot.child);
    currentRoot = wipRoot;
    wipRoot = null;
}

function commitWork(fiber) {
    if (!fiber) {
        return
    }

    let parentFiberWithDom = fiber.parent;
    while (!parentFiberWithDom.dom) {
        parentFiberWithDom = parentFiberWithDom.parent;
    }

    const domParent = parentFiberWithDom.dom
    if (
        fiber.effectTag === "PLACEMENT" &&
        fiber.dom != null
    ) {
        domParent.appendChild(fiber.dom)
    } else if (
        fiber.effectTag === "UPDATE" &&
        fiber.dom != null
    ) {
        updateDom(
            fiber.dom,
            fiber.alternate.props,
            fiber.props
        )
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber);
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom);
    } else {
        commitDeletion(fiber.child, domParent);
    }
}

function updateDom(dom, prevProps, nextProps) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(
            key =>
                !(key in nextProps) ||
                isNew(prevProps, nextProps)(key)
        )
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.removeEventListener(
                eventType,
                prevProps[name]
            )
        })

    // Remove old properties
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = ""
        })

    // Set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name]
        })

    // Add event listeners
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2)
            dom.addEventListener(
                eventType,
                nextProps[name]
            )
        })
}

function createDom(fiber) {
    const dom =
        fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type)

    updateDom(dom, {}, fiber.props)

    return dom
}

function performUnitOfWork(fiber) {
    const isFunctionComponent = fiber.type instanceof Function;

    if (isFunctionComponent) {
        updateFunctionComponent(fiber);
    } else {
        updateHostComponent(fiber);
    }

    if (fiber.child) {
        return fiber.child;
    }

    let nextFiber = fiber;

    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}

function updateFunctionComponent(fiber) {
    // Prepare for calling hooks inside function component
    hookState.wipFiber = fiber;
    hookState.wipFiber.hooks = [];
    hookState.hookIndex = 0;
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }

    const elements = fiber.props.children
    reconcileChildren(fiber, elements)
}

function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    let prevSibling = null

    while (index < elements.length || oldFiber != null) {
        const element = elements[index]
        let newFiber = null;

        //TODO  compare oldFiber to element
        const sameType =
            oldFiber &&
            element &&
            element.type === oldFiber.type;

            //if sametype, update the node
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE"
            }
        }

        // if element exist, but not sameType in order, add a new one
        if (element && !sameType) {
            // TODO add this node
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT"
            }
        }

        // if oldFiber exist, but not sameType in order, delete it
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION";
            deletions.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }

        if (index === 0) {
            wipFiber.child = newFiber
        } else {
            prevSibling.sibling = newFiber
        }

        prevSibling = newFiber
        index++
    }

}

export function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    deletions = []
    nextUnitOfWork = wipRoot
}

export const hookState = {
    wipFiber: null,
    hookIndex: null,
}

export function setWipRoot(fiber) {
    wipRoot = fiber;
    nextUnitOfWork = fiber;
}

export function getCurrentRoot() {
    return currentRoot;
}

export function setDeletions(deletions) {
    deletions = deletions;
}

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }

    if (!nextUnitOfWork && wipRoot) {
        commitRoot();
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)
