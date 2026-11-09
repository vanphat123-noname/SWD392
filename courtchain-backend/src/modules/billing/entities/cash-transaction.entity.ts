// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cash_transaction')
export class CashTransaction {
  @PrimaryGeneratedColumn('uuid', { name: 'cash_transaction_id' })
  cashTransactionId!: string;

  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId!: string;

  @Column({ type: 'decimal', precision: 14, scale: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 24 })
  type!: string;

  @Column({ type: 'varchar', length: 120 })
  reference!: string;
}