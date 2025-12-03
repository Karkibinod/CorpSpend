// FinLedger Type Definitions

export type CardStatus = 'active' | 'frozen' | 'cancelled';
export type TransactionStatus = 'pending' | 'approved' | 'declined' | 'verified' | 'flagged';

export interface Card {
  id: string;
  card_number: string;
  cardholder_name: string;
  spending_limit: string;
  current_balance: string;
  available_balance: string;
  status: CardStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  card_id: string;
  amount: string;
  merchant_name: string;
  merchant_category: string | null;
  description: string | null;
  status: TransactionStatus;
  receipt_verified: boolean;
  receipt_verified_at: string | null;
  fraud_score: string | null;
  fraud_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCardRequest {
  card_number: string;
  cardholder_name: string;
  spending_limit: number;
}

export interface CreateTransactionRequest {
  card_id: string;
  amount: number;
  merchant_name: string;
  merchant_category?: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
  items: T[];
}

export interface CardListResponse {
  cards: Card[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ReceiptUploadResponse {
  message: string;
  task_id: string;
  transaction_id: string | null;
  status: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardStats {
  totalCards: number;
  activeCards: number;
  totalSpending: number;
  totalTransactions: number;
  approvedTransactions: number;
  flaggedTransactions: number;
  recentTransactions: Transaction[];
}

