import {QRScanner} from "../../components/qr/QRScanner";
import {Button} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {SwapTopbar} from "../../components/SwapTopbar";
import * as React from "react";
import {useState} from "react";
import {smartChainTokenArray} from "../../utils/Currencies";
import {CurrencyDropdown} from "../../components/CurrencyDropdown";
import Icon from "react-icons-kit";
import {ic_contactless} from 'react-icons-kit/md/ic_contactless';
import {LNNFCStartResult} from "../../lnnfc/LNNFCReader";
import {SCToken} from "@atomiqlabs/sdk";
import {useNFCScanner} from "../../lnnfc/useNFCScanner";

export function QuickScan(props: {
    onScanned?: (data: string) => void
}) {
    const navigate = useNavigate();

    const [selectedCurrency, setSelectedCurrency] = useState<SCToken>(null);

    const onScanned = (res: string) => {
        if(props.onScanned!=null) {
            props.onScanned(res);
        } else {
            navigate("/scan/2?address="+encodeURIComponent(res)+(
                selectedCurrency==null ? "" : "&token="+encodeURIComponent(selectedCurrency.ticker)
                    +"&chainId="+encodeURIComponent(selectedCurrency.chainId)
            ));
        }
    };

    const NFCScanning = useNFCScanner(onScanned);

    return (
        <>
            <SwapTopbar selected={1} enabled={true}/>
            <div className="d-flex flex-column flex-grow-1">
                <div className="d-flex align-content-center justify-content-center flex-fill" style={{
                    position: "fixed",
                    top: "4rem",
                    bottom: "37px",
                    right: "0px",
                    left: "0px",
                    zIndex: 0
                }}>
                    <QRScanner onResult={(result, err) => {
                        if(result==null) return;
                        onScanned(result);
                    }} camera={"environment"}/>
                </div>

                <div className="pb-5 px-3 mt-auto" style={{
                    position: "fixed",
                    bottom: "0rem",
                    right: "0px",
                    left: "0px",
                }}>
                    <div className="d-flex justify-content-center align-items-center flex-column">
                        <div className={"mx-auto "+(NFCScanning===LNNFCStartResult.OK ? "" : "mb-5")}>
                            <div className="text-white p-3 position-relative">
                                <label>Pay with</label>
                                <CurrencyDropdown currencyList={smartChainTokenArray} onSelect={val => {
                                    setSelectedCurrency(val as SCToken);
                                }} value={selectedCurrency} className="bg-dark bg-opacity-25 text-white"/>
                            </div>
                        </div>
                        {NFCScanning===LNNFCStartResult.OK ? (
                            <Button className="mb-4 p-2 bg-opacity-25 bg-dark border-0 d-flex align-items-center text-white flex-row">
                                <span className="position-relative me-1" style={{fontSize: "1.25rem"}}><b>NFC</b></span>
                                <Icon size={32} icon={ic_contactless}/>
                            </Button>
                        ) : ""}
                    </div>
                </div>

            </div>
        </>
    )
}