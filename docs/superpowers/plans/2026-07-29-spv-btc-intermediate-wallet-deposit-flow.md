# SPV BTC Intermediate-Wallet Deposit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete specification sections 7-16: quote SPV BTC swaps with the SDK intermediate wallet, show its external-deposit address when a top-up is required, automatically execute an exact deposit, handle SDK-reported invalid deposits, and display the external-mode amount and Bitcoin input fee correctly.

**Architecture:** `useQuote()` passes an explicit extension wallet address for the existing PSBT path and passes the SDK intermediate wallet object when no extension wallet is selected. The resulting `SpvFromBTCSwap` remains authoritative for its mode, deposit address, BIP-21 hyperlink, additional deposit amount, input network fee, and deposit validation. `useSpvVaultFromBtcQuote()` adds one preliminary `waitForExternalDeposit()` step before calling the existing Bitcoin send path. It also gates intermediate-wallet payment behind the provider's existing mnemonic-backup acknowledgement and modal opener. After the deposit is found, the existing signing, broadcasting, confirmation, settlement, and terminal steps are reused unchanged. Quotes switch fluidly between PSBT and intermediate-wallet modes without being recreated.

**Tech Stack:** React 18, TypeScript, `@atomiqlabs/sdk`, Vitest 2 + jsdom, `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-07-08-spv-btc-intermediate-wallet.md`, sections 7-16.

**Foundation:** `docs/superpowers/plans/2026-07-24-spv-btc-intermediate-wallet-foundation.md`. Tasks 1-6 from that plan must already be implemented.

**Implementation precedence:** This plan reflects the approved SDK contract and supersedes conflicting older wording in the specification. In particular, do not implement the specification's fake-UTXO construction, `"external"` mode naming, `executeExternalDeposit()`, or app-owned polling. Use the `"intermediate_wallet"` APIs and low-level `waitForExternalDeposit()` flow listed below.

---

## Scope and invariants

In scope:

- exact-input and exact-output SPV quotes using the SDK intermediate-wallet mode;
- preserving the extension-wallet PSBT payment path;
- SDK-owned deposit polling and UTXO selection followed by the hook's existing signing, submission, and confirmation flow;
- SDK-reported invalid deposit handling;
- an optional backup-required payment page that opens the provider-owned mnemonic backup modal;
- QR/address/deeplink presentation only when an additional deposit is required;
- total-input versus additional-deposit amount separation;
- `FeeType.NETWORK_INPUT` rendering without duplicate fee estimation;
- focused and manual verification.

Out of scope:

- SDK contract or dependency changes;
- app-side fake UTXO construction;
- app-side PSBT or CPFP fee calculations;
- a second app-owned `getUtxoPool()` polling loop;
- changes to the provider-owned mnemonic backup/download flow;
- wallet-provider or Bitcoin-chain lifecycle changes;
- refund/send UI for invalid deposits;
- using the intermediate wallet as a BTC output wallet.

### Payment-source rules

Use wallet object identity, not wallet names, to distinguish extension and intermediate wallets.

| Situation | Quote mode and source | Payment UI |
|---|---|---|
| Explicit extension wallet selected | Pass its address; quote stays in `"psbt"` mode | `walletConnected` with browser payment and optional external-wallet switch |
| Intermediate wallet requires a new deposit | Pass the SDK wallet object; quote is in `"intermediate_wallet"` mode | `walletDisconnected` with QR/address and automatic execution |
| Existing intermediate UTXOs fully fund the quote | Pass the SDK wallet object; quote remains in `"intermediate_wallet"` mode | `walletConnected`; use the same `payWithBrowserWallet` action and omit `useExternalWallet` |

For either intermediate-wallet row, show `backupRequired` instead of the listed payment UI while `backupAcknowledged` is false.

`inputWallet?.instance === intermediateWallet.wallet` is the authoritative intermediate-wallet identity check.

### Amount roles

