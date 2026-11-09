// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { CashTransaction } from '../entities/cash-transaction.entity';

@Injectable()
export class ShiftCashService {
  async recordRefund(
    manager: EntityManager,
    cashierId: string,
    amount: number,
    reference: string,
  ): Promise<string> {
    const shiftRepository = manager.getRepository(Shift);
    const shift = await shiftRepository.findOne({
      where: { cashierId, status: 'OPEN' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc đang mở.');
    if (Number(shift.expectedCash) < amount) {
      throw new BadRequestException('Két ca không đủ tiền mặt để hoàn tiền.');
    }

    shift.expectedCash = Number(shift.expectedCash) - amount;
    await shiftRepository.save(shift);
    await manager.getRepository(CashTransaction).save({
      shiftId: shift.shiftId,
      amount: -amount,
      type: 'REFUND',
      reference,
    });
    return shift.shiftId;
  }
}