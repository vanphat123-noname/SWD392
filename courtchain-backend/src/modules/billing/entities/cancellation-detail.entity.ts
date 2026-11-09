// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cancellation } from './cancellation.entity';

@Entity('cancellation_detail')
export class CancellationDetail {
  @PrimaryGeneratedColumn('uuid', { name: 'cancellation_detail_id' })
  cancellationDetailId!: string;

  @Column({ name: 'cancellation_id', type: 'uuid' })
  cancellationId!: string;

  @Column({ name: 'booking_session_id', type: 'uuid' })
  bookingSessionId!: string;

  @Column({ name: 'notice_hours', type: 'decimal', precision: 8, scale: 2 })
  noticeHours!: number;

  @Column({ name: 'refund_base', type: 'decimal', precision: 14, scale: 0 })
  refundBase!: number;

  @Column({ name: 'refund_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  refundRate!: number;

  @Column({ name: 'approved_refund', type: 'decimal', precision: 14, scale: 0, default: 0 })
  approvedRefund!: number;

  @Column({ type: 'varchar', length: 24, default: 'PENDING' })
  status!: string;

  @ManyToOne(() => Cancellation, (cancellation) => cancellation.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cancellation_id' })
  cancellation!: Cancellation;
}