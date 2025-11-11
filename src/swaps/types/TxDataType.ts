export type TxDataType = {
  txId: string;
  confirmations: {
    actual: number;
    required: number;
  };
  eta: {
    millis: number;
    text: string;
  };
};
