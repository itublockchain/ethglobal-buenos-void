export interface SendTransaction {
  from: string;
  to: string;
  token: string;
  amount: string;
}

export interface TransferRequest {
  sendTransaction: SendTransaction;
  signature: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  token: string;
  amount: string;
}
