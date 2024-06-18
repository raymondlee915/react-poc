import { hookState, setWipRoot, getCurrentRoot, setDeletions } from "./render";

export function useState(initial) {
    const { wipFiber, hookIndex } = hookState;

    const oldHook = wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex];

    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: [],
    }

    const actions = oldHook ? oldHook.queue : [];
    actions.forEach(action => {
        hook.state = action(hook.state);
    })

    const setState = action => {
        hook.queue.push(action);
        const currentRoot = getCurrentRoot();
        if (currentRoot) {

            const wipRoot = {
                dom: currentRoot.dom,
                props: currentRoot.props,
                alternate: currentRoot
            }

            setWipRoot(wipRoot);
            setDeletions([]);
        }
        // nextUnitOfWork = wipRoot;
        // deletions = [];
    }


    wipFiber.hooks.push(hook);
    hookState.hookIndex++;
    return [hook.state, setState]
}