| Value | User-facing location |
|---|---|
| Typed exact-input amount | Main “You pay” input |
| External-mode `quote.getInput()` | Total BTC input, especially for exact-output and restored swaps |
| `quote.getExternalDepositAmount()` | QR alert, BIP-21 URI, copy warning, and expected deposit |
| `FeeType.NETWORK_INPUT` | Bitcoin input network-fee row |

Never use `quote.getInput().rawAmount` as the external deposit amount.

### SDK APIs used

The SDK contract is fixed for this implementation:

- `getSwapMode()`;
- `setSwapModePsbt(false)`;
- `returnToIntermediateWalletSwapMode()`;
- `setSwapModeIntermediateWallet(...)`;
- `requiresExternalDeposit()`;
- `getExternalDepositAmount()`;
- `getAddress()` and `getHyperlink()`;
- `waitForExternalDeposit(...)`;
- `sendBitcoinTransaction(...)`;
- `InvalidBitcoinDepositError` and `SpvFromBTCExternalDepositInvalidUtxo`;
- `FeeType.NETWORK_INPUT`.

Do not add app fallbacks for these APIs.

---

## File map

New files:

- `src/hooks/quoting/__tests__/useQuote.test.tsx`
- `src/hooks/swaps/__tests__/useSpvVaultFromBtcQuote.test.tsx`
- `src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx`
- `src/hooks/fees/__tests__/useSwapFees.test.tsx`
- `src/hooks/pages/__tests__/useSwapPageAmounts.test.ts`

Modified files:

- `src/hooks/quoting/useQuote.ts`
- `src/hooks/swaps/useSpvVaultFromBtcQuote.ts`
- `src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx`
- `src/components/swaps/ConnectedWalletPayButtons.tsx`
- `src/hooks/fees/useSwapFees.ts`
- `src/hooks/pages/useSwapPage.ts` only if its amount regression test exposes a change
- `src/components/fees/SwapFeePanel.tsx` only if its fee regression test exposes a change

No new dependency, package script, provider API, chain-wallet API, or CSS is required.

---

### Task 7: Quote SPV swaps against the correct Bitcoin source

**Files:**

- Modify: `src/hooks/quoting/useQuote.ts`
- Create: `src/hooks/quoting/__tests__/useQuote.test.tsx`
- Reuse: `src/hooks/wallets/useIntermediateBitcoinWallet.ts`
- Reuse: `src/hooks/wallets/useWallet.ts`

- [ ] **Step 1: Write failing quote-source tests**

Render `useQuote()` with `SwapperContext`, `ChainsContext`, and `IntermediateBitcoinWalletContext` wrappers. Mock `initializedSwapper.swap()`.

Cover:

1. Exact-input SPV without an extension wallet:
   - waits until the intermediate SDK wallet exists;
   - passes that exact wallet object as `src`;
   - passes the user's raw BTC amount, not `undefined`;
   - does not construct or pass `sourceWalletUtxos`.
2. Exact-output SPV without an extension wallet:
   - passes the intermediate wallet object;
   - passes the requested output amount;
   - does not pass fake UTXOs.
3. A funded intermediate pseudo-wallet is recognized by instance identity and passed as the SDK wallet object.
4. An explicit extension wallet passes its address and keeps the normal PSBT quote path.
5. Non-SPV routes retain their current source and destination behavior.
6. Fee-rate and intermediate-wallet changes trigger a fresh quote. Switching payment mode on an already active quote is covered by Task 8.

- [ ] **Step 2: Resolve the SPV quote source**

Read the intermediate-wallet context inside `useQuote()` and derive:

```ts
const isSpvFromBtc = swapType === SwapType.SPV_VAULT_FROM_BTC;
const isIntermediateSelected =
  inputWallet?.instance != null &&
  inputWallet.instance === intermediateBitcoinWallet.wallet;
const extensionBitcoinWallet =
  isSpvFromBtc && inputWallet != null && !isIntermediateSelected
    ? inputWallet
    : undefined;
```

For SPV:

- pass `extensionBitcoinWallet.address` when an extension is selected;
- otherwise pass `intermediateBitcoinWallet.wallet`;
- pause only this quote path until the intermediate SDK wallet exists.

