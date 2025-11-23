export interface BalanceProof {
  root: string;
  siblings: string[];
  key: string;
  value: string;
}

export interface BalanceEntry {
  wallet: string;
  token: string;
  balance: string;
}

export interface BalanceWithProof {
  token: string;
  balance: string;
  proof: BalanceProof;
}
