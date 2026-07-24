# SPV BTC Intermediate Wallet Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement specification sections 5-7: give the SDK intermediate Bitcoin wallet an authoritative presentation-only balance, create and persist the single-address wallet safely, and expose it as an input-only Bitcoin pseudo-wallet when it contains BTC.

**Architecture:** `SwapperProvider` creates the initialized SDK instance. A new `IntermediateBitcoinWalletProvider` below it restores or generates the SDK `SingleAddressBitcoinWallet`, owns its mnemonic backup state, and polls only its raw confirmed/unconfirmed balance. `ChainsProvider` sits below both providers and lets `useBitcoinChain()` select either the explicit extension wallet or the funded intermediate wallet. The generic balance hook accepts an authoritative chain-wallet override whose `balance` and `displayBalance` fields deliberately separate execution decisions from presentation.

**Tech Stack:** React 18, TypeScript, `@atomiqlabs/sdk`, browser `localStorage`, Vitest 2 + jsdom, `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-07-08-spv-btc-intermediate-wallet.md`, sections 5, 6, and 7.

---

## Scope and invariants

This is the foundation plan for sections 5-7 only.

In scope:

- the `WalletBalanceResult` split between authoritative spendable balance and presentation balance;
- display-balance plumbing through `useSwapPage()` and `SwapNew`;
- creation/restoration, persistence, mnemonic-file recovery, balance refresh, backup download, and acknowledgement for the SDK intermediate wallet;
- provider ordering;
- input-only pseudo-wallet selection and extension-wallet precedence in `useBitcoinChain()`;
- preserving the SDK wallet instance on the chain-wallet model for the later quote integration.

Out of scope:

- passing the intermediate wallet to `swapper.swap(...)` and selecting the `"intermediate_wallet"` quote path (section 8);
- deposit waiting and low-level swap processing (sections 9 onward);
- payment QR/address presentation;
- invalid-deposit transaction recovery and refund UI (mnemonic-file wallet recovery is in scope);
- `createBitcoinWalletFromEntropy()` signer-derived wallets.

Two section-7 requirements cross that boundary:

1. This plan exposes the SDK wallet as `chain.wallet.instance` when the funded pseudo-wallet is active and tests object identity. Section 8 must read `useIntermediateBitcoinWallet().wallet` for explicit intermediate mode (the same object as the chain instance when active) and pass that object, never just its address, to the SDK quote call. An empty intermediate wallet is deliberately not an active chain wallet.
2. This plan removes the pseudo-wallet when its raw balance reaches zero. The exception for a wallet retained by an in-progress quote must be added when section 8 introduces authoritative payment-source state. Do not add a second, speculative quote-state flag to the wallet provider in this plan.

### Balance roles

| Field | Generic meaning | Intermediate-wallet value | Allowed consumers |
|---|---|---|---|
| `balance` | Amount available to affordability and execution logic | `undefined` | input maximum, `notEnoughBalance`, external-wallet prompt, swap-panel execution balance |
| `displayBalance` | Read-only wallet amount | confirmed + unconfirmed raw sats | wallet badge, balance label, input `Max` |
| `feeRate` | Fee-rate hint from the ordinary spendable-balance estimate | `undefined` | existing quote/panel fee-rate plumbing only |

The intermediate balance override must call the SDK wallet's raw `getBalance()`. It must never call `getSpendableBalance()` or `swapper.Utils.getBitcoinSpendableBalance()`. The intermediate-mode SDK quote will account for the final Bitcoin network fee across existing UTXOs and a possible future deposit UTXO.

### Provider topology

Keep `BrowserRouter` outermost because `SwapperProvider` calls `useLocation()`:

```tsx
<BrowserRouter>
  <SwapperProvider>
    <IntermediateBitcoinWalletProvider>
      <ChainsProvider>
        <WrappedApp />
      </ChainsProvider>
    </IntermediateBitcoinWalletProvider>
  </SwapperProvider>
</BrowserRouter>
```

### Storage and lifecycle rules

- Mnemonic key: `atomiq-intermediate-btc-mnemonic-v1`.
- Backup acknowledgement key: `atomiq-intermediate-btc-backup-ack-v1`.
- Use the existing `useLocalStorage` hook for both values. Do not add direct `localStorage` state synchronization in the provider.
- Keep the mnemonic as the exact logical string returned by the SDK; `useLocalStorage` owns its JSON serialization. Never expose it through context or serialize it into a swap, URL, error, log, or analytics event.
- Store the acknowledged wallet address, not a global boolean. `backupAcknowledged` is true only when the stored acknowledgement equals the currently derived address.
- A malformed or unrestorable stored mnemonic is an error. Never overwrite it by silently generating a different wallet.
- A user-selected mnemonic backup is validated by restoring an SDK wallet before it replaces the current stored mnemonic.
- Disconnecting the pseudo-wallet, clearing swap history, or completing a swap never removes or rotates either the mnemonic or its wallet.
- Use `initializedSwapper.Utils.generateBitcoinWallet()` and `initializedSwapper.Utils.createBitcoinWalletFromMnemonic()`. Do not instantiate `SingleAddressBitcoinWallet` or derive WIF manually.
- Use a 90-second background raw-balance poll and a 10-second retry after a balance-read error. `refreshBalance()` deduplicates concurrent reads.
- Do not poll UTXOs. Later active-quote code must leave deposit polling to `quote.waitForExternalDeposit()`.
- Do not add `additionalWalletActions` yet. Refresh, backup, and mnemonic-file recovery capabilities live on the context; copy-address and transaction-refund actions need the later backup-gated payment/recovery UI.

### Current baseline, recorded 2026-07-24

Do not absorb these unrelated failures into this plan:

- `npx vitest run` currently reports four pre-existing SEO failures in `homeContent.test.ts`, `LandingHome.test.tsx`, and `LandingPage.test.tsx`.
- `npm run typecheck` currently reports pre-existing SDK-interface drift in the extension Bitcoin wallets (`getAddressInfo`, `getUtxoPool`, and one `_getUtxoPool` call signature).

Run focused tests after every task. At final verification, the new tests must pass and the full commands must introduce no failures beyond that captured baseline.

### Validated installed SDK surface

The installed `@atomiqlabs/sdk` README and types expose the APIs used by this plan:

