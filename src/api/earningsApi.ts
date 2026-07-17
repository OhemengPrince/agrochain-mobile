import apiClient from './axios';

export interface EarningsSummary {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalAgrochainFee: number;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  agrochainFee: number;
  netAmount: number;
  status: string;
  description: string;
  counterpartyName: string;
  paymentMethod: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  method: 'MOMO' | 'BANK';
  amount: number;
  network?: string;
  phoneNumber?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

export const getEarnings = () =>
  apiClient.get<EarningsSummary>('/earnings/me');

export const getTransactions = (page = 0) =>
  apiClient.get<{ content: Transaction[]; totalPages: number; totalElements: number }>(
    '/earnings/transactions',
    { params: { page, size: 20 } }
  );

export const getWithdrawals = () =>
  apiClient.get('/earnings/withdrawals');

export const initiateWithdrawal = (data: WithdrawalRequest) =>
  apiClient.post('/earnings/withdraw', data);

export const verifyBankAccount = (bankCode: string, accountNumber: string) =>
  apiClient.get<{ accountName: string }>('/earnings/verify-account', {
    params: { bankCode, accountNumber },
  });