For non-SPV routes, preserve the current source-address logic.

- [ ] **Step 3: Pass the current SPV fee options**

Use:

```ts
{
  gasAmount: gasDropAmount,
  bitcoinFeeRate: btcFeeRate,
  maxAllowedBitcoinFeeRate:
    btcFeeRate == null ? undefined : btcFeeMaxOffset + btcFeeRate * btcFeeMaxMultiple,
  stickyAddress,
}
```

Do not pass app-created UTXOs, address types, or CPFP assumptions. Include the resolved source and fee rate in the async quote dependencies.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npx vitest run src/hooks/quoting/__tests__/useQuote.test.tsx
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/hooks/quoting/useQuote.ts src/hooks/quoting/__tests__/useQuote.test.tsx
git commit -m "feat(spv): quote with intermediate Bitcoin wallet"
```

---

### Task 8: Add external-deposit waiting to the SPV hook

**Files:**

- Modify: `src/hooks/swaps/useSpvVaultFromBtcQuote.ts`
- Create: `src/hooks/swaps/__tests__/useSpvVaultFromBtcQuote.test.tsx`
- Reuse: `src/hooks/wallets/useIntermediateBitcoinWallet.ts`
- Reuse: `src/hooks/swaps/helpers/useSwapState.ts`
- Reuse: `src/hooks/utils/useAbortSignal.ts`

**Hook state:**

Extend only the existing `step1init` payment state. Keep every subsequent hook state unchanged:

```ts
type SpvVaultFromBtcPage = {
  executionSteps?: SingleStep[];
  step1init?: {
    backupRequired?: {
      backup: () => void;
    };
    walletConnected?: {
      bitcoinWallet: Chain<IBitcoinWallet>["wallet"];
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
      };
      useExternalWallet?: {
        onClick: () => void;
      };
    };
    walletDisconnected?: {
      address: {
        value: string;
        hyperlink: string;
        copy: () => boolean;
      };
      payWithBitcoinWallet: {
        onClick: () => void;
      };
      payWithBrowserWallet: {
        loading: boolean;
        onClick: () => void;
      };
      addressCopyWarningModal?: {
        /* same reusable shape as FromBtcQuotePage */
      };
    };
    depositStatus?: {
      expectedAmount: TokenAmount;
      invalidDeposits?: SpvFromBTCExternalDepositInvalidUtxo[];
    };
    error?: {
      title: string;
      description?: string;
      error?: Error;
      type: "warning" | "error";
      retry?: () => void;
      requiresRequote?: boolean;
    };
    expiry: {
      remaining: number;
      total: number;
    };
  };
  // Keep step2broadcasting, step3awaitingConfirmations, step4claim,
  // and step5 unchanged.
};
```

Do not introduce separate waiting, exact, signing, or broadcasting deposit states. The only new phase is waiting for the external UTXO before invoking the existing send path.

`backupRequired`, `walletConnected`, `walletDisconnected`, and the invalid-deposit state are mutually exclusive payment-page alternatives. Expose `backupRequired` only while `quote.getSwapMode() === "intermediate_wallet"` and `backupAcknowledged === false`; in that mode it takes precedence over the other payment controls. Never gate PSBT-mode payment on the intermediate-wallet backup state.

- [ ] **Step 1: Write connected-wallet tests**

Cover both kinds of connected payment:

1. A PSBT-mode quote with an extension wallet exposes `walletConnected`.
2. Its `payWithBrowserWallet` calls `sendBitcoinTransaction(extension.instance, normalizedFeeRate)`.
3. An intermediate-mode quote with `requiresExternalDeposit() === false` also exposes `walletConnected`.
4. Its same `payWithBrowserWallet` action calls `sendBitcoinTransaction(intermediateWallet.wallet)` without a manual fee-rate override.
5. `useExternalWallet` is omitted for the fully funded intermediate-wallet case.
6. The existing `UICallback("lock")`, `UICallback("hide")`, error recovery, and confirmation data remain intact.

- [ ] **Step 2: Write backup-gate and external-deposit waiting tests**

Before testing the deposit wait, cover the backup gate:

1. When a quote is first observed in `"intermediate_wallet"` mode and `backupAcknowledged === false`, call `openMnemonicBackupModal()` once automatically.
2. Expose only `step1init.backupRequired` for the payment choice; do not expose `walletDisconnected` or `walletConnected`.
3. `backupRequired.backup()` calls `openMnemonicBackupModal()` so the user can reopen the modal at any time.
4. If the intermediate wallet requires a deposit, start `waitForExternalDeposit()` normally even while the backup-required page is shown. Backup acknowledgement affects presentation only.
5. Once acknowledged, remove `backupRequired` and expose the appropriate intermediate-wallet payment state.
6. A PSBT-mode quote never exposes `backupRequired`, regardless of the intermediate wallet's backup acknowledgement.
7. Do not repeatedly auto-open the modal when the same quote later switches modes. The persistent `backupRequired.backup()` action handles that case.

The hook must reuse `backupAcknowledged` and `openMnemonicBackupModal()` from `useIntermediateBitcoinWallet()`; it must not implement mnemonic download or acknowledgement itself. Automatic opening applies when an unacknowledged swap starts in intermediate-wallet mode. A later PSBT-to-intermediate mode switch shows `backupRequired`, but does not need another automatic-open edge case.

For an intermediate-mode quote with `requiresExternalDeposit() === true`, verify:

```ts
await quote.waitForExternalDeposit(
  intermediateWallet.wallet,
  undefined,
  5,
  undefined,
  abortSignal,
);
```

Cover:

- waiting starts automatically while the quote is usable;
- the hook does not call `getUtxoPool()` or implement its own polling loop;
- when the wait resolves, the hook refreshes intermediate-wallet balance and locks the UI;
- the hook then calls `sendBitcoinTransaction(intermediateWallet.wallet)` without a manual fee-rate override;
- the quote's normal state transitions drive the existing broadcasting, confirmation, and settlement effects;
- re-renders do not launch duplicate waits or sends.

Do not call the high-level `quote.execute()` API from this hook. The external-deposit wait is only a pre-step before the hook's existing send and post-send logic.

Define the external-deposit await with the hook's existing `useAsync()` pattern. It should accept the effect-owned abort signal, call the SDK wait, refresh balance, and continue through the existing intermediate-wallet payment action:

```ts
const [onWaitForExternalDeposit, waitingForExternalDeposit, , externalDepositError] =
  useAsync(
    async (abortSignal: AbortSignal) => {
      try {
        await quote.waitForExternalDeposit(
          intermediateWallet.wallet,
          undefined,
          5,
          undefined,
          abortSignal,
        );

        if (
          abortSignal.aborted ||
          quote.getSwapMode() !== "intermediate_wallet"
        ) return;

        await intermediateWallet.refreshBalance();

        if (
          abortSignal.aborted ||
          quote.getSwapMode() !== "intermediate_wallet"
        ) return;

        await payWithIntermediateWallet();
      } catch (error) {
        if (abortSignal.aborted) return;
        throw error;
      }
    },
    [
      quote,
      intermediateWallet.wallet,
      intermediateWallet.refreshBalance,
      payWithIntermediateWallet,
    ],
  );