- `generateBitcoinWallet()` resolves to `{ wallet: SingleAddressBitcoinWallet, mnemonic: string }`;
- `createBitcoinWalletFromMnemonic(mnemonic)` resolves to `SingleAddressBitcoinWallet`;
- `SingleAddressBitcoinWallet.getReceiveAddress()` is synchronous;
- `wallet.getBalance()` resolves to raw `{ confirmedBalance: bigint, unconfirmedBalance: bigint }`;
- `wallet.getSpendableBalance()` performs a fee-adjusted estimate and is intentionally excluded from intermediate quote/display balance.

### Existing utility reuse

Prefer the repository's established hooks/helpers over parallel implementations:

- `useLocalStorage` owns mnemonic and acknowledged-address persistence and provides current-value refs for async callbacks.
- `useStateWithRef` owns the active SDK wallet state/ref pair. Derive `address` from that wallet instead of maintaining duplicate address state.
- `useStateRef` remains the standard current-value bridge in `useWalletBalance()` and `useBitcoinChain()`; preserve existing uses.
- `useAbortSignalRef` owns cancellation when the initialized swapper or SDK wallet changes and on provider unmount.
- `useAsync` owns mnemonic-file recovery execution/loading/error state after adding a backward-compatible third positional boolean that suppresses its `console.error` call.
- `timeoutPromise` provides the abortable delay in the background balance loop; do not build a separate interval plus retry-timeout scheduler.
- The existing `downloadTextFile()` implementation in `SettingsModal.tsx` must be moved to a shared `src/utils/Files.ts` helper, then reused by both settings-log and mnemonic-backup downloads.

Do not force a utility beyond the action it fits:

- `useAsync` is appropriate for user-triggered mnemonic recovery: duplicate clicks may be ignored while `loading` is true, and the context consumes its captured error. It is not appropriate for `refreshBalance()`, where every caller needs the same in-flight raw-balance promise rather than an immediate `null`.
- `useWithAwait` and `tryWithRetries` also log caught errors. They are unsuitable for secret-bearing recovery input, and their execution/retry models do not match the provider's explicit refresh API plus indefinite background polling.
- A keyed initialization-promise ref and a balance-read in-flight ref remain necessary because no existing hook provides those exact deduplication guarantees.
- There is no existing file-selection/text-import helper. Reading the supplied `File` with `file.text()` and parsing the documented backup marker is therefore the minimal non-duplicated recovery path.

---

## File map

New files:

- `src/context/IntermediateBitcoinWalletContext.ts`
- `src/hooks/wallets/useIntermediateBitcoinWallet.ts`
- `src/providers/IntermediateBitcoinWalletProvider.tsx`
- `src/hooks/wallets/__tests__/useWalletBalance.test.tsx`
- `src/hooks/utils/__tests__/useAsync.test.tsx`
- `src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx`
- `src/providers/chains/__tests__/useBitcoinChain.test.tsx`
- `src/pages/__tests__/SwapNew.test.tsx`
- `src/__tests__/AppProviders.test.tsx`
- `src/utils/Files.ts`
- `src/utils/__tests__/Files.test.ts`

Modified files:

- `src/hooks/wallets/useWalletBalance.ts`
- `src/providers/ChainsProvider.tsx`
- `src/hooks/pages/useSwapPage.ts`
- `src/hooks/utils/useAsync.ts`
- `src/pages/SwapNew.tsx`
- `src/providers/chains/useBitcoinChain.ts`
- `src/App.tsx`
- `src/components/modals/SettingsModal.tsx`

No dependency or package-script changes are required.

---

### Task 1: Add the authoritative wallet-balance contract

**Files:**

- Modify: `src/hooks/wallets/useWalletBalance.ts`
- Modify: `src/providers/ChainsProvider.tsx`
- Create: `src/hooks/wallets/__tests__/useWalletBalance.test.tsx`
- Reuse: `src/hooks/utils/useStateRef.ts`

**Interfaces:**

- `WalletBalanceResult.balance` becomes optional.
- `WalletBalanceResult.displayBalance` is added as optional presentation-only state.
- `Chain<T>['wallet']` gains an optional complete-result `getBalance(params)` override.

- [ ] **Step 1: Write the failing hook tests**

Create a wrapper that supplies both `SwapperContext` and `ChainsContext`, then render `useWalletBalance()` with `BitcoinTokens.BTC`.

Cover these cases:

1. A wallet override receives all hook inputs:

   ```ts
   {
     currency: BitcoinTokens.BTC,
     swapType,
     swapChainId,
     requestGasDrop,
     minBtcFeeRate,
     input: true,
   }
   ```

2. Returning:

   ```ts
   {
     balance: undefined,
     displayBalance,
     feeRate: undefined,
   }
   ```

   preserves the entire result and does **not** call
   `swapper.Utils.getBitcoinSpendableBalance`.

3. A Bitcoin wallet without the override still calls the existing
   `swapper.Utils.getBitcoinSpendableBalance(wallet.instance, swapChainId, options)` path.

4. A stale override promise that resolves after the wallet changes or the hook unmounts does not update state.

5. With `pause === true`, a completed read does not update the returned result. Keep the hook's existing two-minute polling cadence.

The key authority assertion is:

```ts
expect(result.current).toEqual({
  balance: undefined,
  displayBalance,
  feeRate: undefined,
});
expect(getBitcoinSpendableBalance).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run src/hooks/wallets/__tests__/useWalletBalance.test.tsx
```

Expected: FAIL because `displayBalance` and the chain-wallet `getBalance` override do not exist.

- [ ] **Step 3: Extend `WalletBalanceResult`**

In `src/hooks/wallets/useWalletBalance.ts`, define:

```ts
export type WalletBalanceResult = {
  /**
   * Authoritative amount for limits, affordability checks, and execution.
   * Undefined means that generic balance enforcement is intentionally disabled.
   */
  balance?: TokenAmount;

  /**
   * Presentation-only amount. Never use this for affordability or execution.
   */
  displayBalance?: TokenAmount;

  feeRate?: number;
};
```

Type the state and local fetch function with `WalletBalanceResult` rather than repeating an inline type that requires `balance`.

- [ ] **Step 4: Add the chain-wallet override**

In `src/providers/ChainsProvider.tsx`, use a type-only import of `WalletBalanceResult` and add:

