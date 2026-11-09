import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refund_payment')
export class RefundPayment {
  @PrimaryGeneratedColumn('uuid', { name: 'refund_payment_id' })
  refundPaymentId!: string;

  @Column({ name: 'refund_id', type: 'uuid' })
  refundId!: string;

  @Column({ name: 'shift_id', type: 'uuid', nullable: true })
  shiftId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  reference!: string;

  @Column({ type: 'decimal', precision: 14, scale: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 24 })
  channel!: string;

  @Column({ name: 'evidence_reference', type: 'text', nullable: true })
  evidenceReference!: string | null;

  @Column({ name: 'evidence_type', type: 'varchar', length: 32 })
  evidenceType!: string;

  @Column({ type: 'varchar', length: 24, default: 'COMPLETED' })
  status!: string;
}