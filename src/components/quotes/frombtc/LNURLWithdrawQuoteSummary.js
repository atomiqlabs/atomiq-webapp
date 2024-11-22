import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useEffect } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { FromBTCLNSwapState } from "@atomiqlabs/sdk";
import { SwapsContext } from "../../../context/SwapsContext";
import { ButtonWithSigner } from "../../ButtonWithSigner";
import { useSwapState } from "../../../utils/useSwapState";
import { useAsync } from "../../../utils/useAsync";
import { SwapExpiryProgressBar } from "../../SwapExpiryProgressBar";
export function LNURLWithdrawQuoteSummary(props) {
    const { getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const { state, totalQuoteTime, quoteTimeRemaining } = useSwapState(props.quote);
    useEffect(() => {
        if (state === FromBTCLNSwapState.PR_CREATED) {
            if (props.autoContinue)
                onContinue(true);
        }
    }, [state]);
    const [onContinue, continueLoading, continueSuccess, continueError] = useAsync(async (skipChecks) => {
        props.setAmountLock(true);
        if (props.quote.getState() === FromBTCLNSwapState.CLAIM_COMMITED) {
            await props.quote.commitAndClaim(signer, null, skipChecks);
            return true;
        }
        if (!props.quote.prPosted) {
            await props.quote.waitForPayment(null, 1);
            await props.quote.commitAndClaim(signer, null, skipChecks);
        }
        return true;
    }, [props.quote, signer]);
    useEffect(() => {
        if (continueSuccess != null || continueError != null) {
            if (props.setAmountLock != null)
                props.setAmountLock(false);
        }
    }, [continueSuccess, continueError]);
    return (_jsxs(_Fragment, { children: [_jsx(SwapExpiryProgressBar, { expired: state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED || state === FromBTCLNSwapState.QUOTE_EXPIRED, timeRemaining: quoteTimeRemaining, totalTime: totalQuoteTime, show: (state === FromBTCLNSwapState.PR_CREATED ||
                    state === FromBTCLNSwapState.PR_PAID ||
                    state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED ||
                    state === FromBTCLNSwapState.QUOTE_EXPIRED) && !continueLoading && signer !== undefined }), (state === FromBTCLNSwapState.PR_CREATED ||
                state === FromBTCLNSwapState.PR_PAID ||
                (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && continueLoading) ||
                state === FromBTCLNSwapState.CLAIM_COMMITED) ? (signer === undefined ? (_jsx(ButtonWithSigner, { chainId: props.quote.chainIdentifier, signer: signer, size: "lg" })) : (_jsxs(_Fragment, { children: [_jsxs(Alert, { className: "text-center mb-3", show: continueError != null, variant: "danger", closeVariant: "white", children: [_jsx("strong", { children: "Swap claim error" }), _jsx("label", { children: continueError?.message })] }), _jsxs(ButtonWithSigner, { signer: signer, chainId: props.quote.chainIdentifier, onClick: () => onContinue(), disabled: continueLoading, size: "lg", children: [continueLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Claim"] })] }))) : "", state === FromBTCLNSwapState.CLAIM_CLAIMED ? (_jsxs(Alert, { variant: "success", className: "mb-0", children: [_jsx("strong", { children: "Swap successful" }), _jsx("label", { children: "Swap was executed successfully" })] })) : "", (state === FromBTCLNSwapState.FAILED ||
                state === FromBTCLNSwapState.EXPIRED) ? (_jsxs(Alert, { variant: "danger", className: "mb-0", children: [_jsx("strong", { children: "Swap failed" }), _jsx("label", { children: "Swap HTLC expired, your lightning payment will be refunded shortly!" })] })) : "", (state === FromBTCLNSwapState.QUOTE_EXPIRED ||
                (state === FromBTCLNSwapState.QUOTE_SOFT_EXPIRED && !continueLoading) ||
                state === FromBTCLNSwapState.EXPIRED ||
                state === FromBTCLNSwapState.FAILED) ? (_jsx(Button, { onClick: props.refreshQuote, variant: "secondary", children: "New quote" })) : ""] }));
}
