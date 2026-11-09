// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Injectable } from '@nestjs/common';

export interface VnPayRefundResult {
  reference: string;
}

@Injectable()
export abstract class VNPayService {
  abstract refundPayment(input: {
    refundId: string;
    originalTransactionReference: string;
    amount: number;
  }): Promise<VnPayRefundResult>;
}