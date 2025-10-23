import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Alert, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import ValidatedInput from './ValidatedInput';
import { isBtcToken } from '@atomiqlabs/sdk';
import { fromHumanReadableString } from '@atomiqlabs/sdk';
import { Tokens } from '../FEConstants';
export function WalletDestinationAddress({ outputChainData, outputToken, addressState, addressRef, addressValidator, locked, webLnForOutput, validatedAmount, destinationWarnings, onAddressChange, disconnectWallet, setQrScanning, }) {
    // Compute whether the address is from a connected wallet
    const isOutputWalletAddress = useMemo(() => outputChainData?.wallet?.address === addressState.value, [outputChainData?.wallet?.address, addressState.value]);
    // Check if we should show the lightning alert
    const showLightningAlert = useMemo(() => !locked &&
        outputChainData?.wallet == null &&
        isBtcToken(outputToken) &&
        outputToken.lightning &&
        addressState.data == null, [locked, outputChainData?.wallet, outputToken, addressState.data]);
    return (_jsxs("div", { className: "wallet-address", children: [_jsxs("div", { className: "wallet-address__body", children: [_jsxs("div", { className: "wallet-address__title", children: [outputChainData?.chain?.name ?? outputToken?.chain ?? 'Wallet', " Destination Address"] }), _jsx(ValidatedInput, { type: 'text', className: 'wallet-address__form with-inline-icon ' +
                            (webLnForOutput && addressState.data?.address == null ? 'd-none' : ''), onChange: (val, forcedChange) => {
                            onAddressChange(val, !forcedChange);
                        }, value: addressState.value, inputRef: addressRef, placeholder: 'Enter destination address', onValidate: addressValidator, validated: isOutputWalletAddress ||
                            addressState.value !== addressState.userInput ||
                            !addressState.userInput ||
                            addressState.userInput.trim() === ''
                            ? null
                            : addressState.error?.message, disabled: locked || outputChainData?.wallet != null, textEnd: isOutputWalletAddress ? (_jsx("span", { className: "icon icon-check" })) : addressState.error?.message === 'Invalid address' && addressState.userInput ? (_jsx("span", { className: "icon icon-invalid-error" })) : null, textStart: addressState.loading ? _jsx(Spinner, { className: "text-white" }) : null, successFeedback: isOutputWalletAddress
                            ? 'Wallet address fetched from ' + outputChainData?.wallet.name + '.'
                            : null, dynamicTextEndPosition: true }), destinationWarnings.map((warning, index) => (_jsx(Alert, { variant: "warning", className: "mt-2 mb-0 text-center", children: warning }, index)))] }), _jsx("div", { className: "wallet-address__action", children: locked ? null : outputChainData?.wallet != null ? (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Disconnect wallet & use external wallet" }), children: _jsx("a", { href: "#", className: "wallet-address__action__button", onClick: (e) => {
                            e.preventDefault();
                            if (outputChainData == null)
                                return;
                            disconnectWallet(outputChainData.chainId);
                        }, children: _jsx("span", { className: "icon icon-disconnect" }) }) })) : (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Scan QR code" }), children: _jsx("a", { href: "#", className: "wallet-address__action__button", onClick: (e) => {
                            e.preventDefault();
                            setQrScanning(true);
                        }, children: _jsx("span", { className: "icon icon-qr-scan" }) }) })) }), webLnForOutput ? (_jsx(_Fragment, { children: addressState.data?.address == null && validatedAmount != null ? (_jsx("div", { className: "mt-2", children: _jsx("a", { href: "#", onClick: async (e) => {
                            e.preventDefault();
                            if (validatedAmount == null)
                                return;
                            const webln = outputChainData.wallet.instance;
                            try {
                                const res = await webln.makeInvoice(Number(fromHumanReadableString(validatedAmount, Tokens.BITCOIN.BTCLN)));
                                addressRef.current.setValue(res.paymentRequest);
                            }
                            catch (e) {
                                console.error(e);
                            }
                        }, children: "Fetch invoice from WebLN" }) })) : ('') })) : (''), _jsx(Alert, { variant: 'success', className: "mt-3 mb-0 text-center", show: showLightningAlert, children: _jsx("label", { children: "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount." }) })] }));
}
