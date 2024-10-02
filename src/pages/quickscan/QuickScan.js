import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { QRScanner } from "../../components/qr/QRScanner";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { SwapTopbar } from "../../components/SwapTopbar";
import { useEffect, useRef, useState } from "react";
import { smartChainCurrencies } from "../../utils/Currencies";
import { CurrencyDropdown } from "../../components/CurrencyDropdown";
import Icon from "react-icons-kit";
import { ic_contactless } from 'react-icons-kit/md/ic_contactless';
import { LNNFCReader, LNNFCStartResult } from "../../lnnfc/LNNFCReader";
export function QuickScan(props) {
    const navigate = useNavigate();
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [NFCScanning, setNFCScanning] = useState(null);
    const nfcScannerRef = useRef(null);
    useEffect(() => {
        console.log("Set selected currency to null");
        setSelectedCurrency(null);
        const nfcScanner = new LNNFCReader();
        if (!nfcScanner.isSupported())
            return;
        nfcScanner.onScanned((lnurls) => {
            console.log("LNURL read: ", lnurls);
            if (lnurls[0] != null) {
                if (props.onScanned != null) {
                    props.onScanned(lnurls[0]);
                }
                else {
                    console.log("selected currency: ", selectedCurrency);
                    navigate("/scan/2?address=" + encodeURIComponent(lnurls[0]) + (selectedCurrency == null ? "" : "&token=" + encodeURIComponent(selectedCurrency.ticker)));
                }
            }
        });
        nfcScannerRef.current = nfcScanner;
        nfcScanner.start().then((res) => {
            setNFCScanning(res);
        });
        return () => {
            nfcScanner.stop();
        };
    }, []);
    console.log("Currency select: ", selectedCurrency);
    return (_jsxs(_Fragment, { children: [_jsx(SwapTopbar, { selected: 1, enabled: true }), _jsxs("div", { className: "d-flex flex-column flex-grow-1", children: [_jsx("div", { className: "d-flex align-content-center justify-content-center flex-fill", style: {
                            position: "fixed",
                            top: "4rem",
                            bottom: "37px",
                            right: "0px",
                            left: "0px",
                            zIndex: 0
                        }, children: _jsx(QRScanner, { onResult: (result, err) => {
                                if (result != null) {
                                    if (props.onScanned != null) {
                                        props.onScanned(result);
                                    }
                                    else {
                                        console.log("selected currency: ", selectedCurrency);
                                        navigate("/scan/2?address=" + encodeURIComponent(result) + (selectedCurrency == null ? "" : "&token=" + encodeURIComponent(selectedCurrency.ticker)));
                                    }
                                }
                            }, camera: "environment" }) }), _jsx("div", { className: "pb-5 px-3 mt-auto", style: {
                            position: "fixed",
                            bottom: "0rem",
                            right: "0px",
                            left: "0px",
                        }, children: _jsxs("div", { className: "d-flex justify-content-center align-items-center flex-column", children: [_jsx("div", { className: "mx-auto " + (NFCScanning === LNNFCStartResult.OK ? "" : "mb-5"), children: _jsxs("div", { className: "text-white p-3 position-relative", children: [_jsx("label", { children: "Pay with" }), _jsx(CurrencyDropdown, { currencyList: smartChainCurrencies, onSelect: val => {
                                                    setSelectedCurrency(val);
                                                }, value: selectedCurrency, className: "bg-dark bg-opacity-25 text-white" })] }) }), NFCScanning === LNNFCStartResult.OK ? (_jsxs(Button, { className: "mb-4 p-2 bg-opacity-25 bg-dark border-0 d-flex align-items-center text-white flex-row", children: [_jsx("span", { className: "position-relative me-1", style: { fontSize: "1.25rem" }, children: _jsx("b", { children: "NFC" }) }), _jsx(Icon, { size: 32, icon: ic_contactless })] })) : ""] }) })] })] }));
}
