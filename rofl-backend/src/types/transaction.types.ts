export interface TransactionEntry {
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  timestamp: number;
}

export interface TransactionProof {
  root: string;
  siblings: string[];
  key: string;
  value: string;
}

export interface TransactionHistoryItem extends TransactionEntry {
  type: 'sent' | 'received';
}
