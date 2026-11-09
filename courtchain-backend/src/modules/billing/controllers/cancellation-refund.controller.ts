import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ApproveRefundDto,
  ExecuteVnPayRefundDto,
  RecordBankRefundDto,
  RecordCashRefundDto,
  ReviewCancellationDto,
} from '../dto/cancellation-refund.dto';
import { BillingActor, CancellationRefundService } from '../services/cancellation-refund.service';

type AuthenticatedRequest = Request & { user: BillingActor };

@Controller('api/v1/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CancellationRefundController {
  constructor(private readonly service: CancellationRefundService) {}

  @Get('cancellations')
  @Roles('FACILITY_MANAGER')
  listCancellations(@Req() req: AuthenticatedRequest) {
    return this.service.listCancellations(req.user.branchId || '');
  }

  @Patch('cancellations/:id/review')
  @Roles('FACILITY_MANAGER')
  reviewCancellation(@Param('id') id: string, @Body() dto: ReviewCancellationDto, @Req() req: AuthenticatedRequest) {
    return this.service.reviewCancellation(id, dto, req.user);
  }

  @Get('refunds')
  @Roles('FACILITY_MANAGER', 'COURT_OWNER', 'FRONT_DESK_STAFF')
  listRefunds(@Req() req: AuthenticatedRequest) {
    return this.service.listRefunds(req.user.branchId || '');
  }

  @Patch('refunds/:id/approve')
  @Roles('FACILITY_MANAGER', 'COURT_OWNER')
  approveRefund(@Param('id') id: string, @Body() dto: ApproveRefundDto, @Req() req: AuthenticatedRequest) {
    return this.service.approveRefund(id, dto, req.user);
  }

  @Post('refunds/:id/execute-vnpay')
  @Roles('FACILITY_MANAGER', 'COURT_OWNER')
  executeVnPay(@Param('id') id: string, @Body() dto: ExecuteVnPayRefundDto, @Req() req: AuthenticatedRequest) {
    return this.service.executeVnPayRefund(id, dto, req.user);
  }

  @Post('refunds/:id/record-bank-transfer')
  @Roles('COURT_OWNER')
  recordBankTransfer(@Param('id') id: string, @Body() dto: RecordBankRefundDto, @Req() req: AuthenticatedRequest) {
    return this.service.recordBankTransfer(id, dto, req.user);
  }

  @Post('refunds/:id/record-cash')
  @Roles('FRONT_DESK_STAFF')
  recordCash(@Param('id') id: string, @Body() dto: RecordCashRefundDto, @Req() req: AuthenticatedRequest) {
    return this.service.recordCash(id, dto, req.user);
  }
}