```ts
getBalance?: (params: {
  currency: Token;
  swapType: SwapType;
  swapChainId?: string;
  requestGasDrop?: boolean;
  minBtcFeeRate?: number;
  input?: boolean;
}) => Promise<WalletBalanceResult>;
```

Import `SwapType` from the SDK. Keep this method on the app's chain-wallet descriptor; do not confuse it with `instance.getBalance()`, whose result is raw satoshis.

- [ ] **Step 5: Make the override authoritative in `useWalletBalance()`**

Select the fetcher in this order:

```ts
if (wallet.getBalance != null) {
  getBalance = () => wallet.getBalance({
    currency,
    swapType,
    swapChainId,
    requestGasDrop,
    minBtcFeeRate,
    input,
  });
} else if (isBtcToken(currency)) {
  // Existing getBitcoinSpendableBalance path.
} else if (isSCToken(currency)) {
  // Existing smart-chain getSpendableBalance path.
}
```

Important: the choice is based on whether the method exists, not whether the returned `balance` exists. Never add a post-response fallback.

Preserve:

- the initial `setMaxSpendable(null)`;
- cancellation before state updates;
- the existing `useStateRef(pause)` and pause-ref check; do not add another latest-pause ref;
- the current effect-dependency semantics, adding `input` because it is now part of the override request;
- the two-minute interval and cleanup.

- [ ] **Step 6: Run the focused tests**

Run:

```bash
npx vitest run src/hooks/wallets/__tests__/useWalletBalance.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/wallets/useWalletBalance.ts src/providers/ChainsProvider.tsx src/hooks/wallets/__tests__/useWalletBalance.test.tsx
git commit -m "feat(wallet): support authoritative wallet balance results"
```

---

### Task 2: Keep display balance out of swap logic

**Files:**

- Modify: `src/hooks/pages/useSwapPage.ts`
- Modify: `src/pages/SwapNew.tsx`
- Create: `src/pages/__tests__/SwapNew.test.tsx`

**Interfaces:**

Extend only the input-side wallet result:

```ts
wallet?: {
  data: Chain<any>['wallet'];
  spendable?: TokenAmount;
  displayBalance?: TokenAmount;
  btcFeeRate?: number;
  disconnect: () => void;
};
```

- [ ] **Step 1: Write a failing presentation/execution separation test**

Mock `useSwapPage()` and the heavy child components in `SwapNew.test.tsx`.

Return an input wallet with:

```ts
{
  spendable: undefined,
  displayBalance: toTokenAmount(125_000n, BitcoinTokens.BTC, prices),
  btcFeeRate: undefined,
}
```

Have the `WalletInfoBadge` mock expose its received `maxSpendable` and invoke `setMax` from a test button. Have the `SwapPanel` mock expose its `balance` prop.

Assert:

- the connected-wallet balance path renders even though `spendable` is undefined;
- the badge receives `displayBalance`;
- clicking `Max` calls `input.amount.onChange("0.00125")`;
- the swap panel still receives `balance={undefined}`.

Add a second case with only `spendable` populated and verify it remains the fallback display value.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run src/pages/__tests__/SwapNew.test.tsx
```

Expected: FAIL because the input wallet has no `displayBalance` field and `SwapNew` currently gates the badge on `spendable`.

- [ ] **Step 3: Extend the `useSwapPage()` return shape**

In `SwapPageState`, add `displayBalance?: TokenAmount` beside `spendable`.

Map the hook result exactly as:

```ts
wallet: {
  data: inputWallet,
  spendable: maxSpendable?.balance,
  displayBalance: maxSpendable?.displayBalance ?? maxSpendable?.balance,
  btcFeeRate: maxSpendable?.feeRate,
  disconnect: () => disconnectWallet(inputChainData.chainId),
}
```

Do not replace any of the existing logical uses of `maxSpendable.balance`:

- `inputLimits.max`;
- `notEnoughBalance`;
- `showUseExternalWallet`;
- `useQuote` fee-rate input;
- swap-panel execution balance.

- [ ] **Step 4: Update presentation consumers in `SwapNew.tsx`**

Use `displayBalance` for:

- deciding whether the input wallet balance/Max presentation is available;
- `WalletInfoBadge.maxSpendable`;
- the amount supplied by the `Max` action.

Keep this execution prop unchanged:

```tsx
<SwapPanel
  ...
  balance={swapPage.input.wallet?.spendable?.rawAmount}
/>
```

Do not rename `WalletInfoBadge`'s generic `maxSpendable` prop in this task; the caller determines whether it receives a display or spendable amount.

- [ ] **Step 5: Audit logical consumers**

Run:

```bash
rg -n "maxSpendable\\?\\.balance|maxSpendable\\.balance|displayBalance|spendable\\?\\.rawAmount" src/hooks/pages/useSwapPage.ts src/pages/SwapNew.tsx
```

Expected:

- `displayBalance` appears only in the input-wallet return mapping and read-only UI;
- all limits, insufficient-balance logic, external-wallet logic, and the panel continue to use `balance`/`spendable`.

- [ ] **Step 6: Run the focused tests**

Run:

```bash
npx vitest run src/pages/__tests__/SwapNew.test.tsx src/hooks/wallets/__tests__/useWalletBalance.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/pages/useSwapPage.ts src/pages/SwapNew.tsx src/pages/__tests__/SwapNew.test.tsx
git commit -m "feat(swap): separate displayed and spendable wallet balances"
```

---

### Task 3: Create the intermediate-wallet context, SDK lifecycle, and file recovery

**Files:**

- Create: `src/context/IntermediateBitcoinWalletContext.ts`
- Create: `src/hooks/wallets/useIntermediateBitcoinWallet.ts`
- Create: `src/providers/IntermediateBitcoinWalletProvider.tsx`
- Create: `src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx`
- Modify: `src/hooks/utils/useAsync.ts`
- Create: `src/hooks/utils/__tests__/useAsync.test.tsx`
- Reuse: `src/hooks/utils/useLocalStorage.ts`
- Reuse: `src/hooks/utils/useStateWithRef.ts`
- Reuse: `src/hooks/utils/useAbortSignal.ts`

**Interfaces:**

Define a raw balance type:

```ts
export type IntermediateBitcoinWalletBalance = {
  confirmedBalance: bigint;
  unconfirmedBalance: bigint;
};
```

Define the context value with only consumer-required data and operations:

```ts
export type IntermediateBitcoinWalletContextValue = {
  wallet?: SingleAddressBitcoinWallet;
  address?: string;

  confirmedBalance?: bigint;
  unconfirmedBalance?: bigint;
  refreshBalance: () => Promise<IntermediateBitcoinWalletBalance | undefined>;

  downloadMnemonicBackup: () => void;
  recoverMnemonicBackup: (file: File) => Promise<void>;
  backupDownloaded: boolean;
  backupAcknowledged: boolean;
  acknowledgeBackup: () => void;

  loading: boolean;
  error?: Error;
};
```

Do not expose `mnemonic` or `publicKey`. The mnemonic remains private provider state used only by SDK restoration, backup download, and recovery replacement. Consumers that genuinely need Bitcoin signing/public-key behavior already receive the SDK wallet instance.

Export these constants for tests and future recovery UI:

```ts
export const INTERMEDIATE_BTC_MNEMONIC_KEY =
  'atomiq-intermediate-btc-mnemonic-v1';
