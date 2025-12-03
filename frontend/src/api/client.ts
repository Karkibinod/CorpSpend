// CorpSpend API Client

import type {
  Card,
  Transaction,
  CreateCardRequest,
  CreateTransactionRequest,
  CardListResponse,
  TransactionListResponse,
  ReceiptUploadResponse,
  ApiError,
} from '../types';

// Use environment variable for API URL (for production deployment)
// Falls back to relative URL for local development with proxy
const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      credentials: 'include', // Include cookies for CORS
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ user: { id: string; name: string; email: string; role: string }; message: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(name: string, email: string, password: string): Promise<{ user: { id: string; name: string; email: string; role: string }; message: string }> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Chat endpoint
  async chat(message: string, history: Array<{ sender: string; text: string }> = []): Promise<{ response: string; model?: string }> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }

  // Card endpoints
  async getCards(page = 1, perPage = 20, status?: string): Promise<CardListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    if (status) params.append('status', status);
    
    return this.request<CardListResponse>(`/cards?${params}`);
  }

  async getCard(cardId: string): Promise<Card> {
    return this.request<Card>(`/cards/${cardId}`);
  }

  async createCard(data: CreateCardRequest): Promise<Card> {
    return this.request<Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCardBalance(cardId: string): Promise<{
    card_id: string;
    spending_limit: string;
    current_balance: string;
    available_balance: string;
    status: string;
  }> {
    return this.request(`/cards/${cardId}/balance`);
  }

  // Transaction endpoints
  async getTransactions(
    page = 1,
    perPage = 20,
    filters?: { card_id?: string; status?: string; start_date?: string; end_date?: string }
  ): Promise<TransactionListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (filters?.card_id) params.append('card_id', filters.card_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    return this.request<TransactionListResponse>(`/transactions?${params}`);
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${transactionId}`);
  }

  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCardTransactions(
    cardId: string,
    page = 1,
    perPage = 20
  ): Promise<TransactionListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    return this.request<TransactionListResponse>(`/cards/${cardId}/transactions?${params}`);
  }

  // Receipt endpoints
  async uploadReceipt(file: File, transactionId?: string): Promise<ReceiptUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (transactionId) {
      formData.append('transaction_id', transactionId);
    }

    const response = await fetch(`${API_BASE}/upload-receipt`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async getReceiptStatus(taskId: string): Promise<{
    task_id: string;
    status: string;
    result?: unknown;
    error?: string;
  }> {
    return this.request(`/receipts/status/${taskId}`);
  }
}

export const api = new ApiClient();

