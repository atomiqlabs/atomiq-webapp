import {
  AbstractSigner,
  Provider,
  Signer,
  TransactionRequest,
  TransactionResponse,
  TypedDataDomain,
  TypedDataField
} from "ethers";


export class ChainSwitchingSigner extends AbstractSigner {

  signer: AbstractSigner;
  switchChain: (chainId: number) => Promise<void>;
  currentChainId: () => number;

  constructor(
    signer: AbstractSigner,
    switchChain: (chainId: number) => Promise<void>,
    currentChainId: () => number
  ) {
    super();
    this.signer = signer;
    this.switchChain = switchChain;
    this.currentChainId = currentChainId;
  }

  connect(provider: Provider | null): Signer {
    return this.signer.connect(provider);
  }

  getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  signMessage(message: string | Uint8Array): Promise<string> {
    return this.signer.signMessage(message);
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    if(this.currentChainId()!==Number(tx.chainId)) {
      await this.switchChain(Number(tx.chainId));
    }
    return await this.signer.signTransaction(tx);
  }

  signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string> {
    return this.signer.signTypedData(domain, types, value);
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if(this.currentChainId()!==Number(tx.chainId)) {
      await this.switchChain(Number(tx.chainId));
    }
    return await this.signer.sendTransaction(tx);
  }

}