export const INTERMEDIATE_BTC_BACKUP_ACK_KEY =
  'atomiq-intermediate-btc-backup-ack-v1';
export const INTERMEDIATE_BTC_BALANCE_POLL_MS = 90_000;
export const INTERMEDIATE_BTC_BALANCE_RETRY_MS = 10_000;
```

- [ ] **Step 1: Write failing initialization and recovery tests**

Use a `SwapperContext.Provider` wrapper and mock only the initialized swapper utilities; do not construct a real wallet or make network calls.

Because `useLocalStorage` JSON-serializes values, seed and inspect storage with `JSON.stringify(...)` / `JSON.parse(...)`.

Test initialization:

1. Before `initializedSwapper` exists, neither SDK creation helper is called.
2. With `JSON.stringify(storedMnemonic)` under the mnemonic key, the provider calls:

   ```ts
   initializedSwapper.Utils.createBitcoinWalletFromMnemonic(storedMnemonic)
   ```

   exactly once, does not call `generateBitcoinWallet()`, and exposes only the restored wallet and address.

3. The context result has no `mnemonic` or `publicKey` property.
4. Without a stored mnemonic, the provider calls `generateBitcoinWallet()` exactly once, saves the returned phrase through `useLocalStorage`, then exposes the returned wallet.
5. React Strict Mode's effect setup/cleanup cycle does not generate two wallets. Keep a promise ref keyed by `initializedSwapper` so both effect passes share one initialization.
6. If restoration rejects, the provider exposes a generic initialization error, retains the stored mnemonic, and does not generate or persist a replacement.
7. A late initialization result after unmount does not update React state.
8. `useIntermediateBitcoinWallet()` throws a clear provider-order error when used outside the provider.

Test `recoverMnemonicBackup(file)`:

1. It accepts the provider's formatted backup file and a legacy plain-text file containing only a trimmed mnemonic.
2. It extracts a candidate phrase and calls
   `initializedSwapper.Utils.createBitcoinWalletFromMnemonic(candidate)` before changing persistent or active state.
3. After successful validation, it saves the candidate through `useLocalStorage`, switches the `useStateWithRef` wallet state to the restored wallet (from which `address` is derived), and clears stale balance/error/session-download state. Task 4's wallet-change balance effect will then refresh the recovered wallet.
4. It preserves an address acknowledgement only when it already equals the newly restored address; otherwise it clears the acknowledgement through `useLocalStorage`.
5. An unreadable, oversized, empty, malformed, or SDK-rejected file is converted to a generic error captured in the context, and leaves the current mnemonic, wallet, address, and acknowledgement unchanged.
6. While recovery is pending, context `loading` is true and a duplicate recovery call does not start a second SDK restoration.
7. It never places the candidate phrase in context, errors, filenames, or console calls.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx vitest run \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx \
  src/hooks/utils/__tests__/useAsync.test.tsx
```

Expected: FAIL because the context/provider/recovery function and the no-log `useAsync` argument do not exist.

- [ ] **Step 3: Create the context and consumer hook**

Use:

```ts
export const IntermediateBitcoinWalletContext =
  createContext<IntermediateBitcoinWalletContextValue | undefined>(undefined);
```

The hook must fail fast:

```ts
export function useIntermediateBitcoinWallet() {
  const value = useContext(IntermediateBitcoinWalletContext);
  if (value == null) {
    throw new Error(
      'useIntermediateBitcoinWallet must be used within IntermediateBitcoinWalletProvider'
    );
  }
  return value;
}
```

This makes an incorrect provider hierarchy immediately visible rather than silently disabling the wallet.

- [ ] **Step 4: Add a positional error-log suppression argument to `useAsync`**

Extend the existing hook without changing default behavior:

```ts
export function useAsync<Args extends any[], Result>(
  executor: (...args: Args) => Promise<Result>,
  deps: any[],
  suppressErrorLogging?: boolean
): [(...args: Args) => Promise<Result>, boolean, Result, any]
```

Change only the catch-side log:

```ts
if (!suppressErrorLogging) {
  console.error('useAsync(): ', err);
}
```

Include `suppressErrorLogging` in the callback's dependency list so rerendering with a changed argument cannot retain stale logging behavior. Continue setting `loading`, `success`, and `error` exactly as today. Existing two-argument call sites retain logging by default.

In `src/hooks/utils/__tests__/useAsync.test.tsx`, verify:

1. An existing-style two-argument call still logs and exposes the caught error.
2. Passing `true` as the third argument exposes the same error state without calling `console.error`.
3. Suppression does not change loading/success state or the existing duplicate-execution guard.
4. Rerendering with a changed third argument updates the logging behavior.

- [ ] **Step 5: Persist mnemonic and acknowledgement with `useLocalStorage`**

Inside the provider, use the existing hook for both durable values:

```ts
const [mnemonic, setMnemonic, mnemonicRef] =
  useLocalStorage<string | null>(INTERMEDIATE_BTC_MNEMONIC_KEY, null);
const [acknowledgedAddress, setAcknowledgedAddress, acknowledgedAddressRef] =
  useLocalStorage<string | null>(INTERMEDIATE_BTC_BACKUP_ACK_KEY, null);
```

Use the refs inside async initialization/recovery callbacks to avoid stale closures. Do not also call `window.localStorage.getItem`, `setItem`, or `removeItem` for these keys; the hook is the single persistence path.

