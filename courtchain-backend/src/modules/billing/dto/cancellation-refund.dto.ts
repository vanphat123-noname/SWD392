// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum CancellationDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewCancellationDto {
  @IsEnum(CancellationDecision)
  decision!: CancellationDecision;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  decision_reason?: string;
}

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  decision_reason?: string;
}

export class ExecuteVnPayRefundDto {
  @IsString()
  @IsNotEmpty()
  original_transaction_reference!: string;
}

export class RecordBankRefundDto {
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsString()
  @IsNotEmpty()
  evidence_reference!: string;
}

export class RecordCashRefundDto {
  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsString()
  @IsNotEmpty()
  evidence_reference!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}