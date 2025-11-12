import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Spinner } from 'react-bootstrap';
import { CopyOverlay } from './CopyOverlay';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FromBTCLNSwap } from '@atomiqlabs/sdk';
import { ChainsContext } from '../../context/ChainsContext';
import { useAsync } from '../../hooks/utils/useAsync';
import { useNFCScanner } from '../../hooks/nfc/useNFCScanner';
import { SwapperContext } from '../../context/SwapperContext';
import { NFCStartResult } from '../../utils/NFCReader';
import { useChain } from '../../hooks/chains/useChain';
import { SwapStepAlert } from '../swaps/SwapStepAlert';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { WalletAddressPreview } from './WalletAddressPreview';
//TODO: To be replaced with DisconnectedWalletQrAndAddress & ConnectedWalletPayButtons
export function LightningQR(props) {
    const { swapper } = useContext(SwapperContext);
    const { disconnectWallet } = useContext(ChainsContext);
    const lightningChainData = useChain('LIGHTNING');
    const [payingWithLNURL, setPayingWithLNURL] = useState(false);
    const NFCScanning = useNFCScanner((address) => {
        //TODO: Maybe we need to stop the scanning here as well
        swapper.Utils.getLNURLTypeAndData(address, false)
            .then((result) => {
            if (result.type !== 'withdraw')
                return;
            return result;
        })
            .then((lnurlWithdraw) => {
            return props.quote.settleWithLNURLWithdraw(lnurlWithdraw);
        })
            .then(() => {
            setPayingWithLNURL(true);
        });
    }, !(props.quote instanceof FromBTCLNSwap));
    const [pay, payLoading, payResult, payError] = useAsync(() => lightningChainData.wallet.instance.sendPayment(props.quote.getAddress()), [lightningChainData.wallet, props.quote]);
    const [callPayFlag, setCallPayFlag] = useState(false);
    useEffect(() => {
        if (!callPayFlag)
            return;
        setCallPayFlag(false);
        if (!lightningChainData.wallet)
            return;
        pay();
    }, [callPayFlag, lightningChainData.wallet, pay]);
    useEffect(() => {
        if (props.quote == null || !props.payInstantly)
            return;
        if (lightningChainData.wallet != null)
            pay();
    }, [props.quote, props.payInstantly]);
    const qrContent = useCallback((show) => {
        return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "swap-panel__card__subtitle", children: [_jsx("i", { className: "ico icon-arrow-down" }), _jsx("div", { className: "sc-text", children: "Initiate payment to this lightning network invoice" }), _jsx("i", { className: "ico icon-arrow-down" })] }), _jsx(QRCodeSVG, { value: props.quote.getHyperlink(), size: 240, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                        show(event.target, props.quote.getAddress());
                    }, imageSettings: NFCScanning === NFCStartResult.OK
                        ? {
                            src: '/icons/contactless.png',
                            excavate: true,
                            height: 50,
                            width: 50,
                        }
                        : null }), _jsx(WalletAddressPreview, { address: props.quote.getAddress(), chainName: "Lightning Network", numberName: 'invoice', onCopy: () => {
                        navigator.clipboard.writeText(props.quote.getAddress());
                    } })] }));
    }, [props.quote, NFCScanning]);
    // TODO propably remove all ) : lightningChainData.wallet != null ? ( logic
    return (_jsx(_Fragment, { children: payingWithLNURL ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsx(Spinner, { animation: "border" }), "Paying via NFC card..."] })) : lightningChainData.wallet != null ? (_jsx(_Fragment, { children: _jsx(SwapStepAlert, { show: !!payError, type: "error", icon: ic_warning, title: "Sending Lightning payment failed", description: payError?.message || payError?.toString(), error: payError, className: "mb-4 mt-0" }) })) : (_jsx(CopyOverlay, { placement: "top", children: qrContent })) }));
}
