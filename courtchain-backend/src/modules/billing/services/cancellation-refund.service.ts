// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingSession } from '../../booking/entities/session.entity';
import { ReviewCancellationDto, CancellationDecision, ApproveRefundDto, ExecuteVnPayRefundDto, RecordBankRefundDto, RecordCashRefundDto } from '../dto/cancellation-refund.dto';
import { Cancellation } from '../entities/cancellation.entity';
import { CancellationDetail } from '../entities/cancellation-detail.entity';
import { Refund } from '../entities/refund.entity';
import { RefundPayment } from '../entities/refund-payment.entity';
import { ShiftCashService } from './shift-cash.service';
import { VNPayService } from './vnpay.service';

export interface BillingActor {
  id: string;
  role: string;
  branchId?: string;
}

@Injectable()
export class CancellationRefundService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly vnPayService: VNPayService,
    private readonly shiftCashService: ShiftCashService,
  ) {}

  async listCancellations(branchId: string) {
    return this.dataSource.getRepository(Cancellation).find({
      where: { branchId },
      relations: { details: true },
      order: { cancellationId: 'DESC' },
    });
  }

  async listRefunds(branchId: string) {
    return this.dataSource.getRepository(Refund)
      .createQueryBuilder('refund')
      .innerJoin(Cancellation, 'cancellation', 'cancellation.cancellation_id = refund.cancellation_id')
      .where('cancellation.branch_id = :branchId', { branchId })
      .orderBy('refund.refund_id', 'DESC')
      .getMany();
  }

  async reviewCancellation(id: string, dto: ReviewCancellationDto, actor: BillingActor) {
    if (!actor.branchId) throw new ForbiddenException('Tài khoản chưa được gán chi nhánh.');
    return this.transaction(async (manager) => {
      const cancellation = await manager.getRepository(Cancellation).findOne({
        where: { cancellationId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cancellation) throw new NotFoundException('Không tìm thấy yêu cầu hủy.');
      if (cancellation.branchId !== actor.branchId) throw new ForbiddenException();
      if (!['REQUESTED', 'UNDER_REVIEW'].includes(cancellation.status)) {
        throw new BadRequestException('Yêu cầu hủy không còn ở trạng thái có thể duyệt.');
      }

      if (dto.decision === CancellationDecision.REJECT) {
        if (!dto.decision_reason?.trim()) throw new BadRequestException('Bắt buộc nhập lý do từ chối.');
        cancellation.status = 'REJECTED';
        cancellation.decisionReason = dto.decision_reason.trim();
        return manager.getRepository(Cancellation).save(cancellation);
      }

      const details = await manager.getRepository(CancellationDetail).find({
        where: { cancellationId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!details.length) throw new BadRequestException('Yêu cầu hủy không có chi tiết ca chơi.');
      let total = 0;
      for (const detail of details) {
        const rate = this.refundRate(Number(detail.noticeHours));
        detail.refundRate = rate;
        detail.approvedRefund = Math.floor(Number(detail.refundBase) * rate);
        detail.status = 'APPROVED';
        total += Number(detail.approvedRefund);
        const session = await manager.getRepository(BookingSession).findOne({
          where: { sessionId: detail.bookingSessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!session) throw new NotFoundException(`Không tìm thấy ca chơi ${detail.bookingSessionId}.`);
        session.reservationStatus = 'CANCELLED';
        session.status = 'AVAILABLE';
        await manager.getRepository(BookingSession).save(session);
      }
      await manager.getRepository(CancellationDetail).save(details);
      cancellation.status = 'APPROVED';
      cancellation.decisionReason = dto.decision_reason?.trim() || null;
      await manager.getRepository(Cancellation).save(cancellation);
      await manager.getRepository(Refund).save({
        cancellationId: id,
        reason: cancellation.decisionReason || 'Cancellation approved',
        requestedAmount: total,
        approvedAmount: 0,
        status: 'PENDING',
      });
      return cancellation;
    });
  }

  async approveRefund(id: string, dto: ApproveRefundDto, actor: BillingActor) {
    return this.transaction(async (manager) => {
      const refund = await this.getRefund(manager, id, true);
      await this.assertBranch(manager, refund, actor);
      if (refund.status !== 'PENDING') throw new BadRequestException('Refund không ở trạng thái chờ duyệt.');
      if (!['FACILITY_MANAGER', 'COURT_OWNER'].includes(actor.role)) throw new ForbiddenException();

      if (actor.role === 'FACILITY_MANAGER') {
        await manager.getRepository(Cancellation)
          .createQueryBuilder('cancellation')
          .setLock('pessimistic_write')
          .where('cancellation.branch_id = :branchId', { branchId: actor.branchId })
          .getMany();
      }

      const amount = Number(refund.requestedAmount);
      const alreadyApproved = await manager.getRepository(Refund)
        .createQueryBuilder('refund')
        .innerJoin(Cancellation, 'cancellation', 'cancellation.cancellation_id = refund.cancellation_id')
        .where('cancellation.branch_id = :branchId', { branchId: actor.branchId })
        .andWhere('refund.status IN (:...statuses)', { statuses: ['APPROVED', 'COMPLETED'] })
        .select('COALESCE(SUM(refund.approved_amount), 0)', 'total')
        .getRawOne<{ total: string }>();
      const cumulative = Number(alreadyApproved?.total || 0) + amount;
      if (actor.role === 'FACILITY_MANAGER' && cumulative > 1_000_000) {
        throw new ForbiddenException('Vượt hạn mức 1.000.000 VNĐ; Court Owner phải duyệt.');
      }
      refund.approvedAmount = amount;
      refund.status = 'APPROVED';
      return manager.getRepository(Refund).save(refund);
    });
  }

  async executeVnPayRefund(id: string, dto: ExecuteVnPayRefundDto, actor: BillingActor) {
    return this.transaction(async (manager) => {
      const refund = await this.getRefund(manager, id, true);
      await this.assertBranch(manager, refund, actor);
      if (refund.status !== 'APPROVED') throw new BadRequestException('Refund phải được duyệt trước khi chi trả.');
      const amount = Number(refund.approvedAmount);
      const gatewayResult = await this.vnPayService.refundPayment({
        refundId: id,
        originalTransactionReference: dto.original_transaction_reference,
        amount,
      });
      await manager.getRepository(RefundPayment).save({
        refundId: id,
        shiftId: null,
        reference: gatewayResult.reference,
        amount,
        channel: 'VNPAY_GATEWAY',
        evidenceReference: gatewayResult.reference,
        evidenceType: 'GATEWAY_REVERSAL_REF',
        status: 'COMPLETED',
      });
      refund.status = 'COMPLETED';
      await manager.getRepository(Refund).save(refund);
      return refund;
    });
  }

  async recordBankTransfer(id: string, dto: RecordBankRefundDto, actor: BillingActor) {
    if (actor.role !== 'COURT_OWNER') throw new ForbiddenException();
    return this.recordManualRefund(id, actor, async (manager, refund) => {
      if (!dto.evidence_reference.trim()) throw new BadRequestException('Bắt buộc có ảnh biên lai chuyển khoản.');
      await manager.getRepository(RefundPayment).save({
        refundId: id,
        shiftId: null,
        reference: dto.reference,
        amount: Number(refund.approvedAmount),
        channel: 'BANK_TRANSFER',
        evidenceReference: dto.evidence_reference,
        evidenceType: 'BANK_RECEIPT_SLIP',
        status: 'COMPLETED',
      });
    });
  }

  async recordCash(id: string, dto: RecordCashRefundDto, actor: BillingActor) {
    if (actor.role !== 'FRONT_DESK_STAFF') throw new ForbiddenException();
    return this.recordManualRefund(id, actor, async (manager, refund) => {
      const amount = Number(refund.approvedAmount);
      if (dto.amount !== undefined && dto.amount !== amount) {
        throw new BadRequestException('Số tiền chi phải bằng số tiền hoàn đã duyệt.');
      }
      if (!dto.evidence_reference.trim()) throw new BadRequestException('Bắt buộc có ảnh phiếu chi có chữ ký.');
      const shiftId = await this.shiftCashService.recordRefund(manager, actor.id, amount, dto.reference);
      await manager.getRepository(RefundPayment).save({
        refundId: id,
        shiftId,
        reference: dto.reference,
        amount,
        channel: 'CASH',
        evidenceReference: dto.evidence_reference,
        evidenceType: 'POS_CASH_VOUCHER',
        status: 'COMPLETED',
      });
    });
  }

  private async recordManualRefund(
    id: string,
    actor: BillingActor,
    record: (manager: EntityManager, refund: Refund) => Promise<void>,
  ) {
    return this.transaction(async (manager) => {
      const refund = await this.getRefund(manager, id, true);
      await this.assertBranch(manager, refund, actor);
      if (refund.status !== 'APPROVED') throw new BadRequestException('Refund phải được duyệt trước khi chi trả.');
      await record(manager, refund);
      refund.status = 'COMPLETED';
      return manager.getRepository(Refund).save(refund);
    });
  }

  private async getRefund(manager: EntityManager, id: string, lock = false) {
    const refund = await manager.getRepository(Refund).findOne({
      where: { refundId: id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!refund) throw new NotFoundException('Không tìm thấy refund.');
    return refund;
  }

  private async assertBranch(manager: EntityManager, refund: Refund, actor: BillingActor) {
    if (!actor.branchId) throw new ForbiddenException('Tài khoản chưa được gán chi nhánh.');
    const cancellation = await manager.getRepository(Cancellation).findOne({
      where: { cancellationId: refund.cancellationId },
    });
    if (!cancellation) throw new NotFoundException('Không tìm thấy yêu cầu hủy liên quan.');
    if (cancellation.branchId !== actor.branchId) throw new ForbiddenException();
  }

  private refundRate(noticeHours: number): number {
    if (noticeHours >= 24) return 0.8;
    if (noticeHours >= 12) return 0.5;
    if (noticeHours >= 6) return 0.3;
    return 0;
  }

  private async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await work(runner.manager);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}