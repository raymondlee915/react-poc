import * as didact from './didact';
import {Didact} from './index-work';

const customState = {
    count : 1
}

window.setInterval(()=>{
    customState.count += 1;
},[1000])

window.customState = customState;

/** @jsx didact.createElement */

const container = document.getElementById("root");

const updateValue = e => {
    rerender(e.target.value)
}

const rerender = value => {
    const element = (
        <div>
            <input onInput={updateValue} value={value} />
            <h2>Hello {value}</h2>
        </div>
    )
    Didact.render(element, container)
}

rerender("World")