```

Start that await from an effect:

```ts
useEffect(() => {
  if (
    !isCreated ||
    swapMode !== "intermediate_wallet" ||
    !quote.requiresExternalDeposit()
  ) return;

  const abortController = new AbortController();
  onWaitForExternalDeposit(abortController.signal);

  return () => abortController.abort();
}, [
  quote,
  isCreated,
  swapMode,
  externalDepositRetry,
  onWaitForExternalDeposit,
]);
```

The `useAsync()` execution guard prevents duplicate concurrent waits. The effect cleanup cancels the current wait on a quote, lifecycle-state, mode, retry-attempt, or component change. The abort and current-mode checks prevent a resolved stale wait from continuing into payment. A transient-error retry may increment the internal `externalDepositRetry` value to start a fresh effect attempt; do not expose that counter as a deposit state. An invalid SDK deposit remains in `externalDepositError`, and stable effect dependencies mean an ordinary re-render does not automatically restart it.

Keep the existing `useAbortSignalRef()` unchanged for the existing post-send confirmation and settlement waits.

- [ ] **Step 3: Reuse SDK invalid-deposit states**

Catch `InvalidBitcoinDepositError` and expose its `invalidUtxos` unchanged through `depositStatus.invalidDeposits`.

Use each `SpvFromBTCExternalDepositInvalidUtxo.reason` directly:

- `amount_too_small`;
- `amount_too_large`;
- `deposit_fee_too_low`.

Do not create a second app-specific deposit-state enum.

The hook may derive titles and descriptions for display:

- `amount_too_small` -> `BTC amount too low`;
- `amount_too_large` -> `BTC amount too high`;
- multiple invalid UTXOs -> explain that multiple deposits were received;
- `deposit_fee_too_low` -> explain that the received UTXO cannot fund the quoted transaction fee.

For any invalid deposit:

- call `refreshBalance()`;
- stop automatic execution for that quote;
- expose `requiresRequote: true`;
- do not compare against `quote.getInput()`.

Keep transient RPC errors separate as `Connection problem` with retry. Ignore abort errors caused by mode changes, quote replacement, or unmount.

- [ ] **Step 4: Switch the same quote between intermediate and PSBT modes**

Implement one shared helper for switching the current quote into intermediate-wallet mode:

```ts
try {
  await quote.returnToIntermediateWalletSwapMode();
} catch {
  await quote.setSwapModeIntermediateWallet(
    intermediateWallet.wallet,
    undefined,
    feeRate,
  );
}
```

Track the current swap mode in local hook state, initialized from `quote.getSwapMode()`. Update that state from the existing callback passed to `useSwapState()`:

```ts
const [swapMode, setSwapMode] = useState(quote.getSwapMode());

