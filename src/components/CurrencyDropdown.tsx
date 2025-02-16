import {Dropdown} from "react-bootstrap";
import * as React from "react";
import {isSCToken, Token} from "@atomiqlabs/sdk";
import {TokenIcon} from "./TokenIcon";
import {useMemo} from "react";

function CurrenciesEntry(props: {
    currencies: Token[],
    onSelect: (currency: Token) => void
}) {
    return (
        <>
            {props.currencies.map(curr => {
                return (
                    <Dropdown.Item key={curr.ticker} onClick={() => {
                        props.onSelect(curr);
                    }}>
                        <TokenIcon tokenOrTicker={curr} className="currency-icon"/>
                        {curr.name}
                    </Dropdown.Item>
                )
            })}
        </>
    );
}

export function CurrencyDropdown(props: {
    currencyList: Token[],
    onSelect: (currency: Token) => void,
    value: Token,
    className?: string
}) {

    //Group by chainId
    const {currenciesByChainId, chains} = useMemo(() => {
        const currenciesByChainId = {};
        if(props.currencyList!=null) props.currencyList.forEach(currency => {
            const chainId = isSCToken(currency) ? currency.chainId : "BITCOIN";
            currenciesByChainId[chainId] ??= [];
            currenciesByChainId[chainId].push(currency);
        });
        const chains = Object.keys(currenciesByChainId);
        return {currenciesByChainId, chains};
    }, [props.currencyList]);

    return (
        <Dropdown>
            <Dropdown.Toggle variant="light" id="dropdown-basic" size="lg" className={"px-2 "+props.className}>
                {props.value==null ? "" : <TokenIcon tokenOrTicker={props.value} className="currency-icon"/>}
                {props.value==null ? "Select currency" : props.value.ticker}
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {chains.length>1 ? chains.map(chainId => {
                    return (
                        <>
                            <Dropdown.Header>{chainId}</Dropdown.Header>
                            <CurrenciesEntry currencies={currenciesByChainId[chainId]} onSelect={props.onSelect}/>
                        </>
                    )
                }) : (<CurrenciesEntry currencies={props.currencyList} onSelect={props.onSelect}/>)}
            </Dropdown.Menu>
        </Dropdown>
    )

}