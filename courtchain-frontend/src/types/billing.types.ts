export type CancellationStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface CancellationDetail {
  cancellationDetailId: string;
  bookingSessionId: string;
  noticeHours: number;
  refundBase: number;
  refundRate: number;
  approvedRefund: number;
  status: string;
}

export interface CancellationRecord {
  cancellationId: string;
  bookingId: string;
  status: CancellationStatus;
  decisionReason: string | null;
  details: CancellationDetail[];
}

export interface RefundRecord {
  refundId: string;
  cancellationId: string;
  reason: string;
  requestedAmount: number;
  approvedAmount: number;
  status: RefundStatus;
}

export interface ReviewCancellationInput {
  decision: 'APPROVE' | 'REJECT';
  decision_reason?: string;
}

export interface BankRefundInput {
  reference: string;
  evidence_reference: string;
}

export interface CashRefundInput extends BankRefundInput {
  amount?: number;
}