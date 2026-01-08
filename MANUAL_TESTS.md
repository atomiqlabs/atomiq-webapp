# Manual testing checklist

## Swaps

### Solana

#### Solana -> Lightning

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Successful swap to connected lightning wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### Solana -> On-chain BTC

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to external wallet address
- [ ] Successful swap to connected bitcoin wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### Lightning -> Solana

- [ ] Let the quote expire before LN tx is received
- [ ] Connection dropped after swap is initiated
- [ ] Let the quote expire after LN tx is received
- [ ] Refuse to sign commit+claim transaction
- [ ] Successful swap from external wallet
- [ ] Successful swap from connected lightning wallet
- [ ] Refuse to authorize lightning transaction from lightning wallet
- [ ] Let only commit transaction be sent (refresh and refuse to sign claim tx)
- [ ] Let only commit transaction be sent (refresh and finish up with claim tx)
- [ ] Let the swap expire after commit transaction is sent (never send claim)

#### On-chain BTC -> Solana

- [ ] Let the quote expire
- [ ] Refuse to sign initialization transaction
- [ ] Let the quote expire after initializing the swap
- [ ] Connection dropped after swap is initiated
- [ ] Successful swap from external wallet
- [ ] Successful swap from connected bitcoin wallet
- [ ] Refuse to sign bitcoin transaction from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)

### Starknet

#### Starknet -> Lightning

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Successful swap to connected lightning wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### Starknet -> On-chain BTC

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to external wallet address
- [ ] Successful swap to connected bitcoin wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### Lightning -> Starknet

- [ ] Let the quote expire before LN tx is received
- [ ] Connection dropped after swap is initiated
- [ ] Successful swap from external wallet
- [ ] Successful swap from connected lightning wallet
- [ ] Refuse to authorize lightning transaction from lightning wallet
- [ ] Manually claim the swap (watchtower turned off)

#### On-chain BTC -> Starknet

- [ ] Let the quote expire
- [ ] Successful swap from connected bitcoin wallet
- [ ] Connection dropped after bitcoin tx is sent
- [ ] Refuse to sign bitcoin transaction from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)

### EVM

#### EVM -> Lightning

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Successful swap to connected lightning wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### EVM -> On-chain BTC

- [ ] Let the quote expire
- [ ] Refuse to sign transaction
- [ ] Successful swap to external wallet address
- [ ] Successful swap to connected bitcoin wallet
- [ ] Connection dropped after transaction is sent
- [ ] Failed swap + refund

#### Lightning -> EVM

- [ ] Let the quote expire before LN tx is received
- [ ] Connection dropped after swap is initiated
- [ ] Successful swap from external wallet
- [ ] Successful swap from connected lightning wallet
- [ ] Refuse to authorize lightning transaction from lightning wallet
- [ ] Manually claim the swap (watchtower turned off)

#### On-chain BTC -> EVM

- [ ] Let the quote expire
- [ ] Successful swap from connected bitcoin wallet
- [ ] Connection dropped after bitcoin tx is sent
- [ ] Refuse to sign bitcoin transaction from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)