const swapState = useSwapState(quote, (state: SpvFromBTCSwapState) => {
  setSwapMode(quote.getSwapMode());
  // Keep the existing UICallback handling unchanged.
});
```

The SDK emits its normal swap-change event after `setSwapModePsbt()`, `returnToIntermediateWalletSwapMode()`, and `setSwapModeIntermediateWallet()`. Use that event to update `swapMode`; do not manually update mode state or force a render at the setter call sites. The updated `swapMode` causes the external-deposit effect to clean up or start as appropriate.

From `walletDisconnected.payWithBrowserWallet`:

1. Connect the extension wallet with `connectWallet("BITCOIN")`.
2. If connection is cancelled or fails, leave the quote and external-deposit wait unchanged.
3. On successful connection, call `await quote.setSwapModePsbt(false)` so the quote retains any intermediate-mode metadata.
4. Let the SDK swap-change event update `swapMode` and clean up the external-deposit effect.
5. Invoke the existing browser-wallet payment action exactly once when the connected extension-wallet instance is available. Do not treat the intermediate-wallet pseudo-wallet as the connected browser wallet.

From the connected extension wallet's `useExternalWallet` action:

1. Await the shared intermediate-mode helper.
2. After the mode switch succeeds, disconnect the extension wallet.
3. Let the SDK swap-change event update the payment state and start the external-deposit effect if `requiresExternalDeposit()` is true.

Also observe a connected extension wallet later becoming absent or being replaced by the intermediate-wallet pseudo-wallet. While the same quote is still payable in `"psbt"` mode, invoke the shared intermediate-mode helper once. Use wallet object identity for this transition; do not add a quote-origin flag.

Then show either:

- `walletDisconnected` and resume `waitForExternalDeposit()` when `requiresExternalDeposit()` is true; or
- `walletConnected` when the intermediate wallet already funds the quote fully.

There is no origin flag and no re-quote path. A quote can move fluidly between `"psbt"` and `"intermediate_wallet"` modes until it leaves the payable state.

Add tests that verify:

- a cancelled browser-wallet connection does not change mode or stop the external wait;
- successful browser connection calls `setSwapModePsbt(false)` before sending and sends once;
- `useExternalWallet` completes the intermediate-mode switch before disconnecting the extension;
- later extension-wallet disconnection invokes the intermediate-mode helper once;
- each SDK mode-change event updates the hook's `swapMode`, payment page, and external-wait effect without replacing the quote;
- mode setter call sites do not manually update mode state or force a render;
- the intermediate-wallet object is never mistaken for an extension wallet.

- [ ] **Step 5: Tie cancellation to the quote**

Abort the external-deposit wait when:

- the quote changes;
- the quote hard-expires or becomes terminal;
- the quote switches to PSBT mode;
- the component unmounts.

Implement these through the external-deposit effect dependencies and cleanup. Do not let an aborted promise overwrite the current quote's state.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npx vitest run src/hooks/swaps/__tests__/useSpvVaultFromBtcQuote.test.tsx
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/hooks/swaps/useSpvVaultFromBtcQuote.ts src/hooks/swaps/__tests__/useSpvVaultFromBtcQuote.test.tsx
git commit -m "feat(spv): execute intermediate wallet deposits"
```

