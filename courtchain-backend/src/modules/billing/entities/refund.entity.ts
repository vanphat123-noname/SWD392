// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refund')
export class Refund {
  @PrimaryGeneratedColumn('uuid', { name: 'refund_id' })
  refundId!: string;

  @Column({ name: 'cancellation_id', type: 'uuid' })
  cancellationId!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'requested_amount', type: 'decimal', precision: 14, scale: 0 })
  requestedAmount!: number;

  @Column({ name: 'approved_amount', type: 'decimal', precision: 14, scale: 0, default: 0 })
  approvedAmount!: number;

  @Column({ type: 'varchar', length: 24, default: 'PENDING' })
  status!: string;
}