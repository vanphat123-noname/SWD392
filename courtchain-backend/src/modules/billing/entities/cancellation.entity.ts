import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CancellationDetail } from './cancellation-detail.entity';

@Entity('cancellation')
export class Cancellation {
  @PrimaryGeneratedColumn('uuid', { name: 'cancellation_id' })
  cancellationId!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'requested_by_id', type: 'uuid' })
  requestedById!: string;

  @Column({ type: 'varchar', length: 24, default: 'REQUESTED' })
  status!: string;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason!: string | null;

  @OneToMany(() => CancellationDetail, (detail) => detail.cancellation)
  details!: CancellationDetail[];
}