The mnemonic state/ref stays private to `IntermediateBitcoinWalletProvider` and must not be copied into the context value.

- [ ] **Step 6: Use existing state/ref and cancellation hooks**

Keep the active wallet and its current-value ref together:

```ts
const [wallet, setWallet, walletRef] =
  useStateWithRef<SingleAddressBitcoinWallet | null>(null);
```

Derive:

```ts
const address = wallet?.getReceiveAddress();
```

Do not maintain a second address state/ref that can drift from `wallet`.

Create an initialization abort signal with:

```ts
const initializationAbortSignalRef =
  useAbortSignalRef([initializedSwapper]);
```

Check `initializationAbortSignalRef.current?.aborted` before every async initialization state update. The utility's cleanup handles dependency changes and unmount; do not add a parallel effect-local `canceled` boolean.

- [ ] **Step 7: Implement SDK-bound restore/generate initialization**

In the provider:

1. Wait for `initializedSwapper`.
2. Read the logical mnemonic from `mnemonicRef.current`.
3. If it is non-null, restore with `createBitcoinWalletFromMnemonic`.
4. Otherwise call `generateBitcoinWallet`, persist its mnemonic with `setMnemonic`, and use its returned wallet.
5. Install the resolved wallet with `setWallet`; derive `address` from wallet state.

Do not:

- import `ChainsConfig` for wallet construction;
- import a WIF/private-key derivation utility;
- log the mnemonic or include it in thrown error messages;
- replace a stored mnemonic after automatic restoration failure.

- [ ] **Step 8: Implement validated mnemonic-file recovery with `useAsync`**

Expose:

```ts
recoverMnemonicBackup(file: File): Promise<void>
```

Build that function with:

```ts
const [
  recoverMnemonicBackup,
  recoveryLoading,
  ,
  recoveryError,
] = useAsync(
  async (file: File) => {
    // Parse, validate, and atomically install the recovered wallet below.
  },
  [initializedSwapper, setMnemonic, setWallet, setAcknowledgedAddress],
  true
);
```

Fold `recoveryLoading` into the context's `loading` and surface the sanitized `recoveryError` through its `error`. `useAsync` intentionally owns duplicate-click suppression and action state for this user-triggered operation.

Recovery behavior:

1. Require `initializedSwapper` and a real `File`.
2. Reject an empty file or a file larger than a small defensive limit such as 64 KiB before parsing.
3. Read with `await file.text()`.
4. Prefer the value after the backup format's `Recovery phrase:` line. If that marker is absent, accept the entire trimmed content only as a legacy bare-mnemonic candidate.
5. Reject an empty candidate.
6. Validate and derive the replacement wallet first:

   ```ts
   const recoveredWallet =
     await initializedSwapper.Utils.createBitcoinWalletFromMnemonic(candidate);
   ```

7. After file reading and SDK restoration, check `initializationAbortSignalRef.current?.aborted` before mutating state, so unmount or a swapper change cannot install a stale recovery result.
8. Only after successful SDK restoration, call `setMnemonic(candidate)`, install the recovered wallet with `setWallet`, reset `backupDownloaded`, and clear stale balance/error state. The address is derived from wallet state, and the Task 4 balance effect refreshes whenever that wallet changes.
9. Keep `acknowledgedAddress` only when it equals `recoveredWallet.getReceiveAddress()`; otherwise call `setAcknowledgedAddress(null)`.

Do not clear or overwrite the current wallet before validation succeeds. Inside the async executor, catch file-read, parse, and SDK failures and throw a new generic error such as `Unable to recover intermediate Bitcoin wallet`; do not attach the candidate as the error cause. Passing `true` as `useAsync`'s third argument captures that safe error for context without logging it.

- [ ] **Step 9: Make initialization race-safe**

Store an in-flight initialization record in a ref:

```ts
type InitializationRecord = {
  swapper: Swapper<any>;
  promise: Promise<{
    wallet: SingleAddressBitcoinWallet;
    mnemonic: string;
  }>;
};
```

Reuse the promise when the same initialized swapper triggers the effect again. Guard state updates with `initializationAbortSignalRef`, supplied by `useAbortSignalRef`, rather than another cancellation mechanism. Persist a newly generated mnemonic through `setMnemonic` inside the shared promise before resolving it, so a Strict Mode cleanup cannot lose the only key to a generated wallet.

If the `useLocalStorage` setter fails, expose a generic persistence error and do not expose a newly generated or recovered fundable wallet.

- [ ] **Step 10: Run the focused provider and utility tests**

Run:

```bash
npx vitest run \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx \
  src/hooks/utils/__tests__/useAsync.test.tsx
```

Expected: initialization and mnemonic-file recovery tests PASS. Balance and backup tests added in the next task may remain TODO only until that task is started; do not commit skipped tests.

- [ ] **Step 11: Commit**

```bash
git add src/context/IntermediateBitcoinWalletContext.ts src/hooks/wallets/useIntermediateBitcoinWallet.ts src/providers/IntermediateBitcoinWalletProvider.tsx src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx src/hooks/utils/useAsync.ts src/hooks/utils/__tests__/useAsync.test.tsx
git commit -m "feat(wallet): persist and recover SDK intermediate Bitcoin wallet"
```

---

### Task 4: Add raw-balance polling and mnemonic backup safety

**Files:**

- Modify: `src/providers/IntermediateBitcoinWalletProvider.tsx`
- Modify: `src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx`
- Create: `src/utils/Files.ts`
- Create: `src/utils/__tests__/Files.test.ts`
- Modify: `src/components/modals/SettingsModal.tsx`
- Reuse: `src/hooks/utils/useAbortSignal.ts`
- Reuse: `src/utils/Utils.ts` (`timeoutPromise`)

- [ ] **Step 1: Add failing raw-balance tests**

Extend the provider tests with fake timers and a mock SDK wallet.

Test:

1. After wallet initialization, `wallet.getBalance()` is called and its confirmed/unconfirmed values are exposed.
2. `refreshBalance()` returns the same raw result and updates context state.
3. Concurrent `refreshBalance()` calls share one in-flight `wallet.getBalance()` request.
4. A successful read is repeated at `INTERMEDIATE_BTC_BALANCE_POLL_MS`.
5. A failed read exposes a generic balance error and makes the abortable loop use `INTERMEDIATE_BTC_BALANCE_RETRY_MS` for its next delay; a successful retry clears the error and restores the normal poll delay.
6. Changing the wallet or unmounting aborts the pending `timeoutPromise` and ignores late results.
7. Neither `wallet.getSpendableBalance()` nor `wallet.getUtxoPool()` is called.
8. Replacing the installed wallet through `recoverMnemonicBackup()` starts an immediate raw-balance read for the recovered wallet and stops polling the previous one.

