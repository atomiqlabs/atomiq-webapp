import {QRScanner} from "../../components/qr/QRScanner";
import {Button} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {SwapTopbar} from "../../components/SwapTopbar";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {CurrencySpec, smartChainCurrencies} from "../../utils/Currencies";
import {CurrencyDropdown} from "../../components/CurrencyDropdown";
import Icon from "react-icons-kit";
import {ic_contactless} from 'react-icons-kit/md/ic_contactless';
import {ic_disabled_by_default} from 'react-icons-kit/md/ic_disabled_by_default';
import {LNNFCReader, LNNFCStartResult} from "../../lnnfc/LNNFCReader";

export function QuickScan(props: {
    onScanned?: (data: string) => void
}) {
    const navigate = useNavigate();

    const [selectedCurrency, setSelectedCurrency] = useState<CurrencySpec>(null);
    const [NFCScanning, setNFCScanning] = useState<LNNFCStartResult>(null);

    const nfcScannerRef = useRef<LNNFCReader>(null);

    useEffect(() => {
        console.log("Set selected currency to null");
        setSelectedCurrency(null);

        const nfcScanner = new LNNFCReader();
        if(!nfcScanner.isSupported()) return;
        nfcScanner.onScanned((lnurls: string[]) => {
            console.log("LNURL read: ", lnurls);

            if(lnurls[0]!=null) {
                if(props.onScanned!=null) {
                    props.onScanned(lnurls[0]);
                } else {
                    console.log("selected currency: ", selectedCurrency);
                    navigate("/scan/2?address="+encodeURIComponent(lnurls[0])+(
                        selectedCurrency==null ? "" : "&token="+encodeURIComponent(selectedCurrency.ticker)
                    ));
                }
            }
        });
        nfcScannerRef.current = nfcScanner;

        nfcScanner.start().then((res: LNNFCStartResult) => {
            setNFCScanning(res);
        });

        return () => {
            nfcScanner.stop();
        };
    }, []);

    console.log("Currency select: ", selectedCurrency);

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
                        if(result!=null) {
                            if(props.onScanned!=null) {
                                props.onScanned(result);
                            } else {
                                console.log("selected currency: ", selectedCurrency);
                                navigate("/scan/2?address="+encodeURIComponent(result)+(
                                    selectedCurrency==null ? "" : "&token="+encodeURIComponent(selectedCurrency.ticker)
                                ));
                            }
                        }
                    }} camera={"environment"}/>
                </div>

                {/*<div className="bg-dark bg-opacity-25 p-5 mt-auto d-flex justify-content-center align-items-center">*/}
                    {/*<div className="text-white mb-5 p-3 position-relative">*/}
                        {/*<label>Pay with</label>*/}
                        {/*<CurrencyDropdown currencyList={smartChainCurrencies} onSelect={val => {*/}
                            {/*setSelectedCurrency(val);*/}
                        {/*}} value={selectedCurrency} className="bg-dark bg-opacity-25 text-white"/>*/}
                    {/*</div>*/}

                    {/*<Button>Paste from clipboard</Button>*/}
                {/*</div>*/}

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
                                <CurrencyDropdown currencyList={smartChainCurrencies} onSelect={val => {
                                    setSelectedCurrency(val);
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