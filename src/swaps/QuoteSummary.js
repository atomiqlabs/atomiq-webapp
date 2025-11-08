import { jsx as _jsx } from "react/jsx-runtime";
import { IFromBTCSwap, IToBTCSwap, SwapType, } from '@atomiqlabs/sdk';
import { ToBTCQuoteSummary } from './tobtc/ToBTCQuoteSummary';
import { LNURLWithdrawQuoteSummary } from './frombtc/LNURLWithdrawQuoteSummary';
import { FromBTCQuoteSummary } from './frombtc/FromBTCQuoteSummary';
import { useContext } from 'react';
import { FEConstants } from '../FEConstants';
import { SpvVaultFromBTCQuoteSummary } from './frombtc/SpvVaultFromBTCQuoteSummary';
import { useWithAwait } from '../utils/hooks/useWithAwait';
import { ChainDataContext } from '../wallets/context/ChainDataContext';
import { getChainIdentifierForCurrency, toTokenIdentifier } from '../tokens/Tokens';
import { FromBTCLNQuoteSummary2 } from './frombtc/FromBTCLNQuoteSummary2';
export function QuoteSummary(props) {
    const chainsData = useContext(ChainDataContext);
    const [notEnoughForGas] = useWithAwait(async () => {
        if (props.quote == null || props.quote.isInitiated())
            return;
        let result;
        let address;
        if (props.quote instanceof IToBTCSwap) {
            result = await props.quote.hasEnoughForTxFees();
            address = props.quote._getInitiator();
        }
        else if (props.quote instanceof IFromBTCSwap) {
            result = await props.quote.hasEnoughForTxFees();
            address = props.quote._getInitiator();
        }
        else {
            return;
        }
        if (!result.enoughBalance) {
            const chainIdentifer = getChainIdentifierForCurrency(result.required.token);
            const chainData = chainsData[chainIdentifer];
            if (chainData.wallet?.address == address) {
                return (FEConstants.scBalances[toTokenIdentifier(result.required.token)].optimal +
                    result.required.rawAmount -
                    result.balance.rawAmount);
            }
        }
    }, [props.quote, chainsData]);
    if (!props.quote) {
        return null;
    }
    let swapElement;
    console.log(props.quote.getType());
    switch (props.quote.getType()) {
        case SwapType.TO_BTC:
        case SwapType.TO_BTCLN:
            swapElement = (_jsx(ToBTCQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: props.quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: notEnoughForGas }));
            break;
        case SwapType.FROM_BTC:
            swapElement = (_jsx(FromBTCQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: notEnoughForGas, balance: props.balance, feeRate: props.feeRate }));
            break;
        case SwapType.FROM_BTCLN:
            const _quote = props.quote;
            if (_quote.lnurl != null && props.type !== 'swap') {
                swapElement = (_jsx(LNURLWithdrawQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: _quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: notEnoughForGas }));
            }
            else {
                swapElement = (_jsx(FromBTCLNQuoteSummary2, { type: props.type, setAmountLock: props.setAmountLock, quote: _quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: notEnoughForGas }));
            }
            break;
        case SwapType.SPV_VAULT_FROM_BTC:
            swapElement = (_jsx(SpvVaultFromBTCQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, balance: props.balance, feeRate: props.feeRate }));
            break;
    }
    return swapElement;
}