Use `await act(async () => vi.advanceTimersByTimeAsync(...))` and restore real timers in `afterEach`.

- [ ] **Step 2: Add failing shared-download and backup tests**

Create `src/utils/__tests__/Files.test.ts` around the behavior currently implemented privately by `SettingsModal.downloadTextFile()`. Mock `URL.createObjectURL`, `URL.revokeObjectURL`, and `HTMLAnchorElement.prototype.click`, and assert the shared helper creates, downloads, and revokes a text blob.

In the provider test, mock the shared `downloadTextFile` helper instead of repeating its DOM implementation details.

Test:

1. `acknowledgeBackup()` is a no-op before the backup is downloaded.
2. `downloadMnemonicBackup()` calls the shared helper with a stable `.txt` filename and the formatted backup content, then sets `backupDownloaded`.
3. The helper input contains a privacy/loss warning, the receiving address, and the mnemonic, but none of these values are sent to `console.log` or `console.error`.
4. After download, `acknowledgeBackup()` calls the acknowledgement `useLocalStorage` setter with the current wallet address; the stored JSON value decodes to that address.
5. Remounting the same wallet derives `backupAcknowledged === true`.
6. A different derived address with the old acknowledgement produces `backupAcknowledged === false`.
7. The downloaded `File` content is accepted by `recoverMnemonicBackup()` and restores the same wallet address, proving backup/recovery format compatibility.

The acknowledgement is address-bound to prevent a stale boolean from authorizing display of a replacement wallet that was never backed up.

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
npx vitest run \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx \
  src/utils/__tests__/Files.test.ts
```

Expected: FAIL on balance refresh/polling, the missing shared file helper, and backup APIs.

- [ ] **Step 4: Implement deduplicated raw-balance refresh**

`refreshBalance()` must:

- return `undefined` before a wallet is ready;
- keep an in-flight `{ wallet, promise }` record and return that promise only when it belongs to the current `walletRef.current`;
- call only `wallet.getBalance()`;
- set confirmed and unconfirmed state from the successful result only if the wallet and its abort signal are still current;
- clear the balance error on success;
- replace unknown/raw errors with a generic `Error` that does not interpolate secret material;
- resolve `undefined` after recording an error rather than leaking an unhandled rejection into `useWalletBalance()`;
- clear its in-flight ref in `finally`.

The polling effect starts only when the SDK wallet exists. Build it from the existing cancellation and delay utilities:

```ts
const balanceAbortSignalRef = useAbortSignalRef([wallet]);
```

Run one async loop for the current wallet:

1. Call the deduplicated `refreshBalance()`.
2. Choose `INTERMEDIATE_BTC_BALANCE_POLL_MS` after success or `INTERMEDIATE_BTC_BALANCE_RETRY_MS` after failure.
3. Await `timeoutPromise(delay, balanceAbortSignalRef.current)`.
4. Catch the abort rejection and exit when the signal is aborted; do not let loop cancellation become an unhandled rejection.

The abort signal owns dependency-change/unmount cleanup, and `timeoutPromise` owns delay cleanup. Do not add `setInterval`, a separate retry `setTimeout`, or parallel boolean cancellation state. Do not introduce a UTXO timer or call `getSpendableBalance()`.

- [ ] **Step 5: Extract and reuse the existing text-download helper**

Move the private `downloadTextFile(filename, content)` implementation from `src/components/modals/SettingsModal.tsx` into:

```ts
// src/utils/Files.ts
export function downloadTextFile(filename: string, content: string): void
```

Keep its current blob type (`text/plain;charset=utf-8`), object-URL, anchor-click, and revoke behavior unchanged.

Import that shared helper back into `SettingsModal` for log downloads. The intermediate provider must call the same helper for mnemonic backups. Do not keep a second copy of the Blob/anchor logic.

- [ ] **Step 6: Implement backup download and address-bound acknowledgement**

The downloaded text should contain concise wording equivalent to:

```text
Atomiq intermediate Bitcoin wallet backup

Anyone with this recovery phrase can spend the BTC in this wallet.
Keep it private. Losing it can make recovery impossible.

Bitcoin address: <address>
Recovery phrase: <mnemonic>
```

Use a stable filename such as:

```text
atomiq-intermediate-bitcoin-wallet-backup.txt
```

Do not put the mnemonic in the filename.

Read the phrase for the file from the provider-private `mnemonicRef`; do not add it to the context value. Track `backupDownloaded` only for the current browser session. Persist the current address with `setAcknowledgedAddress(address)` when `acknowledgeBackup()` succeeds. Derive:

```ts
const backupAcknowledged =
  address != null && acknowledgedAddress === address;
```

The context may expose the raw `address` to trusted app code, but every later fundable-address UI must gate rendering/copying/QR generation on `backupAcknowledged`.

- [ ] **Step 7: Run the provider and shared-utility tests**

Run:

```bash
npx vitest run \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx \
  src/utils/__tests__/Files.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/providers/IntermediateBitcoinWalletProvider.tsx src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx src/utils/Files.ts src/utils/__tests__/Files.test.ts src/components/modals/SettingsModal.tsx
git commit -m "feat(wallet): refresh and back up intermediate Bitcoin wallet"
```

---

### Task 5: Put providers in dependency order

**Files:**

- Modify: `src/App.tsx`
- Create: `src/__tests__/AppProviders.test.tsx`

- [ ] **Step 1: Write the failing hierarchy test**

Export a small `AppProviders({ children })` component from `App.tsx`. In the test, mock `BrowserRouter`, `SwapperProvider`, `IntermediateBitcoinWalletProvider`, and `ChainsProvider` as marker elements, then render `AppProviders`.

Assert this exact nesting:

```text
router
└── swapper
    └── intermediate-bitcoin-wallet
        └── chains
            └── probe
```

This test should fail against the current `ChainsProvider > SwapperProvider` order.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npx vitest run src/__tests__/AppProviders.test.tsx
```

Expected: FAIL because the provider and order do not yet match.

