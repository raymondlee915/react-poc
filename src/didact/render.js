let wipRootFiber = null;
let currentRootFiber = null;
let nextUnitOfWork = null;
let deletions = null;

function commitRoot() {
    deletions.forEach(commitWork);
    commitWork(wipRootFiber.child);
    currentRootFiber = wipRootFiber;
    wipRootFiber = null;
}

function commitWork(fiber) {
    if (!fiber) {
        return
    }

    const domParent = fiber.parent.dom
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
        domParent.removeChild(fiber.dom)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

const isEvent = key => key.startsWith("on");
const isProperty = key => key !== "children" && !isEvent(key);
const isNew = (pre, next) => key => pre[key] !== next[key];
const isGone = (pre, next) => key => !(key in next);

function updateDom(dom, preProps, nextProps) {
    Object.keys(preProps)
        .filter(isEvent)
        .filter(key => !(key in nextProps) || isNew(preProps, nextProps)(key))
        .forEach(name => {
            const eventType = name
                .toLowerCase()
                .substring(2);

            dom.removeEventListener(eventType, preProps[name]);
        });

    //Remove old properties
    Object.keys(preProps)
        .filter(isProperty)
        .filter(isGone(preProps, nextProps))
        .forEach(name => {
            dom[name] = "";
        });

    //set new or changed properties
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(preProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name];
        });


    //Add event listeners
    Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(preProps, nextProps))
    .forEach(name =>{
        const eventType = name.toLowerCase().substring(2);

        dom.addEventListener(eventType, nextProps[name]);
    })
}

export function render(element, container) {
    wipRootFiber = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRootFiber
    }
    deletions = [];
    nextUnitOfWork = wipRootFiber;
}


function createDom(fiber) {
    const dom = fiber.type === "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type)
    const isProperty = key => key !== "children"
    Object.keys(fiber.props)
        .filter(isProperty)
        .forEach(name => {
            dom[name] = fiber.props[name]
        })

    return dom;
}

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }

    if (!nextUnitOfWork && wipRootFiber) {
        commitRoot();
    }

    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }

    const elements = fiber.props.children
    reconcileChildren(fiber, elements);

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

        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION";
            deletions.push(oldFiber);
        }

        // const newFiber = {
        //     type: element.type,
        //     props: element.props,
        //     parent: wipFiber,
        //     dom: null
        // }

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
