import * as React from 'react';
import { useEffect } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { FromBTCLNSwap, FromBTCLNSwapState } from '@atomiqlabs/sdk';

// export function LNURLWithdrawQuoteSummary(props: {
//   quote: FromBTCLNSwap<any>;
//   refreshQuote: () => void;
//   setAmountLock: (isLocked: boolean) => void;
//   type?: 'payment' | 'swap';
//   autoContinue?: boolean;
//   notEnoughForGas: bigint;
// }) {
//   const smartChainWallet = useSmartChainWallet(props.quote, true);
//
//   const { state, totalQuoteTime, quoteTimeRemaining, isInitiated } = useSwapState(props.quote);
//
//   const canClaimInOneShot = props.quote?.canCommitAndClaimInOneShot();
//
//   const {
//     waitForPayment,
//     onCommit,
//     onClaim,
//     paymentWaiting,
//     committing,
//     claiming,
//     paymentError,
//     commitError,
//     claimError,
//
//     isQuoteExpired,
//     isQuoteExpiredClaim,
//     isFailed,
//     isCreated,
//     isClaimCommittable,
//     isClaimClaimable,
//     isClaimable,
//     isSuccess,
//
//     executionSteps,
//   } = useFromBtcLnQuote(props.quote, props.setAmountLock);
//
//   useEffect(() => {
//     if (state === FromBTCLNSwapState.PR_CREATED) {
//       if (props.autoContinue) waitForPayment();
//     }
//     if (state === FromBTCLNSwapState.PR_PAID) {
//       onCommit(true).then(() => {
//         if (!canClaimInOneShot) onClaim();
//       });
//     }
//   }, [state, onCommit]);
//
//   return (
//     <>
//       {isInitiated ? <StepByStep quote={props.quote} steps={executionSteps} /> : ''}
//
//       <SwapExpiryProgressBar
//         expired={isQuoteExpired}
//         timeRemaining={quoteTimeRemaining}
//         totalTime={totalQuoteTime}
//         show={
//           (isClaimable || isQuoteExpiredClaim) &&
//           !committing &&
//           !claiming &&
//           smartChainWallet !== undefined
//         }
//       />
//
//       {isCreated || isClaimable ? (
//         smartChainWallet === undefined ? (
//           <ButtonWithWallet
//             className="swap-panel__action"
//             chainId={props.quote.chainIdentifier}
//             requiredWalletAddress={props.quote._getInitiator()}
//             size="lg"
//           />
//         ) : (
//           <>
//             <ErrorAlert
//               className="mb-3"
//               title={
//                 'Swap ' +
//                 (canClaimInOneShot || claimError != null ? 'claim' : 'claim initialization') +
//                 ' error'
//               }
//               error={claimError ?? commitError ?? paymentError}
//             />
//
//             <ButtonWithWallet
//               requiredWalletAddress={props.quote._getInitiator()}
//               chainId={props.quote?.chainIdentifier}
//               className="swap-panel__action"
//               onClick={() => (isClaimable ? onCommit() : waitForPayment())}
//               disabled={committing || paymentWaiting || (!canClaimInOneShot && isClaimClaimable)}
//               size={canClaimInOneShot ? 'lg' : isClaimClaimable ? 'sm' : 'lg'}
//             >
//               {committing || paymentWaiting ? (
//                 <Spinner animation="border" size="sm" className="mr-2" />
//               ) : (
//                 ''
//               )}
//               {canClaimInOneShot
//                 ? 'Claim'
//                 : isClaimClaimable
//                   ? '1. Initialized'
//                   : committing
//                     ? '1. Initializing...'
//                     : '1. Initialize swap'}
//             </ButtonWithWallet>
//             {!canClaimInOneShot ? (
//               <ButtonWithWallet
//                 requiredWalletAddress={props.quote._getInitiator()}
//                 chainId={props.quote?.chainIdentifier}
//                 onClick={() => onClaim()}
//                 disabled={claiming || !isClaimClaimable}
//                 size={isClaimClaimable ? 'lg' : 'sm'}
//                 className="swap-panel__action"
//               >
//                 {claiming ? <Spinner animation="border" size="sm" className="mr-2" /> : ''}
//                 {claiming ? '2. Claiming funds...' : '2. Finish swap (claim funds)'}
//               </ButtonWithWallet>
//             ) : (
//               ''
//             )}
//           </>
//         )
//       ) : (
//         ''
//       )}
//
//       {isSuccess ? (
//         <Alert variant="success" className="mb-0">
//           <strong>Swap success</strong>
//           <label>Your swap was executed successfully!</label>
//         </Alert>
//       ) : (
//         ''
//       )}
//
//       {isFailed ? (
//         <Alert variant="danger" className="mb-0">
//           <strong>Swap failed</strong>
//           <label>Swap HTLC expired, your lightning payment will be refunded shortly!</label>
//         </Alert>
//       ) : (
//         ''
//       )}
//
//       {isQuoteExpired || isFailed || (isSuccess && props.type !== 'payment') ? (
//         <BaseButton onClick={props.refreshQuote} variant="primary" size="large">
//           New quote
//         </BaseButton>
//       ) : (
//         ''
//       )}
//     </>
//   );
// }