- [ ] **Step 3: Reorder the providers**

Import `IntermediateBitcoinWalletProvider` and use the topology from this plan's provider-topology section.

Keep `BrowserRouter` outside `SwapperProvider`; moving it inward would break `useLocation()`.

Have `App` use `AppProviders` around `WrappedApp` so the tested tree and production tree cannot diverge.

- [ ] **Step 4: Run the hierarchy and provider tests**

Run:

```bash
npx vitest run src/__tests__/AppProviders.test.tsx src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/AppProviders.test.tsx
git commit -m "feat(app): add intermediate wallet provider hierarchy"
```

---

### Task 6: Integrate the funded wallet into the Bitcoin chain

**Files:**

- Modify: `src/providers/ChainsProvider.tsx`
- Modify: `src/providers/chains/useBitcoinChain.ts`
- Create: `src/providers/chains/__tests__/useBitcoinChain.test.tsx`
- Reuse: `src/hooks/utils/useStateRef.ts`
- Reuse: `src/hooks/utils/useStateWithRef.ts`

**Selection order:**

```text
explicit extension wallet
  > funded, non-dismissed intermediate wallet
  > no active Bitcoin wallet
```

**Pseudo-wallet descriptor:**

```ts
{
  name: 'Intermediate wallet',
  icon: '/icons/chains/BITCOIN.svg',
  address: intermediateWallet.address,
  instance: intermediateWallet.wallet,
  onlyInput: true,
  getBalance: authoritativeRawBalanceOverride,
}
```

- [ ] **Step 1: Write failing chain-hook tests**

Mock `getInstalledBitcoinWallets()` and wrap `useBitcoinChain()` with `SwapperContext` plus `IntermediateBitcoinWalletContext`.

Test:

1. An initialized intermediate wallet with zero confirmed and zero unconfirmed balance is not the active chain wallet and is not added to either connector list.
2. A positive confirmed **or** unconfirmed balance activates the intermediate pseudo-wallet when no extension wallet is selected.
3. The descriptor has the exact name/icon/address, `onlyInput: true`, and the same SDK wallet object as `instance`.
4. Its balance override reads raw SDK balance and returns:

   ```ts
   {
     balance: undefined,
     displayBalance: toTokenAmount(
       confirmedBalance + unconfirmedBalance,
       BitcoinTokens.BTC,
       initializedSwapper.prices
     ),
     feeRate: undefined,
   }
   ```

5. Calling the override does not call the SDK wallet's `getSpendableBalance()` or the swapper utility's `getBitcoinSpendableBalance()`.
6. A restored/late deposit transition from `0n` to a positive total automatically activates the pseudo-wallet.
7. A transition back to zero removes it.
8. An active explicit extension wallet wins even while the intermediate wallet is funded.
9. Disconnecting an active intermediate pseudo-wallet does not call `ExtensionBitcoinWallet.clearState()` and does not remove either intermediate storage key.
10. The existing installed and non-installed extension wallet arrays remain unchanged.

Also render `useWallet('BITCOIN', false)` against the resulting chain and assert `null`; render it with `input === true` and assert the pseudo-wallet.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
npx vitest run src/providers/chains/__tests__/useBitcoinChain.test.tsx
```

Expected: FAIL because `WalletTypes.BITCOIN` and `useBitcoinChain()` are extension-only.

- [ ] **Step 3: Widen the Bitcoin wallet type safely**

In `src/providers/ChainsProvider.tsx`, make:

```ts
BITCOIN: ExtensionBitcoinWallet | SingleAddressBitcoinWallet;
```

Use a type import if possible. Keep extension-only methods confined to the extension state inside `useBitcoinChain()`; generic consumers receive the common SDK wallet behavior through `instance`.

Do not weaken the whole chain model to `any`.

- [ ] **Step 4: Read intermediate and swapper contexts in `useBitcoinChain()`**

Use `useIntermediateBitcoinWallet()` and `SwapperContext`.

Derive:

```ts
const intermediateTotal =
  (confirmedBalance ?? 0n) + (unconfirmedBalance ?? 0n);
```

The intermediate candidate is eligible only when:

- the feature is enabled;
- the SDK wallet and initialized swapper both exist;
- no extension wallet is selected;
- `intermediateTotal > 0n`;
- it has not been explicitly dismissed for that unchanged balance snapshot.

- [ ] **Step 5: Implement the authoritative raw-balance override**

Use `refreshBalance()` so the override performs/deduplicates an actual SDK `wallet.getBalance()` read and also updates provider state:

```ts
getBalance: async () => {
  const rawBalance = await refreshBalance();
  if (rawBalance == null) {
    return { balance: undefined, displayBalance: undefined };
  }

  return {
    balance: undefined,
    displayBalance: toTokenAmount(
      rawBalance.confirmedBalance + rawBalance.unconfirmedBalance,
      BitcoinTokens.BTC,
      initializedSwapper.prices
    ),
    feeRate: undefined,
  };
},
```

Do not inspect the request params to estimate fees. The quote SDK owns that calculation.

- [ ] **Step 6: Preserve extension behavior and connector lists**

Keep:

- extension detection and active-state restoration;
- multichain auto-connect;
- extension wallet-change listeners;
- installed/non-installed connector entries;
- extension connect/disconnect persistence.

Only the active `wallet` descriptor becomes a choice between the extension descriptor and intermediate descriptor. Never add the intermediate wallet to `installedWallets` or `nonInstalledWallets`.

- [ ] **Step 7: Define safe pseudo-wallet disconnect semantics**

The intermediate mnemonic is persistent even though the pseudo-wallet can be hidden from the active chain slot.

For the intermediate branch only:

- record a session-only dismissal against the current `intermediateTotal` with `useStateWithRef`, so the disconnect callback and render selection share one state/ref rather than manually synchronizing another ref;
- do not call `ExtensionBitcoinWallet.clearState()`;
- do not remove local-storage keys;
- clear the dismissal when the raw total changes, so a new wrong/late deposit auto-selects the wallet again.

For the extension branch, retain the existing disconnect behavior unchanged.

Preserve the hook's existing `useStateRef(bitcoinWallet)` usage for extension callbacks. Do not introduce ad hoc "latest wallet" refs alongside it.

This gives the existing "Disconnect" / "Change wallet" UI meaningful behavior without making secret deletion part of wallet disconnection.

- [ ] **Step 8: Run the chain and balance tests**

Run:

```bash
npx vitest run \
  src/providers/chains/__tests__/useBitcoinChain.test.tsx \
  src/hooks/wallets/__tests__/useWalletBalance.test.tsx \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/providers/ChainsProvider.tsx src/providers/chains/useBitcoinChain.ts src/providers/chains/__tests__/useBitcoinChain.test.tsx
