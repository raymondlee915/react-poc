import * as didact from './didact';
import { Didact } from './index-work';

const customState = {
    count: 1
}

window.setInterval(() => {
    customState.count += 1;
}, [1000])

window.customState = customState;

/** @jsx didact.createElement */

const container = document.getElementById("root");
function Counter() {
    const [state, setState] = didact.useState(1);
    const [total, setTotal] = didact.useState(state+4);
    const [state3, setState3] = didact.useState(4);

    didact.useEffect(()=>{
        setTotal(()=> 6 + state);
    },[])

    didact.useEffect(()=>{
        setState3(()=>3+state)
    },[state])

    return (
        <h1 onClick={() => setState(c => c + 1)}>
            Count: {state}
            <hr/>
            Total: {total}
            <hr/>
            Total(Count+3): {state3}
            {
                state3 > 10 ? <h1>State3 is greater than 10</h1> : null
            }
        </h1>
    )
}
function App(props) {
    return <h1>Hi {props.name}
        <Counter />
    </h1>
}

const element = <App name="foo" />;
didact.render(element, container);