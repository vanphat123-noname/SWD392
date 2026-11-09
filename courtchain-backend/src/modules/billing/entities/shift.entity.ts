// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('shift')
export class Shift {
  @PrimaryGeneratedColumn('uuid', { name: 'shift_id' })
  shiftId!: string;

  @Column({ name: 'cashier_id', type: 'uuid' })
  cashierId!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ name: 'expected_cash', type: 'decimal', precision: 14, scale: 0, default: 0 })
  expectedCash!: number;
}