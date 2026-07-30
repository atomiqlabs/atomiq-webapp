# SPV BTC external-wallet deposit flow - implementation spec

Date: 2026-07-08
Status: draft
Repo: `SolLightning-dApp-v3`

## 1. Goal

Allow users to execute the new SPV-based BTC to smart-chain swap flow without first connecting a browser Bitcoin wallet such as Phantom, UniSat, Xverse, OKX, Magic Eden, or Keplr.

The current SPV flow requires a connected Bitcoin web wallet because execution is a PSBT signing flow. External wallets can easily send BTC to an address or URI, but they generally cannot sign a swap PSBT created inside the web app. To bridge that gap, the app will create a simple browser-owned single-address Bitcoin wallet, referred to here as the intermediate wallet. The user deposits the quoted BTC amount into that address from any external wallet. Once the expected UTXO appears, the app uses the intermediate wallet to fund, sign, and submit the swap PSBT automatically.

## 2. UX summary

For SPV vault BTC to smart-chain swaps:

1. If the user has a connected browser Bitcoin wallet with spendable BTC, the current "pay from browser wallet" path remains available.
2. If no connected Bitcoin input wallet is available, the app still creates a quote by estimating the future intermediate-wallet deposit as one fake UTXO.
3. The swap panel shows the intermediate wallet address as a QR code and address string, plus a Bitcoin deeplink, similar to the existing classic `FromBTCSwapPanel` external-wallet payment UI.
4. The user sends the exact expected BTC amount to the intermediate wallet address from any external Bitcoin wallet.
5. The hook polls the intermediate wallet UTXOs. When an exact matching UTXO appears, it automatically executes the SDK external-deposit path, spending the selected funding set fully.
6. If the received amount is lower or higher than expected, the app stops auto-execution and prompts the user to re-quote using the deposited balance. The intermediate wallet should then auto-connect as the Bitcoin input wallet because it now has non-zero balance.

## 3. Non-goals

- No generalized multi-address browser Bitcoin wallet.
- No user-facing send/receive wallet screen beyond this swap flow.
- No export/import UI for arbitrary external mnemonics in this feature. The mnemonic is generated and stored by the app only.
- No use of the intermediate wallet as a BTC output wallet. It is input-only.
- No support for arbitrary partial deposits or multi-deposit aggregation in v1. The supported top-up case is all existing intermediate-wallet UTXOs selected at quote/mode-preparation time plus exactly one newly received UTXO matching the required additional deposit amount.

## 4. Existing behavior to reuse

- `src/providers/chains/useLightningNetwork.ts` already shows the input-only pseudo-wallet pattern through LNURL-withdraw:
  - wallet object includes `onlyInput: true`
  - `useWallet(token, false)` filters it out for output usage
  - pseudo-wallet disconnects when it is no longer relevant to the swap page
- `src/components/swappanels/frombtc/onchain/FromBTCSwapPanel.tsx` already has the QR/address/deeplink UI surface:
  - `ImportantNoticeModal`
  - `DisconnectedWalletQrAndAddress`
  - `ConnectedWalletPayButtons`
  - `SwapExpiryProgressBar`
- `src/hooks/swaps/useFromBtcQuote.ts` already exposes a hook return shape that distinguishes browser-wallet payment from external-wallet address payment.
- The SDK exposes `SingleAddressBitcoinWallet`, `BitcoinWalletUtxo`, `BitcoinWalletUtxoBase`, `SpvFromBTCOptions.sourceWalletUtxos`, and low-level SPV PSBT submission methods. The external-deposit flow should wrap those low-level methods behind `SpvFromBTCSwap.executeExternalDeposit(...)`.
- `ChainsConfig.BITCOIN` exposes `network` and `rpc`, which are enough to instantiate `SingleAddressBitcoinWallet` without accessing private swapper internals.

## 5. New intermediate wallet provider

Add a separate provider/context for the intermediate wallet. The provider owns the browser-generated mnemonic and exposes a single-address SDK wallet instance.

Suggested files:

- `src/context/IntermediateBitcoinWalletContext.ts`
- `src/providers/IntermediateBitcoinWalletProvider.tsx`
- `src/hooks/wallets/useIntermediateBitcoinWallet.ts`

Provider responsibilities:

- Read mnemonic from browser storage key, for example `atomiq-intermediate-btc-mnemonic-v1`.
- If missing, generate it once with `SingleAddressBitcoinWallet.generateRandomMnemonic()` and persist it.
- Never rotate or clear the mnemonic as part of this feature. The same mnemonic should be reused across sessions.
- Derive a WIF with `SingleAddressBitcoinWallet.mnemonicToPrivateKey(mnemonic, ChainsConfig.BITCOIN.network)`.
- Instantiate `new SingleAddressBitcoinWallet(ChainsConfig.BITCOIN.rpc, ChainsConfig.BITCOIN.network, wif)`.
- Expose:
  - `mnemonic`
  - `wallet`
  - `address`
  - `publicKey`
  - `refreshBalance()`
  - `balance`, split into confirmed/unconfirmed if useful
  - `utxos`, fetched through `wallet.getUtxoPool()`
  - `loading` and `error`
- Poll balance/UTXOs while the app is on the swap page or while an SPV quote is active. Use a short interval during active payment waiting, for example 5-10 seconds, and a longer interval outside it, for example 60-120 seconds.

Security notes:

- This is still a non-custodial browser wallet, but the mnemonic is stored in browser storage. Treat it as a temporary swap helper, not a long-term wallet.
- Never log the mnemonic or WIF.
- Do not surface the mnemonic by default in this feature.
- Do not add mnemonic rotation or reset UI in v1.
- Keep the wallet single-address and use it only for SPV BTC input signing.

## 6. Chain provider integration

Update `src/providers/ChainsProvider.tsx` to wrap children in the new `IntermediateBitcoinWalletProvider` so `useBitcoinChain.ts` can read it.

Update `src/providers/chains/useBitcoinChain.ts`:

- Read the intermediate wallet context.
- Automatically connect it when it has non-zero BTC balance:
  - confirmed plus unconfirmed balance is greater than zero
  - no explicit external extension wallet is currently connected, or the intermediate wallet is already selected
- Represent it as the Bitcoin chain wallet:
  - `name`: `Intermediate wallet` or `BTC deposit wallet`
  - `icon`: reuse an existing BTC wallet asset under `public/wallets/btc` or add a small dedicated asset
  - `address`: `intermediateWallet.address`
  - `instance`: `intermediateWallet.wallet`
  - `onlyInput: true`
  - optional `additionalWalletActions`: refresh balance and copy address if the existing wallet UI supports it cleanly
- Keep extension wallets in `installedWallets` and `nonInstalledWallets` unchanged.
- Do not show the intermediate wallet in the wallet connector when it is empty. Its receive address is shown only inside the SPV vault swap panel payment step.
- Do not write the intermediate wallet through `ExtensionBitcoinWallet.saveState()` because it is not an extension wallet and should not overwrite browser-wallet autoconnect state.
- Disconnecting the intermediate wallet from the chain should hide it only while its balance is zero or until a browser wallet is selected. It must not clear the mnemonic.
- When the intermediate wallet balance returns to zero, it should automatically disappear from the active Bitcoin chain wallet, matching the LNURL-withdraw pseudo-wallet lifecycle.

Important behavior:

- `useWallet('BITCOIN', false)` must continue returning `null` for this wallet because `onlyInput: true`.
- If the intermediate wallet has non-zero balance after an overpayment or underpayment, it should become the active input wallet so the user can immediately re-quote from that balance.

## 7. Quote-time fake UTXO support

Update `src/hooks/quoting/useQuote.ts` for `SwapType.SPV_VAULT_FROM_BTC`.

When all of the following are true:

- input token is on-chain BTC
- output token is a smart-chain token
- resolved swap type is `SPV_VAULT_FROM_BTC`
- no usable Bitcoin input wallet is connected, including no intermediate wallet with non-zero balance
- quote is exact input mode

then quote by pretending that the future intermediate-wallet deposit will be one UTXO.

Use SDK behavior similar to `swapper.sweepBitcoinWallet()`:

- Call `initializedSwapper.swap(...)` with SPV quote options containing:
  - `sourceWalletUtxos: [fakeUtxoBase]`
  - `bitcoinFeeRate: 1`
- Pass `amount` as `undefined`/`null` for the SDK amount only in the SDK path that requires UTXO-based amount derivation. The UI still keeps the user's input amount as the expected deposit amount.
- Ensure the exact-input UI amount is the fake UTXO value, not `quote.getInput().rawAmount`. `quote.getInput().rawAmount` is the BTC swap input after the Bitcoin PSBT network fee has been accounted for; the user must deposit the full UTXO value that funds both the swap input and the PSBT fee.

Fake UTXO shape:

```ts
const fakeUtxoBase: BitcoinWalletUtxoBase = {
  value: Number(rawInputAmount),
  type: "p2wpkh",
  cpfp: {
    txEffectiveFeeRate: 1,
    txVsize: 200,
  },
};
```