git commit -m "feat(wallet): select funded intermediate Bitcoin wallet"
```

---

### Task 7: Verify the foundation and document the section-8 handoff

**Files:**

- No production files unless a focused test exposes an implementation defect.

- [ ] **Step 1: Run every new focused test**

Run:

```bash
npx vitest run \
  src/hooks/wallets/__tests__/useWalletBalance.test.tsx \
  src/hooks/utils/__tests__/useAsync.test.tsx \
  src/providers/__tests__/IntermediateBitcoinWalletProvider.test.tsx \
  src/providers/chains/__tests__/useBitcoinChain.test.tsx \
  src/pages/__tests__/SwapNew.test.tsx \
  src/__tests__/AppProviders.test.tsx \
  src/utils/__tests__/Files.test.ts
```

Expected: PASS, no skipped tests.

- [ ] **Step 2: Run the whole suite and compare with baseline**

Run:

```bash
npx vitest run
```

Expected for the current branch: the new tests pass; only the already-recorded SEO failures remain. If those unrelated tests have been fixed meanwhile, expect the whole suite to pass.

- [ ] **Step 3: Run TypeScript and compare with baseline**

Run:

```bash
npm run typecheck
```

Expected for the current branch: no new errors from the files in this plan. The pre-existing extension-wallet SDK-interface errors may remain until their separate compatibility fix lands.

- [ ] **Step 4: Audit prohibited fee estimation and secret handling**

Run:

```bash
rg -n "getSpendableBalance|getBitcoinSpendableBalance|getUtxoPool" \
  src/providers/IntermediateBitcoinWalletProvider.tsx \
  src/providers/chains/useBitcoinChain.ts
```

Expected: no matches.

Run:

```bash
rg -n "console\\.(log|error|warn).*mnemonic|mnemonic.*console\\.(log|error|warn)" \
  src/context/IntermediateBitcoinWalletContext.ts \
  src/providers/IntermediateBitcoinWalletProvider.tsx \
  src/providers/chains/useBitcoinChain.ts
```

Expected: no matches.

Run:

```bash
rg -n "mnemonic\\??:|publicKey" \
  src/context/IntermediateBitcoinWalletContext.ts
```

Expected: no matches; neither secret phrase nor redundant public-key data is exposed by context.

Run:

```bash
rg -n "useLocalStorage|useStateWithRef|useAbortSignalRef|useAsync|suppressErrorLogging|timeoutPromise|downloadTextFile|localStorage\\.(getItem|setItem|removeItem)|setInterval|setTimeout" \
  src/providers/IntermediateBitcoinWalletProvider.tsx
```

Expected:

- exactly two `useLocalStorage` calls for mnemonic and acknowledged address;
- `useStateWithRef` for the wallet;
- `useAbortSignalRef` for initialization and balance-loop cancellation;
- `useAsync(..., deps, true)` for mnemonic-file recovery;
- `timeoutPromise` for polling delays;
- the shared `downloadTextFile` import/call;
- no direct `localStorage`, `setInterval`, or `setTimeout` calls.

Run:

```bash
rg -n "function downloadTextFile|const downloadTextFile" src
```

Expected: one exported implementation in `src/utils/Files.ts`; `SettingsModal` and the provider import it rather than defining copies.

Run:

```bash
rg -n "suppressErrorLogging|console\\.error\\('useAsync" \
  src/hooks/utils/useAsync.ts
```

Expected: the positional boolean guards only the existing error log; default logging and all other hook behavior remain intact.

Run:

```bash
rg -n "atomiq-intermediate-btc-mnemonic-v1|removeItem|clearState" \
  src/providers src/hooks src/pages
```

Expected: the mnemonic storage value is managed only through the provider's `useLocalStorage` binding; no intermediate-wallet path removes it; `clearState()` remains confined to extension-wallet behavior.

- [ ] **Step 5: Perform manual browser checks**

With a development swapper initialized:

1. Clear only the intermediate mnemonic/ack keys, reload, and confirm one mnemonic is generated and survives another reload.
2. Confirm the address is identical after reload.
3. Download the backup, acknowledge it, reload, and confirm the acknowledgement remains valid for that address.
4. Recover that downloaded file and confirm it restores the same address without exposing the phrase through context.
5. Attempt recovery with an invalid file and confirm the current wallet/address remain unchanged.
6. With zero BTC, confirm the intermediate wallet is absent from the active wallet badge and connector choices.
7. Fund the address in a controlled test environment, refresh, and confirm the intermediate wallet becomes the active BTC input wallet.
8. Connect an extension Bitcoin wallet and confirm it takes precedence.
9. Disconnect the extension and confirm the funded intermediate wallet becomes active again.
10. Confirm its badge and `Max` show confirmed + unconfirmed BTC while the swap panel receives no generic spendable-balance value.
11. Disconnect the pseudo-wallet and confirm the mnemonic remains in storage.

Do not test a real deposit before the backup download/acknowledgement gate is available in the section-8 payment UI.

- [ ] **Step 6: Record the handoff for the next plan**

The section-8 quote implementation must:

- select intermediate payment mode explicitly;
- read `useIntermediateBitcoinWallet().wallet` (which is identical to `chain.wallet.instance` whenever the funded pseudo-wallet is active);
- pass that SDK wallet object as `src`, including when the wallet is empty and therefore absent from the active chain-wallet slot;
- gate address/QR presentation on `backupAcknowledged`;
- retain the pseudo-wallet while its quote is in progress, even if its observed balance reaches zero;
- call `refreshBalance()` immediately after deposit detection and recoverable payment errors instead of waiting for the background interval;
- continue using `displayBalance` only for presentation;
- leave final-deposit and transaction processing to the low-level hooks described in later spec sections.

- [ ] **Step 7: Final commit if verification required test-only fixes**

```bash
git add src
git commit -m "test(wallet): cover intermediate wallet foundation"
```

Skip this commit when the working tree is already clean after Task 6.