---

### Task 9: Render the external-deposit payment panel

**Files:**

- Modify: `src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx`
- Modify: `src/components/swaps/ConnectedWalletPayButtons.tsx`
- Create: `src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx`
- Reuse: `src/components/swappanels/frombtc/onchain/FromBTCSwapPanel.tsx`
- Reuse: `src/components/swaps/ImportantNoticeModal.tsx`
- Reuse: `src/components/swaps/DisconnectedWalletQrAndAddress.tsx`
- Reuse: `src/components/swaps/SwapExpiryProgressBar.tsx`
- Reuse: `src/components/swaps/SwapConfirmations.tsx`

- [ ] **Step 1: Make the external-wallet action optional**

Change `ConnectedWalletPayButtons` so `useExternalWallet` is optional. Render its button only when the property exists.

This lets the fully funded intermediate wallet reuse `walletConnected.payWithBrowserWallet` without showing a meaningless external-deposit action.

- [ ] **Step 2: Write failing panel tests**

Mock `useSpvVaultFromBtcQuote()` and cover:

1. `SwapFeePanel` is visible while waiting for payment.
2. A connected extension wallet renders both browser payment and external-wallet switch.
3. A fully funded intermediate wallet renders the same connected payment control without the external-wallet switch.
4. An unacknowledged intermediate wallet renders a backup-required button and no connected-wallet or deposit-address controls.
5. Pressing the backup-required button calls `backupRequired.backup()`.
6. External-deposit mode renders `DisconnectedWalletQrAndAddress` with:
   - `quote.getAddress()`;
   - `quote.getHyperlink()`;
   - `quote.getExternalDepositAmount()`;
   - `Pay with BTC wallet`;
   - `Pay with browser wallet`.
7. The copy-warning modal uses the external deposit amount, not total input.
8. SDK invalid-deposit reasons render the appropriate re-quote message and hide the QR.
9. The re-quote action calls `props.refreshQuote()`.
10. The expiry progress bar stays visible while waiting.
11. Existing broadcasting, confirmations, settlement, success, failure, and expired rendering remains available.

- [ ] **Step 3: Render source-aware payment content**

Change only the panel's existing `page.step1init` branch. Render exactly one of:

- backup-required content with one button that calls `page.step1init.backupRequired.backup`;
- `ConnectedWalletPayButtons`;
- `DisconnectedWalletQrAndAddress`;
- invalid-deposit re-quote content.

When `backupRequired` is present for an intermediate-wallet quote, give it first priority so `walletDisconnected` is never shown before mnemonic backup is acknowledged. PSBT-mode quotes never receive this state. Keep all mnemonic-download, acknowledgement, and modal behavior inside the existing intermediate-wallet provider and modal.

