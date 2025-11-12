import * as React from 'react';
import { useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {ISwap, TokenAmount, toTokenAmount} from '@atomiqlabs/sdk';
import { SwapperContext } from '../../context/SwapperContext';
import { toTokenIdentifier } from '../../utils/Tokens';
import {SwapStepAlert} from "./SwapStepAlert";
import {ic_warning} from "react-icons-kit/md/ic_warning";

const swapMinimum = 1000000n;

export function SwapForGasAlert(props: {
  notEnoughForGas: TokenAmount;
  quote: ISwap;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const { swapper } = useContext(SwapperContext);

  const feeNeeded = useMemo(() => {
    if (props.notEnoughForGas == null || props.quote == null || swapper == null) return null;
    let amount = props.notEnoughForGas;
    if (amount.rawAmount < swapMinimum) amount = toTokenAmount(swapMinimum, amount.token, swapper.prices);
    return amount;
  }, [props.notEnoughForGas, props.quote, swapper]);

  return (
    <SwapStepAlert
      show={!!props.notEnoughForGas}
      type="error"
      title={`Not enough ${feeNeeded?.token?.ticker} for fees`}
      description={(
        <>
          You need at least {feeNeeded?.amount} more {feeNeeded?.token?.ticker} to pay for fees
          and refundable deposit! You can use <b>Bitcoin Lightning</b> to swap for gas first & then
          continue swapping here!
        </>
      )}
      action={{
        type: 'button',
        text: 'Swap for gas',
        variant: 'secondary',
        onClick: () => {
          const params = new URLSearchParams();
          params.set('tokenIn', toTokenIdentifier(props.quote.getInput().token));
          params.set('tokenOut', toTokenIdentifier(props.quote.getOutput().token));
          params.set('exactIn', '' + props.quote.exactIn);
          params.set(
            'amount',
            props.quote.exactIn ? props.quote.getInput().amount : props.quote.getOutput().amount
          );
          navigate('/gas', {
            state: {
              returnPath: location.pathname + '?' + params.toString(),
              chainId: props.quote.chainIdentifier,
              amount: feeNeeded?.rawAmount.toString(10),
            },
          });
        }
      }}
    />
  );
}
