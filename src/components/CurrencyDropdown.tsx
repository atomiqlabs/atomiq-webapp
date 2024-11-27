import {Dropdown} from "react-bootstrap";
import * as React from "react";
import {Token} from "@atomiqlabs/sdk";
import {TokenIcon} from "./TokenIcon";

export function CurrencyDropdown(props: {
    currencyList: Token[],
    onSelect: (currency: Token) => void,
    value: Token,
    className?: string
}) {

    return (
        <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-basic" size="lg" className={"px-2 "+props.className}>
                {props.value==null ? "" : <TokenIcon tokenOrTicker={props.value} className="currency-icon"/>}
                {props.value==null ? "Select currency" : props.value.ticker}
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {props.currencyList.map(curr => {
                    return (
                        <Dropdown.Item key={curr.ticker} onClick={() => {
                            props.onSelect(curr);
                        }}>
                            <TokenIcon tokenOrTicker={curr} className="currency-icon"/>
                            {curr.name}
                        </Dropdown.Item>
                    )
                })}
            </Dropdown.Menu>
        </Dropdown>
    )

}