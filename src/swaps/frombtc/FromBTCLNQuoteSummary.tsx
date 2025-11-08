import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { FromBTCLNSwap, FromBTCLNSwapState } from '@atomiqlabs/sdk';
import { ButtonWithWallet } from '../../wallets/ButtonWithWallet';
import { useSwapState } from '../hooks/useSwapState';
import { ScrollAnchor } from '../../components/ScrollAnchor';
import { LightningHyperlinkModal } from '../components/LightningHyperlinkModal';
import { SwapExpiryProgressBar } from '../components/SwapExpiryProgressBar';
import { SwapForGasAlert } from '../components/SwapForGasAlert';

import { StepByStep, WalletData } from '../../components/StepByStep';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { LightningQR } from '../components/LightningQR';
import { useFromBtcLnQuote } from './useFromBtcLnQuote';
import { useSmartChainWallet } from '../../wallets/hooks/useSmartChainWallet';
import { BaseButton } from '../../components/BaseButton';
import { useChain } from '../../wallets/hooks/useChain';
import { SwapStepAlert } from '../components/SwapStepAlert';
import { TokenIcons } from '../../tokens/Tokens';
import { usePricing } from '../../tokens/hooks/usePricing';
import { ic_check_outline } from 'react-icons-kit/md/ic_check_outline';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_warning } from 'react-icons-kit/md/ic_warning';

/*
Steps:
1. Awaiting lightning payment -> Lightning payment received
2. Send commit transaction -> Sending commit transaction -> Commit transaction confirmed
3. Send claim transaction -> Sending claim transaction -> Claim success
 */

