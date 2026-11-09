// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('booking_session')
export class BookingSession {
  @PrimaryGeneratedColumn('uuid', { name: 'session_id' })
  sessionId!: string;

  @Column({ name: 'reservation_status', type: 'varchar', length: 24 })
  reservationStatus!: string;

  @Column({ type: 'varchar', length: 24 })
  status!: string;
}