Rationale:

- `sourceWalletUtxos` tells the SDK/LP to derive the actual swappable amount after Bitcoin network fees.
- `bitcoinFeeRate: 1` plus CPFP metadata simulates the user's external deposit arriving with a low-fee parent transaction.
- The 200 vB CPFP size leaves room for the swap transaction fee calculation to remain conservative if the incoming deposit needs to be fee-rescued.

Long-term SDK shape:

- Prefer the SDK helper described in [Required SDK improvements](#16-required-sdk-improvements) over having the webapp manually build fake UTXOs.
- The helper should support both an empty intermediate wallet and a partially funded intermediate wallet by accepting existing wallet UTXOs plus one future incoming UTXO assumption.
- If the helper exists, `useQuote.ts` should call it for exact-input SPV external-wallet quotes instead of relying on generic `swapper.swap(...)` accepting `amount: null` plus manually supplied `sourceWalletUtxos`.

Exact-output behavior:

- Support exact-output SPV external-wallet quoting.
- Do not pass fake UTXOs for exact-output quotes. Quote normally without `sourceWalletUtxos`; the SDK can derive `quote.getInput().rawAmount` from the requested output amount.
- Preferred SDK path: after quote creation, call `quote.setSwapModeExternal(walletOrAddress, existingUtxos?, feeRate?, cpfpAssumptions?)`. The SDK should compute and cache `externalSwapModeInfo.requiredAdditionalUtxoAmount` and `externalSwapModeInfo.totalNetworkFee`, and `quote.getInput()`/`quote.getFeeBreakdown()` should become external-mode aware.
- `SpvFromBTCSwap.estimateBitcoinFee(wallet, feeRate)` exists today, but it funds the PSBT from the wallet's current UTXO pool, so it is useful once the intermediate wallet has a UTXO and not sufficient before the external deposit arrives.
- Compatibility fallback before SDK external mode exists: add a small app helper, for example `estimateSpvSingleUtxoDepositAmount(quote, feeRate)`, that:
  - calls `quote.getPsbt()` or `quote.getTransactionDetails()` to inspect the unfunded SPV PSBT,
  - assumes the intermediate wallet contributes exactly one `p2wpkh` input and no change output,
  - uses `Math.max(feeRate ?? quote.minimumBtcFeeRate, quote.minimumBtcFeeRate)` as the swap PSBT fee rate,
  - applies the same conservative CPFP parent assumption as the fake-UTXO exact-input path (`txEffectiveFeeRate: 1`, `txVsize: 200`),
  - returns `quote.getInput().rawAmount + estimatedNetworkFee` as `expectedBtcDepositAmount`.
- Keep this helper local only until the SDK exposes external mode.

Implementation note:

- The current `useQuote.ts` uses `maxAllowedNetworkFeeRate`; SPV options now prefer `maxAllowedBitcoinFeeRate`. Keep backward compatibility if needed, but new code should pass the current SDK option name.

## 8. SPV hook execution flow

Update `src/hooks/swaps/useSpvVaultFromBtcQuote.ts`.

The hook should support two payment modes:

- browser-wallet mode: current behavior, where `quote.sendBitcoinTransaction(bitcoinWallet.instance, feeRate)` is triggered by a button
- intermediate-wallet deposit mode: show an address/QR, wait for deposit, then auto-sign and submit the PSBT with the intermediate wallet

Extend `SpvVaultFromBtcPage` with a `step1payment` or `step1init` shape similar to `FromBtcQuotePage.step2paymentWait`:

- `walletConnected` for connected browser wallet:
  - `bitcoinWallet`
  - `payWithBrowserWallet`
  - `useExternalWallet`
- `walletDisconnected` for intermediate-wallet deposit:
  - `address.value`
  - `address.hyperlink`
  - `address.copy()`
  - `payWithBitcoinWallet.onClick`
  - `payWithBrowserWallet.onClick`
  - optional `addressCopyWarningModal`
- `depositStatus`:
  - `expectedAmount`
  - `receivedAmount`
  - `state`: `waiting`, `exact`, `underpaid`, `overpaid`, `signing`, `broadcasting`
- `error`:
  - `title`
  - `error`
  - `type`
  - `retry`
- `expiry`

Intermediate-wallet waiting logic:

1. Start polling when quote state is `CREATED` or soft-expired but still usable, no external browser Bitcoin wallet is selected for payment, and the intermediate wallet exists.
2. Fetch UTXOs through `intermediateWallet.wallet.getUtxoPool()`.
3. Filter to UTXOs belonging to `intermediateWallet.address`, unspent, and suitable for PSBT funding.
4. Read `externalSwapModeInfo` from the quote if the SDK external mode is available. Otherwise use the app-side expected-deposit compatibility data.
5. Rehydrate the selected existing UTXOs from the current wallet UTXO pool by matching the stored `txId:vout` funding snapshot.
6. If any selected existing UTXO is missing, stop auto-execution and prompt the user to re-quote from the current intermediate-wallet balance.
7. Treat all current UTXOs not present in `externalSwapModeInfo.selectedExistingUtxos` as candidate newly received deposit UTXOs.
8. Classify only the candidate newly received UTXOs against `externalSwapModeInfo.requiredAdditionalUtxoAmount`.
9. Happy path: exactly one candidate UTXO with `value === requiredAdditionalUtxoAmount`.
10. Underpayment: candidate received total is greater than zero but lower than `requiredAdditionalUtxoAmount`.
11. Overpayment: candidate received total is greater than `requiredAdditionalUtxoAmount`.
12. On happy path, call the SDK external-deposit execution helper:

```ts
await quote.executeExternalDeposit(intermediateWallet.wallet, {
  feeRate,
});
```

The key requirement is that `executeExternalDeposit()` spends all selected existing UTXOs plus the matched actual new UTXO fully. A normal wallet-funded PSBT could create change or dust because the actual deposit CPFP metadata probably differs from the quote-time fake CPFP assumption. For the expected exact deposit, the intermediate wallet must spend the whole selected funding set into the swap transaction.

After successful PSBT submit:

- move to the existing broadcasting/wait-confirmation state
- call `UICallback(quote, "hide")` the same way the current send path does
- keep `quote.waitForBitcoinTransaction(...)` as the confirmation tracker

Use an abort signal tied to the quote so polling stops when the quote changes, expires, completes, or the component unmounts.

## 9. Underpayment and overpayment handling

`src/hooks/swaps/useSpvVaultFromBtcQuote.ts` must distinguish wrong deposits before signing:

- Underpayment title: `BTC amount too low`
- Underpayment description: `The intermediate wallet received less BTC than this quote requires. Create a new quote using the deposited amount.`
- Overpayment title: `BTC amount too high`
- Overpayment description: `The intermediate wallet received more BTC than this quote expects. Create a new quote using the deposited amount.`

Hook behavior:

- Do not auto-sign if the newly received deposit amount does not exactly match the external-mode `requiredAdditionalUtxoAmount`. Do not compare the newly received deposit against `quote.getInput().rawAmount`, because in PSBT mode that value excludes the Bitcoin network fee paid by the signed/broadcast swap PSBT, and in external mode it may already be adjusted for display.
- Stop showing the "send exact amount" prompt once a wrong amount has been detected.
- Show an action that calls `refreshQuote()` from the panel, or expose enough state for the panel to call its existing refresh handler.
- Since the intermediate wallet now has non-zero balance, `useBitcoinChain.ts` should auto-connect it as input. The fresh quote should use the real wallet balance/UTXOs rather than the quote-time fake UTXO path.

If multiple UTXOs arrive:

- v1 should treat this as an amount mismatch unless exactly one newly received UTXO equals `requiredAdditionalUtxoAmount` and there are no other newly received candidate UTXOs.
- Add a clear message that the user should re-quote from the deposited balance.

## 10. Panel wiring

Update `src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx` to follow the structure of `src/components/swappanels/frombtc/onchain/FromBTCSwapPanel.tsx`.

Required UI behavior:

- Show `SwapFeePanel` while the quote is waiting for payment.
- If a browser Bitcoin wallet is connected, show `ConnectedWalletPayButtons`:
  - "Pay with browser wallet" triggers `quote.sendBitcoinTransaction(...)`
  - "Use external wallet" disconnects/switches away from the browser wallet and reveals the intermediate-wallet QR
- If no browser Bitcoin wallet is connected, show `DisconnectedWalletQrAndAddress`:
  - QR/address is the intermediate wallet receive address
  - deeplink is `bitcoin:<address>?amount=<expectedBtcAmount>` or equivalent SDK/helper-generated hyperlink
  - alert text says to send exactly the expected amount
  - "Pay with BTC wallet" opens the deeplink
  - "Pay with browser wallet" opens the Bitcoin wallet modal and, after connect, triggers the browser-wallet payment path
- Keep the expiry progress bar visible while waiting for payment.
- Show a spinner/status when the expected UTXO has been found and the app is signing/submitting the PSBT.
- Reuse `SwapConfirmations`, settlement, success, failed, and expired rendering from the current SPV panel after the Bitcoin transaction is posted.

Do not ask the user to click a second "Swap" button after depositing. The whole point of the intermediate wallet is that the app can sign the PSBT automatically once the deposit UTXO appears.

## 11. Fee and amount display

Update the active fee display path: `src/components/fees/SwapFeePanel.tsx` and `src/hooks/fees/useSwapFees.ts`.

Do not update `src/components/fees/FeeSummaryScreen.tsx` for this feature. It is legacy and is not used by the active swap panels.

The active fee UI is simpler than the legacy summary screen: `SwapFeePanel` does not compute input totals or render amount rows itself. It only gets the swap, asks `useSwapFees()` for fee rows, and renders them through `GenericFeePanel`. Therefore the SPV-specific fee work should mostly live in `useSwapFees`; `SwapFeePanel` should only receive and pass through any extra quote context that `useSwapFees` cannot derive from `swap` alone.

For `SpvFromBTCSwap`, split the responsibilities cleanly:

- `useSwapPage.ts` owns the input amount displayed in the main input field. It should show the total BTC input budget for the swap flow.
- `SpvVaultFromBTCSwapPanel.tsx` owns the QR/deeplink amount. In external mode it should show `getExternalDepositAmount()`, which may be lower than the main input amount when selected existing UTXOs are already held by the intermediate wallet.
- `useSwapFees.ts` owns the fee rows shown in `SwapFeePanel`. It should include the Bitcoin input network fee when it can be estimated or derived.
- Do not rely on a simple PSBT-mode `swap.getInput().rawAmount` assumption for any user-facing deposit amount in the external wallet mode, show the amount from `getExternalDepositAmount()`.

Recommended model:

- Prefer SDK external mode: when `swap.getSwapMode?.() === "external"`, `swap.getInput()` should already be the user-facing total BTC input amount and `swap.getFeeBreakdown()` should already include a `FeeType.NETWORK_INPUT` row.
- For real-wallet SPV quotes, keep using `swap.estimateBitcoinFee(btcWallet, btcFeeRate)` when a wallet and fee rate are available.
- Keep `SwapFeePanel` deterministic when async fee estimation is still loading: show approximate values or omit the network fee until known, but do not show a misleading lower fee total.
- Do not make `GenericFeePanel` responsible for SPV-specific calculations. It should remain a presentational accordion for price, expiry, and fee rows.

Acceptance criteria:

- For SPV BTC to smart-chain with no browser wallet connected, the input field shows the total BTC input budget, the QR/deeplink shows the required additional deposit amount, and `SwapFeePanel` shows a separate Bitcoin input network fee row.
- `SwapFeePanel` shows the Bitcoin input network fee separately from swap/watchtower/output fees.
- For non-SPV swaps, current fee display behavior does not change.

## 12. State and edge cases

- Quote expires before deposit: show expired state and tell the user not to send funds. If funds later arrive in the intermediate wallet, auto-connect it as input for a new quote.
- Deposit arrives after quote expiry: do not sign. Show or allow re-quote from intermediate balance.
- Browser wallet connects while waiting for intermediate deposit: switch to browser-wallet controls, but do not clear the intermediate wallet mnemonic or ignore already received funds.
- Intermediate wallet already has BTC before quote: auto-connect it as input, do not use fake UTXO quoting.
- Mempool/RPC temporarily unavailable: show warning with retry, keep polling.
- New deposit UTXO amount exactly matches but fee rate has moved: `executeExternalDeposit()` should use `Math.max(feeRate, quote.minimumBtcFeeRate)` and spend the selected existing UTXOs plus the actual new UTXO fully.
- Dust/change: no change output should remain in the intermediate wallet on the exact-match path.

## 13. Testing

Unit tests:

~~- `useWallet` filters the intermediate wallet out for output usage because `onlyInput: true`.
- `useBitcoinChain` auto-connects the intermediate wallet only when balance is non-zero.
- `useQuote` passes `sourceWalletUtxos` and `bitcoinFeeRate: 1` for exact-input SPV quotes without an input BTC wallet.
- `useQuote` does not use fake UTXOs for exact-output quotes.
- Exact-output external-mode setup calls `quote.setSwapModeExternal(...)` after quote creation and uses `externalSwapModeInfo.requiredAdditionalUtxoAmount` for the QR/deeplink amount.
- `useSpvVaultFromBtcQuote` detects exact deposit, underpayment, and overpayment.
- `useSpvVaultFromBtcQuote` calls `executeExternalDeposit(...)` for an exact deposit.
- `useSwapFees` preserves non-SPV behavior and shows SPV input-side Bitcoin network fee when available.
- `SwapFeePanel` passes SPV expected-deposit context through to `useSwapFees` without duplicating fee calculations~~.

Integration/manual tests:

- No Bitcoin browser wallet connected:
  - enter exact input BTC amount
  - receive SPV quote
  - see intermediate wallet QR/address/deeplink
  - fund exact amount from external wallet
  - app signs/submits PSBT automatically
  - swap proceeds to confirmations/settlement
- Connected Phantom/UniSat/Xverse path still works.
- Underpay and overpay by small amounts and verify re-quote messaging.
- Refresh/reload after deposit and verify the intermediate wallet auto-connects from persisted mnemonic.
- Verify the intermediate wallet is never available as BTC output.

## 14. File change list

New:

- `src/context/IntermediateBitcoinWalletContext.ts`
- `src/providers/IntermediateBitcoinWalletProvider.tsx`
- `src/hooks/wallets/useIntermediateBitcoinWallet.ts`
- optional tests under nearby `__tests__` folders

Modified:

- `src/providers/ChainsProvider.tsx`
- `src/providers/chains/useBitcoinChain.ts`
- `src/hooks/quoting/useQuote.ts`
- `src/hooks/pages/useSwapPage.ts`
- `src/hooks/swaps/useSpvVaultFromBtcQuote.ts`
- `src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx`
- `src/components/fees/SwapFeePanel.tsx`
- `src/hooks/fees/useSwapFees.ts`

## 15. Required SDK improvements

Add first-class SPV external-deposit support to the SDK so the webapp does not need to duplicate fake-UTXO construction, Bitcoin PSBT funding estimation, CPFP fee math, address-swap presentation, or polling/execution glue.

### Single-address wallet mnemonic factory

Add a convenience factory to `SingleAddressBitcoinWallet` for constructing the SDK wallet directly from a persisted mnemonic.

Suggested API:

```ts
SingleAddressBitcoinWallet.fromMnemonic(
  mempoolApi: MempoolApi,
  network: BitcoinNetwork,
  mnemonic: string,
  derivationPath?: string,
  feeMultiplier?: number,
  feeOverride?: number
): SingleAddressBitcoinWallet;
```

The webapp can currently construct the intermediate wallet by calling `SingleAddressBitcoinWallet.mnemonicToPrivateKey(...)` and then passing the WIF into the constructor. A factory keeps that derivation sequence inside the SDK and makes the provider code harder to misuse.

Semantics:

- The factory should derive the same key as `mnemonicToPrivateKey(mnemonic, network, derivationPath)`.
- The factory should not own browser storage or mnemonic lifecycle. The app still decides when to generate, persist, reuse, or forget the mnemonic.
- The factory should not rotate or mutate the mnemonic.
- The existing `generateRandomMnemonic()` and `mnemonicToPrivateKey()` helpers should remain available for lower-level use.

### SPV swap class split

Split the SPV BTC input swap implementation while keeping the public/deserialized class name stable:

- Rename the current `SpvFromBTCSwap` implementation to `SpvFromBTCSwapBase`.
- Add a new public `SpvFromBTCSwap` class extending `SpvFromBTCSwapBase`.
- Keep `SpvFromBTCWrapper._swapDeserializer = SpvFromBTCSwap`, so restored swaps still deserialize into the public `SpvFromBTCSwap` class.
- Keep the existing swap type, storage indexes, state enum, and serialized identity unchanged.
- Put the existing PSBT swap mechanics, SPV vault state handling, settlement logic, and normal wallet-funded execution in `SpvFromBTCSwapBase`.
- Put external-address deposit mode, address-swap compatibility, external deposit waiting, and external deposit execution in the new `SpvFromBTCSwap` class.

This gives the external-deposit flow a clean implementation boundary without creating two different runtime swap classes for the same serialized quote. Existing SDK consumers should continue importing `SpvFromBTCSwap`; the base class is an internal/advanced implementation detail.

### External deposit swap mode

Add explicit swap mode state to the public `SpvFromBTCSwap` class:

```ts
type SpvFromBTCSwapMode = "psbt" | "external";

type SpvExternalSelectedUtxo = {
  txId: string;
  vout: number;
  value: number;
  type: CoinselectAddressTypes;
  cpfp?: {
    txVsize: number;
    txEffectiveFeeRate: number;
  };
};

type SpvFromBTCExternalSwapModeInfo = {
  depositAddress: string;
  depositAddressType: CoinselectAddressTypes;
  selectedExistingUtxos: SpvExternalSelectedUtxo[];
  feeRate: number;
  cpfpAssumptions: {
    txVsize: number;
    txEffectiveFeeRate: number;
  };
  requiredAdditionalUtxoAmount: string;
  totalNetworkFee: string;
};
```

The swap should persist:

- `swapMode`, defaulting to `"psbt"` for old/restored swaps where the field is missing
- `externalSwapModeInfo`, present only when `swapMode === "external"`

NOTE: Careful about the serialization of the `SpvExternalSelectedUtxo` type, as external callers might actually pass `BitcoinWalletUtxo` object which conforms to the required type, but would fail serialization because it also contains a Uint8Array/Buffer!

The selected existing UTXOs are intentionally stored as a funding snapshot, including value, type, and CPFP data. Execution should rehydrate fresh UTXO objects by `txId:vout` before signing, but the snapshot preserves the exact quote-time fee and input amount calculation for synchronous getters such as `getInput()` and `getFeeBreakdown()`.

Add mode APIs:

```ts
getSwapMode(): SpvFromBTCSwapMode;

getExternalSwapModeInfo(): SpvFromBTCExternalSwapModeInfo | null;

setSwapModePsbt(): void;

setSwapModeExternal(
  walletOrAddress: IBitcoinWallet | string,
  existingUtxos?: BitcoinWalletUtxo[],
  feeRate?: number,
  cpfpAssumptions?: {
    txVsize: number;
    txEffectiveFeeRate: number;
  }
): Promise<SpvFromBTCExternalSwapModeInfo>;
```

`setSwapModeExternal()` semantics:

- If `walletOrAddress` is a wallet, infer `depositAddress` from `wallet.getReceiveAddress()`.
- If `existingUtxos` is omitted and `walletOrAddress` is a wallet, fetch UTXOs through `wallet.getUtxoPool()`.
- The wallet overload requires a wallet with `getUtxoPool()` support. If the wallet cannot expose UTXOs, throw a typed unsupported-operation error.
- If `walletOrAddress` is an address string and `existingUtxos` is omitted, fetch UTXOs for that address through the SPV wrapper's Bitcoin RPC/address-index abstraction.
- Infer `depositAddressType` from `depositAddress`; do not require callers to pass an address type manually.
- Normalize `feeRate` with `Math.max(feeRate ?? minimumBtcFeeRate, minimumBtcFeeRate)`.
- Default `cpfpAssumptions` to `{ txEffectiveFeeRate: 1, txVsize: 200 }`.
- For v1, select all currently available UTXOs for the deposit address. This makes everything not included in `selectedExistingUtxos` after mode preparation a candidate newly received deposit UTXO.
- Compute and cache `requiredAdditionalUtxoAmount` and `totalNetworkFee` using an internal external-deposit funding estimator.
- Save the swap mode change so reloads restore external mode.

When `swapMode === "external"`:

- `getInput()` should return the user-facing BTC input amount inclusive of the input-side Bitcoin network fee needed to fund/sign/broadcast the SPV swap PSBT.
- `getFeeBreakdown()` should include the input-side Bitcoin network fee. Add `FeeType.NETWORK_INPUT` for this fee instead of overloading `FeeType.NETWORK_OUTPUT`.
- `getAddress()` should return `externalSwapModeInfo.depositAddress`.
- `getHyperlink()` should return a Bitcoin URI for `depositAddress` and `requiredAdditionalUtxoAmount`.
- `waitForExternalDeposit(...)` should wait for one newly received UTXO matching `requiredAdditionalUtxoAmount`.
- `executeExternalDeposit(...)` should execute the swap with the fresh selected existing UTXOs plus the matched new UTXO, spending that funding set fully without leaving change in the intermediate wallet.

When `swapMode === "psbt"`:

- The swap should behave like the current SPV PSBT-signing swap.
- `setSwapModePsbt()` should clear or ignore cached external fee/deposit values so `getInput()` and `getFeeBreakdown()` return normal PSBT-mode values.
- `getAddress()` and `getHyperlink()` may exist on the class for interface compatibility, but should throw a clear error if called while the swap is not in external mode.

Update `IAddressSwap` typeguard behavior so this mode can be represented cleanly:

```ts
export function isIAddressSwap(obj: any): obj is IAddressSwap {
  return obj != null &&
    typeof obj.getAddress === "function" &&
    typeof obj.getHyperlink === "function" &&
    (typeof obj.isAddressSwapMode !== "function" || obj.isAddressSwapMode());
}
```

`SpvFromBTCSwap` should implement `isAddressSwapMode()` and return `swapMode === "external"`. Existing address swaps do not need to implement this method.

### Future-UTXO quote creation

Add a quote creation helper for SPV BTC input quotes that expects one future incoming UTXO to be added to the wallet/address. This helper should return a normal public `SpvFromBTCSwap` already configured in external mode through `setSwapModeExternal(...)`.

This replaces the need for both:

- a generic `Swapper.swap()` special case for `amount: null` plus `sourceWalletUtxos`
- webapp-side construction of fake `BitcoinWalletUtxoBase` objects

Suggested API shape:

```ts
createSpvFromBtcSwapWithExternalDeposit(
  externalDeposit: {
    walletOrAddress: IBitcoinWallet | string;
    existingUtxos?: BitcoinWalletUtxo[];
    feeRate?: number;
    cpfpAssumptions?: {
      txVsize: number;
      txEffectiveFeeRate: number;
    };
  },
  dstToken: SCToken<ChainIdentifier>,
  amount: bigint | string,
  exactIn: boolean | SwapAmountType,
  dstSmartchainWallet: string,
  options?: SpvFromBTCOptions
): Promise<SpvFromBTCSwap>;
```

The exact positional arguments relevant for the specific swap type should be used here, matching the normal `swap(...)` overload for SPV BTC to smart-chain swaps. Do not expose this as an untyped `Parameters<Swapper["swap"]>` placeholder in the public API; use concrete overloads/signatures so SDK consumers get the same type safety and autocomplete as the regular swap creation path.

Semantics:

- The arguments after `externalDeposit` should behave like the regular `swap(...)` call for SPV BTC to smart-chain swaps.
- For exact-input quotes, the regular `amount` argument is the user-visible total BTC input amount for the quote. It is the total amount the user wants to commit to this swap flow across existing wallet UTXOs plus the future incoming UTXO. It is not the future UTXO amount by itself.
- For exact-output quotes, the regular `amount` argument keeps its normal meaning as the requested output amount; the SDK derives the required BTC input and then prepares external mode from that quote.
- If `existingUtxos` is omitted, the SDK should fetch current UTXOs from `walletOrAddress` using the same rules as `setSwapModeExternal()`.
- For v1, all fetched/supplied existing UTXOs for the deposit address are selected.
- `cpfpAssumptions` describe only the future incoming UTXO and default to `{ txEffectiveFeeRate: 1, txVsize: 200 }`.
- For exact-input quotes, the SDK should quote as if the funding set were all selected existing UTXOs plus one synthetic UTXO with value equal to the missing amount from the regular `amount` argument, using the inferred deposit address type and the supplied/default CPFP assumptions.
- The SDK must not quote exact-input requests against `amount + selectedExistingUtxoTotal`. For example, if the user enters `0.01 BTC` and the intermediate wallet already holds `0.002 BTC`, the quote should be for a total `0.01 BTC` input budget and should report an additional deposit requirement of `0.008 BTC`, before any rounding/dust constraints.
- The SDK should set or derive the SPV `bitcoinFeeRate` from `feeRate` and use the same minimum-fee-rate normalization as execution.
- The returned quote should have `swapMode === "external"` and an `externalSwapModeInfo` snapshot populated.
- If existing UTXOs already cover the required BTC input budget, `requiredAdditionalUtxoAmount` should be zero. In that case the app should not show a new external-deposit QR; it should execute from the connected wallet or prompt for a normal re-quote if exact funding cannot be represented cleanly.

For the first webapp implementation, `existingUtxos` will usually be `[]`; if the intermediate wallet already has a non-zero balance it should normally auto-connect as the input wallet and quote from real UTXOs. Supporting `existingUtxos` in the SDK helper still matters because it keeps the primitive correct for partial wallet funding and avoids another helper later.

## 16. Decisions and open questions

Resolved decisions:

- Empty intermediate wallet is not shown in the wallet connector. Its receive address is shown only in the SPV vault swap panel payment step.
- The mnemonic is generated once and reused. There is no mnemonic rotation in v1.
- When the intermediate wallet balance is zero, it automatically disappears as an active Bitcoin pseudo-wallet, same as the LNURL-withdraw pseudo-wallet behavior.
- Exact-output SPV external-wallet flow is supported. Quote normally without fake UTXOs, then calculate the expected deposit amount from the quote input plus the estimated Bitcoin network fee.

Open question:

- Which copy/legal language do we want around browser-stored mnemonics?
