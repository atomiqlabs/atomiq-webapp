import {Dropdown} from "react-bootstrap";
import * as React from "react";
import {CurrencySpec} from "../utils/Currencies";

export function CurrencyDropdown(props: {
    currencyList: CurrencySpec[],
    onSelect: (currency: CurrencySpec) => void,
    value: CurrencySpec,
    className?: string
}) {

    return (
        <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-basic" size="lg" className={"px-2 "+props.className}>
                {props.value==null ? "" : <img className="currency-icon" src={props.value.icon}/>}
                {props.value==null ? "Select currency" : props.value.ticker}
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {props.currencyList.map(curr => {
                    return (
                        <Dropdown.Item key={curr.ticker} onClick={() => {
                            props.onSelect(curr);
                        }}>
                            <img className="currency-icon" src={curr.icon}/>
                            {curr.ticker}
                        </Dropdown.Item>
                    )
                })}
            </Dropdown.Menu>
        </Dropdown>
    )

}