import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Alert, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import ValidatedInput from './ValidatedInput';
import { isBtcToken } from '@atomiqlabs/sdk';
import { fromHumanReadableString } from '@atomiqlabs/sdk';
import { Tokens } from '../FEConstants';
export function WalletDestinationAddress({ outputChainData, outputToken, addressState, addressRef, addressValidator, locked, webLnForOutput, validatedAmount, quote, onAddressChange, disconnectWallet, setQrScanning, }) {
    // Compute whether the address is from a connected wallet
    const isOutputWalletAddress = useMemo(() => outputChainData?.wallet?.address === addressState.value, [outputChainData?.wallet?.address, addressState.value]);
    // Validation error (actual errors that make the input invalid)
    const validationError = useMemo(() => {
        if (!addressState.userInput || addressState.userInput.trim() === '')
            return null;
        if (isOutputWalletAddress || addressState.value !== addressState.userInput)
            return null;
        // Only return actual address parsing errors, not warnings
        return addressState.error?.message;
    }, [addressState, isOutputWalletAddress]);
    // Warning message for valid addresses with potential issues
    const warningMessage = useMemo(() => {
        if (!addressState.userInput || addressState.userInput.trim() === '')
            return null;
        if (isOutputWalletAddress || addressState.value !== addressState.userInput)
            return null;
        if (!quote || !addressState.data)
            return null; // Only show warnings if address is valid (has data)
        if (addressState.error)
            return null; // Don't show warnings if there's a validation error
        // TODO not really tested, just estimated once it will return true
        if (quote.willLikelyFail?.()) {
            return 'This destination is likely not payable.';
        }
        if (quote.isPayingToNonCustodialWallet?.()) {
            return 'Please make sure your receiving wallet is online';
        }
        return null;
    }, [addressState, isOutputWalletAddress, quote]);
    // Check if we should show the lightning alert
    const showLightningAlert = useMemo(() => !locked &&
        outputChainData?.wallet == null &&
        isBtcToken(outputToken) &&
        outputToken.lightning &&
        addressState.data == null, [locked, outputChainData?.wallet, outputToken, addressState.data]);
    return (_jsxs("div", { className: "wallet-address", children: [_jsxs("div", { className: "wallet-address__body", children: [_jsxs("div", { className: "wallet-address__title", children: [outputChainData?.chain?.name ?? outputToken?.chain ?? 'Wallet', " Destination Address"] }), _jsx(ValidatedInput, { type: 'text', className: 'wallet-address__form with-inline-icon ' +
                            (webLnForOutput && addressState.data?.address == null ? 'd-none' : ''), onChange: (val, forcedChange) => {
                            onAddressChange(val, !forcedChange);
                        }, value: addressState.value, inputRef: addressRef, placeholder: 'Enter destination address', onValidate: addressValidator, validated: validationError, disabled: locked || outputChainData?.wallet != null, textEnd: isOutputWalletAddress ? (_jsx("span", { className: "icon icon-check" })) : validationError && addressState.userInput ? (_jsx("span", { className: "icon icon-invalid-error" })) : warningMessage ? (_jsx("span", { className: "icon icon-info" })) : null, textStart: addressState.loading ? _jsx(Spinner, { className: "text-white" }) : null, successFeedback: isOutputWalletAddress
                            ? 'Wallet address fetched from ' + outputChainData?.wallet.name + '.'
                            : null, dynamicTextEndPosition: true }), warningMessage && (_jsx("div", { className: "wallet-address__feedback is-warning", children: warningMessage }))] }), _jsx("div", { className: "wallet-address__action", children: locked ? null : outputChainData?.wallet != null ? (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "scan-qr-tooltip", children: "Disconnect wallet & use external wallet" }), children: _jsx("a", { href: "#", className: "wallet-address__action__button", onClick: (e) => {
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
                        }, children: "Fetch invoice from WebLN" }) })) : ('') })) : (''), _jsx(Alert, { variant: 'success', className: "wallet-address__alert mb-0 text-center", show: showLightningAlert, children: _jsx("label", { children: "Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount." }) })] }));
}
