import apiClient from './api.client';
import type {
  BankRefundInput,
  CancellationRecord,
  CashRefundInput,
  RefundRecord,
  ReviewCancellationInput,
} from '../types/billing.types';

export const refundService = {
  async listCancellations() {
    const { data } = await apiClient.get<CancellationRecord[]>('/billing/cancellations');
    return data;
  },
  async listRefunds() {
    const { data } = await apiClient.get<RefundRecord[]>('/billing/refunds');
    return data;
  },
  async reviewCancellation(id: string, input: ReviewCancellationInput) {
    const { data } = await apiClient.patch(`/billing/cancellations/${id}/review`, input);
    return data;
  },
  async approveRefund(id: string) {
    const { data } = await apiClient.patch(`/billing/refunds/${id}/approve`, {});
    return data;
  },
  async executeVnPay(id: string, original_transaction_reference: string) {
    const { data } = await apiClient.post(`/billing/refunds/${id}/execute-vnpay`, {
      original_transaction_reference,
    });
    return data;
  },
  async recordBankTransfer(id: string, input: BankRefundInput) {
    const { data } = await apiClient.post(`/billing/refunds/${id}/record-bank-transfer`, input);
    return data;
  },
  async recordCash(id: string, input: CashRefundInput) {
    const { data } = await apiClient.post(`/billing/refunds/${id}/record-cash`, input);
    return data;
  },
};