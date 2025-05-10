import {Dropdown, Nav} from "react-bootstrap";
import * as React from "react";
import {isSCToken, Token} from "@atomiqlabs/sdk";
import {TokenIcon} from "./TokenIcon";
import {useEffect, useMemo, useState} from "react";
import {capitalizeFirstLetter} from "../utils/Utils";

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

    const [_chainId, setChainId] = useState<string>();
    const chainId = currenciesByChainId[_chainId]!=null ? _chainId : chains?.[0];

    useEffect(() => {
        if(currenciesByChainId!=null && props.value!=null) {
            if(isSCToken(props.value)) {
                const chainCurrencies = currenciesByChainId[props.value.chainId];
                if(chainCurrencies!=null && chainCurrencies.indexOf(props.value)===-1) props.onSelect(chainCurrencies[0])
            }
        }
    }, [props.value, currenciesByChainId]);

    useEffect(() => {
        if(props.value!=null) setChainId(isSCToken(props.value) ? props.value.chainId : "BITCOIN");
    }, [props.value]);

    const [show, setShow] = useState<boolean>();

    return (
        <Dropdown autoClose="outside" show={show} onToggle={val => setShow(val)}>
            <Dropdown.Toggle variant="light" id="dropdown-basic" size="lg" className={"px-2 py-0 "+props.className}>
                <div className="d-flex flex-column">
                    <div className="d-flex flex-row align-items-center">
                        {props.value==null ? "" : <TokenIcon tokenOrTicker={props.value} className="currency-icon"/>}
                        {props.value==null ? "Select currency" : props.value.ticker}
                    </div>
                    <div className="font-smallest d-flex flex-row align-items-center justify-content-center" style={{marginTop: "-4px"}}>
                        {props.value!=null && isSCToken(props.value) ? (
                            <>
                                <img src={"/icons/chains/"+props.value.chainId+".svg"} className="currency-icon-small"/>
                                {capitalizeFirstLetter(props.value.chainId)}
                            </>
                        ) : ""}
                    </div>
                </div>
            </Dropdown.Toggle>

            <Dropdown.Menu>
                <Nav variant="underline" className="mx-3 mb-2" activeKey={chainId} onSelect={(val) => setChainId(val)}>
                    {chains.map(val => {
                        return (
                            <Nav.Item>
                                <Nav.Link eventKey={val} className="py-0 d-flex align-items-center">
                                    <img src={"/icons/chains/"+val+".svg"} className="currency-icon-medium"/>
                                    {capitalizeFirstLetter(val)}
                                </Nav.Link>
                            </Nav.Item>
                        );
                    })}
                </Nav>
                <CurrenciesEntry currencies={currenciesByChainId[chainId]} onSelect={(val) => {
                    setShow(false);
                    props.onSelect(val);
                }}/>
            </Dropdown.Menu>
        </Dropdown>
    )

}