As soon as the existing send path advances the quote, let the unchanged later panel branches take over.

The QR alert must use:

```tsx
page.step1init.depositStatus.expectedAmount
```

Do not use `props.quote.getInput()` for the external deposit prompt.

Do not restructure the broadcasting, confirmation, claim, success, failure, or expiry branches.

- [ ] **Step 4: Preserve expiry and post-payment UI**

Keep `SwapExpiryProgressBar` visible while awaiting payment and use:

`Quote expired, please do not send any funds!`

Reuse the current code for:

- execution step icons;
- `SwapConfirmations`;
- watchtower waiting;
- manual settlement;
- success explorer link;
- failed and expired states.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npx vitest run src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/components/swaps/ConnectedWalletPayButtons.tsx src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx
git commit -m "feat(spv): show intermediate wallet deposit payment"
```

---

### Task 10: Make amount and fee presentation external-mode aware

**Files:**

- Modify: `src/hooks/fees/useSwapFees.ts`
- Create: `src/hooks/fees/__tests__/useSwapFees.test.tsx`
- Create: `src/hooks/pages/__tests__/useSwapPageAmounts.test.ts`
- Modify only if required: `src/hooks/pages/useSwapPage.ts`
- Modify only if required: `src/components/fees/SwapFeePanel.tsx`

- [ ] **Step 1: Write failing fee tests**

Cover:

1. `FeeType.NETWORK_INPUT` maps to:
   - `Bitcoin network fee`;
   - `Transaction fees on the input network`.
2. An intermediate-mode SPV quote with a `NETWORK_INPUT` row does not call `estimateBitcoinFee()`.
3. A PSBT-mode SPV quote with a wallet and fee rate still calls `estimateBitcoinFee()`.
4. Classic `FromBTCSwap` and non-SPV fee behavior remains unchanged.
5. Unsupported breakdown rows are filtered rather than leaving `undefined` entries.

- [ ] **Step 2: Render SDK input-network fees**

Add an explicit `FeeType.NETWORK_INPUT` branch in `useSwapFees()`.

If the SDK breakdown already contains `NETWORK_INPUT`, do not add a second asynchronously estimated input fee.

Keep `SwapFeePanel` and `GenericFeePanel` presentational. Do not put SPV fee calculations into either component.

- [ ] **Step 3: Test the amount roles**

Cover:

- exact-input external quote -> main input remains the typed total budget;
- exact-output external quote -> main input uses `quote.getInput().amount`;
- restored exact-input quote -> main input uses `quote.getInput().amount`;
- the main input never uses `getExternalDepositAmount()`.

The existing `useSwapPage()` amount selection may already satisfy these cases. Modify it only if a regression test fails.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npx vitest run \
  src/hooks/fees/__tests__/useSwapFees.test.tsx \
  src/hooks/pages/__tests__/useSwapPageAmounts.test.ts \
  src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx
npm run typecheck
```

Expected: PASS.

Commit:

```bash
git add src/hooks/fees/useSwapFees.ts src/hooks/fees/__tests__/useSwapFees.test.tsx src/hooks/pages/useSwapPage.ts src/hooks/pages/__tests__/useSwapPageAmounts.test.ts src/components/fees/SwapFeePanel.tsx
git commit -m "feat(spv): show external deposit amounts and fees"
```

Omit unchanged paths from `git add`.

---

### Task 11: Automated final verification

**Files:**

- No production files unless verification exposes an implementation defect.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx vitest run \
  src/hooks/quoting/__tests__/useQuote.test.tsx \
  src/hooks/swaps/__tests__/useSpvVaultFromBtcQuote.test.tsx \
  src/components/swappanels/frombtc/onchain-spvvault/__tests__/SpvVaultFromBTCSwapPanel.test.tsx \
  src/hooks/fees/__tests__/useSwapFees.test.tsx \
  src/hooks/pages/__tests__/useSwapPageAmounts.test.ts \
  src/hooks/wallets/__tests__/useWalletBalance.test.tsx \
  src/pages/__tests__/SwapNew.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript, build, and the full suite**

