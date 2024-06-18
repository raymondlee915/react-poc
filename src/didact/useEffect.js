import { hookState } from "./render";

export function useEffect(callback, dependencies){
    const {wipFiber, hookIndex} = hookState;

    const oldHook = wipFiber.alternate &&
        wipFiber.alternate.hooks &&
        wipFiber.alternate.hooks[hookIndex];

    const hasChanged = (!dependencies || !oldHook)
        ? true: dependencies.some((d, i) => d !== oldHook.dependencies[i]);

    const hook = {
        callback: hasChanged ? callback : oldHook.callback,
        dependencies: hasChanged ? dependencies : oldHook.dependencies,
    }

    if (hasChanged){
        setTimeout(() => {
            hook.callback();
        }, 0)
    }

    wipFiber.hooks.push(hook);
    hookState.hookIndex++;
}