import {useState} from "react";
import {Badge, Dropdown} from "react-bootstrap";
import * as React from "react";
import {useWalletList} from "../utils/useWalletList";

type MultichainWallet = {
    name: string,
    icon: string,
    chains: {
        [chain: string]: {
            disconnect: () => Promise<void> | void,
            changeWallet: () => Promise<void> | void,
            name: string,
            icon: string
        }
    }
};

function MultichainWalletDisplay(props: {
    wallet: MultichainWallet,
    className?: string
}) {
    const chains = Object.keys(props.wallet.chains).map(chain => props.wallet.chains[chain]);

    const [show, setShow] = useState<boolean>(false);

    return (
        <Dropdown align="end" show={show} onToggle={(nextShow) => setShow(nextShow)}>
            <Badge id={"dropdown"+props.wallet.name} pill bg="dark" className="ms-1 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row" onClick={() => setShow(true)}>
                <img width={24} height={24} src={props.wallet.icon} className="me-1"/>
                <div className={"me-auto pe-1 "+(!show ? "d-none" : "")}>{props.wallet.name}</div>
                <div style={{width: "1px", height: "1rem"}} className="me-2 bg-light bg-opacity-25"></div>
                {chains.map(value => {
                    return (
                        <img style={{marginLeft: "-4px"}} width={18} height={18} key={value.name} src={value.icon}/>
                    );
                })}
            </Badge>

            <Dropdown.Menu popperConfig={{strategy: "absolute"}}>
                {chains.map(value => {
                    return (
                        <>
                            <Dropdown.Header>{value.name}</Dropdown.Header>
                            <Dropdown.Item onClick={() => value.disconnect()}>Disconnect</Dropdown.Item>
                            {value.changeWallet!=null ? (
                                <Dropdown.Item onClick={() => value.changeWallet()}>Change wallet</Dropdown.Item>
                            ) : ""}
                        </>
                    );
                })}
            </Dropdown.Menu>
        </Dropdown>
    )
}

export function WalletConnectionsSummary(props: {}) {
    const chainWalletData = useWalletList();

    const connectedWallets: {
        [walletName: string]: MultichainWallet
    } = {};
    for(let chain in chainWalletData) {
        const chainData = chainWalletData[chain];
        if(chainData.name==null) continue;
        connectedWallets[chainData.name] ??= {
            name: chainData.name,
            icon: chainData.icon,
            chains: {}
        };
        connectedWallets[chainData.name].chains[chain] = {
            name: chainData.chainName,
            icon: chainData.chainLogo,
            disconnect: chainData.disconnect,
            changeWallet: chainData.changeWallet
        };
    }

    const walletsArr: MultichainWallet[] = Object.keys(connectedWallets).map(key => connectedWallets[key]);

    return (
        <div className="d-flex flex-row">
            {walletsArr.map(value => <MultichainWalletDisplay key={value.name} wallet={value}/>)}
        </div>
    )

}