export function FromBTCLNQuoteSummary(props: {
  quote: FromBTCLNSwap;
  refreshQuote: () => void;
  setAmountLock: (isLocked: boolean) => void;
  type?: 'payment' | 'swap';
  abortSwap?: () => void;
  notEnoughForGas: bigint;
}) {
  const lightningWallet = useChain('LIGHTNING')?.wallet;
  const smartChainWallet = useSmartChainWallet(props.quote, true);

  const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
  const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
  const [autoClaim, setAutoClaim] = useLocalStorage('crossLightning-autoClaim', false);
  const [initClicked, setInitClicked] = useState<boolean>(false);

  const openModalRef = useRef<() => void>(null);
  const onHyperlink = useCallback(() => {
    openModalRef.current();
  }, []);

  const {
    waitForPayment,
    onCommit,
    onClaim,
    paymentWaiting,
    committing,
    claiming,
    paymentError,
    commitError,
    claimError,

    isQuoteExpired,
    isQuoteExpiredClaim,
    isFailed,
    isCreated,
    isClaimCommittable,
    isClaimClaimable,
    isClaimable,
    isSuccess,

    executionSteps,
  } = useFromBtcLnQuote(props.quote, props.setAmountLock);

  // Source wallet data (input token - Lightning)
  const inputAmount = props.quote.getInput().amount;
  const inputToken = props.quote.getInput().token;
  const inputValue = usePricing(inputAmount, inputToken);

  const sourceWallet: WalletData = useMemo(() => {
    if (!inputToken) return null;
    const chainIcon = '/icons/chains/bitcoin.svg';
    const amountStr = props.quote.getInput().toString();
    const [numPart, tickerPart] = amountStr.split(' ');
    const cleanedAmount = parseFloat(numPart).toString();
    return {
      icon: TokenIcons[inputToken.ticker],
      chainIcon,
      amount: `${cleanedAmount} ${tickerPart}`,
      dollarValue: inputValue ? `$${inputValue.toFixed(2)}` : undefined,
    };
  }, [inputToken, inputAmount, inputValue]);

  // Helper function to map token ticker to full chain name
  const getChainName = (ticker?: string): string => {
    if (!ticker) return 'Bitcoin';
    const chainNames: Record<string, string> = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      SOL: 'Solana',
      USDC: 'USDC',
      USDT: 'USDT',
    };
    return chainNames[ticker] || ticker;
  };

  // Destination wallet data (output token)
  const outputAmount = props.quote.getOutput().amount;
  const outputToken = props.quote.getOutput().token;
  const outputValue = usePricing(outputAmount, outputToken);
  const outputAddress = props.quote.getOutputAddress();

  const destinationWallet: WalletData = useMemo(() => {
    if (!outputToken) return null;
    const chainIcon = props.quote.chainIdentifier?.includes('SOLANA')
      ? '/icons/chains/solana.svg'
      : props.quote.chainIdentifier?.includes('STARKNET')
        ? '/icons/chains/STARKNET.svg'
        : undefined;

    const amountStr = props.quote.getOutput().toString();
    const [numPart, tickerPart] = amountStr.split(' ');
    const cleanedAmount = parseFloat(numPart).toString();
    return {
      icon: TokenIcons[outputToken.ticker],
      chainIcon,
      amount: `${cleanedAmount} ${tickerPart}`,
      dollarValue: outputValue ? `$${outputValue.toFixed(2)}` : undefined,
      address: outputAddress,
      chainName: getChainName(outputToken.ticker),
    };
  }, [outputToken, outputAmount, outputValue, outputAddress, props.quote.chainIdentifier]);

  useEffect(() => {
    if (
      props.quote != null &&
      props.quote.isInitiated() &&
      props.quote.state === FromBTCLNSwapState.PR_CREATED
    ) {
      waitForPayment();
    }
  }, [props.quote]);

  useEffect(() => {
    if (state === FromBTCLNSwapState.PR_PAID) {
      if (autoClaim || lightningWallet != null)
        onCommit(true).then(() => {
          if (!canClaimInOneShot) onClaim();
        });
    }
  }, [state]);

  return (
    <>
      <LightningHyperlinkModal openRef={openModalRef} hyperlink={props.quote.getHyperlink()} />

      <div className="swap-panel__card">
        {isInitiated ? (
          <StepByStep
            steps={executionSteps}
            sourceWallet={sourceWallet}
            destinationWallet={destinationWallet}
          />
        ) : null}

        <SwapStepAlert
          show={!!paymentError}
          type="error"
          icon={ic_warning}
          title="Swap initialization error"
          description={paymentError?.message || paymentError?.toString()}
          error={paymentError}
        />

        {isCreated && paymentWaiting ? (
          <>
            <div className="swap-panel__card__group">
              <LightningQR
                quote={props.quote}
                payInstantly={initClicked}
                setAutoClaim={setAutoClaim}
                autoClaim={autoClaim}
                onHyperlink={onHyperlink}
              />
            </div>
            <div className="swap-panel__card__group">
              <SwapExpiryProgressBar
                timeRemaining={quoteTimeRemaining}
                totalTime={totalQuoteTime}
                show={true}
                type="bar"
                expiryText="Swap address expired, please do not send any funds!"
                quoteAlias="Lightning invoice"
              />
            </div>
          </>
        ) : (
          ''
        )}
        <SwapStepAlert
          show={isSuccess}
          type="success"
          icon={ic_check_circle}
          title="Swap success"
          description="Your swap was executed successfully!"
        />

        <SwapStepAlert
          show={isFailed}
          type="danger"
          icon={ic_warning}
          title="Swap failed"
          description="Swap HTLC expired, your lightning payment will be refunded shortly!"
        />

        <SwapStepAlert
          show={!!(commitError || claimError)}
          type="error"
          icon={ic_warning}
          title={
            'Swap ' +
            (canClaimInOneShot || claimError != null ? 'claim' : ' claim initialization') +
            ' error'
          }
          description={
            (commitError ?? claimError)?.message || (commitError ?? claimError)?.toString()
          }
          error={commitError ?? claimError}
        />
      </div>

      {/* Action buttons outside the card */}
      {isCreated && paymentWaiting && (
        <BaseButton
          onClick={props.abortSwap}
          variant="danger"
          className="swap-panel__action is-large"
        >
          Abort swap
        </BaseButton>
      )}

      {isClaimable ? (
        <>
          <ButtonWithWallet
            requiredWalletAddress={props.quote._getInitiator()}
            className="swap-panel__action"
            chainId={props.quote?.chainIdentifier}
            onClick={() => onCommit()}
            disabled={committing || (!canClaimInOneShot && !isClaimCommittable)}
            size={canClaimInOneShot ? 'lg' : isClaimCommittable ? 'lg' : 'sm'}
          >
            {committing ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
            {canClaimInOneShot
              ? 'Finish swap (claim funds)'
              : !isClaimCommittable
                ? '1. Initialized'
                : committing
                  ? '1. Initializing...'
                  : '1. Finish swap (initialize)'}
          </ButtonWithWallet>
          {!canClaimInOneShot ? (
            <ButtonWithWallet
              requiredWalletAddress={props.quote._getInitiator()}
              chainId={props.quote?.chainIdentifier}
              onClick={() => onClaim()}
              disabled={claiming || !isClaimClaimable}
              size={isClaimClaimable ? 'lg' : 'sm'}
              className="mt-2"
            >
              {claiming ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
              {claiming ? '2. Claiming funds...' : '2. Finish swap (claim funds)'}
            </ButtonWithWallet>
          ) : (
            ''
          )}
        </>
      ) : (
        ''
      )}

      {isCreated && !paymentWaiting ? (
        smartChainWallet === undefined ? (
          <ButtonWithWallet
            chainId={props.quote.chainIdentifier}
            requiredWalletAddress={props.quote._getInitiator()}
            size="lg"
          />
        ) : (
          <>
            <SwapForGasAlert notEnoughForGas={props.notEnoughForGas} quote={props.quote} />

            <ButtonWithWallet
              requiredWalletAddress={props.quote._getInitiator()}
              chainId={props.quote?.chainIdentifier}
              className="swap-panel__action"
              onClick={() => {
                setInitClicked(true);
                waitForPayment();
              }}
              disabled={!!props.notEnoughForGas}
              size="lg"
            >
              Swap
            </ButtonWithWallet>
          </>
        )
      ) : (
        ''
      )}

      {isQuoteExpired || isFailed || isSuccess ? (
        <BaseButton onClick={props.refreshQuote} variant="primary" className="swap-panel__action">
          New quote
        </BaseButton>
      ) : null}

      <ScrollAnchor trigger={isInitiated}></ScrollAnchor>
    </>
  );
}
