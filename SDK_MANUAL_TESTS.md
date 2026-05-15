# Manual testing checklist

## Swaps

### Solana

#### Solana -> Lightning

- [ ] Let the quote expire
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Failed swap + refund

#### Solana -> On-chain BTC

- [ ] Let the quote expire
- [ ] Successful swap to external wallet address
- [ ] Failed swap + refund

#### Lightning -> Solana

- [ ] Let the quote expire before LN tx is received
- [ ] Let the quote expire after LN tx is received
- [ ] Successful swap from external wallet
- [ ] Let only commit transaction be sent (refresh and finish up with claim tx)
- [ ] Let the swap expire after commit transaction is sent (never send claim)

#### On-chain BTC -> Solana

- [ ] Let the quote expire
- [ ] Let the quote expire after initializing the swap
- [ ] Successful swap from external wallet
- [ ] Successful swap from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)

### Starknet

#### Starknet -> Lightning

- [ ] Let the quote expire
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Failed swap + refund

#### Starknet -> On-chain BTC

- [ ] Let the quote expire
- [ ] Successful swap to external wallet address
- [ ] Failed swap + refund

#### Lightning -> Starknet

- [ ] Let the quote expire before LN tx is received
- [ ] Successful swap from external wallet
- [ ] Manually claim the swap (watchtower turned off)

#### On-chain BTC -> Starknet

- [ ] Let the quote expire
- [ ] Successful swap from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)

### EVM

#### EVM -> Lightning

- [ ] Let the quote expire
- [ ] Successful swap to lightning invoice
- [ ] Successful swap to LNURL (exact out amount)
- [ ] Successful swap to LNURL (exact in amount)
- [ ] Failed swap + refund

#### EVM -> On-chain BTC

- [ ] Let the quote expire
- [ ] Successful swap to external wallet address
- [ ] Failed swap + refund

#### Lightning -> EVM

- [ ] Let the quote expire before LN tx is received
- [ ] Successful swap from external wallet
- [ ] Manually claim the swap (watchtower turned off)

#### On-chain BTC -> EVM

- [ ] Let the quote expire
- [ ] Successful swap from connected bitcoin wallet
- [ ] Manually claim the swap (watchtower turned off)