Run:

```bash
npm run typecheck
npm run build
npx vitest run
```

Expected:

- no new TypeScript or build failures;
- all SPV-focused tests pass;
- no test failures beyond the pre-existing baseline.

- [ ] **Step 3: Audit SDK ownership**

Run:

```bash
rg -n "BitcoinWalletUtxoBase|sourceWalletUtxos|sourceWalletAddressType|sourceWalletCpfpAssumption|getUtxoPool" \
  src/hooks/quoting/useQuote.ts \
  src/hooks/swaps/useSpvVaultFromBtcQuote.ts \
  src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx
```

Expected: no app-side fake UTXO, fee math, `getUtxoPool()` call, or polling loop. The hook should only invoke the SDK's `waitForExternalDeposit()`.

Run:

```bash
rg -n "getInput\\(\\).*EXACTLY|getExternalDepositAmount" \
  src/hooks/swaps/useSpvVaultFromBtcQuote.ts \
  src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx
```

Expected: the external deposit prompt derives from `getExternalDepositAmount()`, not `getInput()`.

- [ ] **Step 4: Final commit if automated verification required fixes**

Stage only the files changed to correct verification failures:

```bash
git add <changed-files>
git commit -m "test(spv): verify intermediate deposit flow"
```

Skip this commit when automated verification leaves the worktree unchanged.

---

### Task 12: Human manual verification

**Owner:** Human tester. The implementation agent hands the completed automated verification to a human before this task begins.

**Environment:** Perform deposit, underpayment, overpayment, and low-fee scenarios only on Bitcoin testnet/testnet4 with disposable funded wallets. These checks intentionally create invalid deposits, and refund/send handling is outside this plan.

**Files:**

- No planned file changes. Record any defect found here as follow-up implementation work.

- [ ] **Step 1: Perform browser-wallet checks**

1. Create and pay an SPV quote with an already connected extension wallet.
2. From a normal PSBT quote, choose external wallet and confirm the same quote enters intermediate-wallet mode, using `setSwapModeIntermediateWallet()` when no retained mode exists.
3. In one run, start from intermediate-wallet QR mode, connect a browser wallet, and confirm the same quote switches to PSBT mode and pays once.
4. In a separate run, create a normal PSBT quote with an extension wallet connected, disconnect it before pressing the payment button, and confirm the same quote moves into intermediate-wallet mode and shows the QR. Retained intermediate metadata should be restored when available; otherwise the fallback setup should be used.
5. Confirm switching modes never clears the intermediate wallet.

- [ ] **Step 2: Perform external-deposit checks**

1. With no extension wallet, create exact-input and exact-output SPV quotes.
2. With mnemonic backup unacknowledged, confirm the provider opens its backup modal automatically when the swap starts in intermediate-wallet mode.
3. Close the modal and confirm the backup-required page is shown instead of the deposit QR; confirm its button reopens the provider modal.
4. Acknowledge the mnemonic backup and confirm the normal connected-wallet or external-deposit payment state appears.
5. Confirm the main input shows total BTC while the QR shows only `getExternalDepositAmount()`.
6. Confirm `SwapFeePanel` shows a separate Bitcoin input network fee.
7. Send one exact UTXO and confirm automatic signing/submission without a second click.
8. Confirm the flow proceeds through confirmations and settlement.
9. Confirm an already fully funded intermediate wallet uses the connected-wallet payment button and shows no external-wallet action after backup acknowledgement.

- [ ] **Step 3: Perform invalid and expiry checks**

1. Underpay and confirm `amount_too_small` re-quote messaging.
2. Overpay and confirm `amount_too_large` re-quote messaging.
3. Test multiple invalid UTXOs and confirm the SDK details are preserved.
4. Test `deposit_fee_too_low` and confirm no signing occurs.
5. Let a quote expire before deposit and confirm the UI says not to send.
6. Temporarily interrupt mempool/RPC access and confirm retry works.
7. Confirm the intermediate wallet remains unavailable for BTC output.
