// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import axios, { type AxiosAdapter, type AxiosResponse } from 'axios';

const demoStorageKey = 'courtchain-refund-demo-v1';

type DemoState = {
  cancellations: Array<Record<string, any>>;
  refunds: Array<Record<string, any>>;
};

function initialDemoState(): DemoState {
  return {
    cancellations: [
      {
        cancellationId: 'CAN-1001',
        bookingId: 'BK-2048',
        status: 'REQUESTED',
        decisionReason: null,
        details: [
          { cancellationDetailId: 'CD-1', bookingSessionId: 'SES-1', noticeHours: 30, refundBase: 500000, refundRate: 0, approvedRefund: 0, status: 'PENDING' },
          { cancellationDetailId: 'CD-2', bookingSessionId: 'SES-2', noticeHours: 9, refundBase: 300000, refundRate: 0, approvedRefund: 0, status: 'PENDING' },
        ],
      },
      {
        cancellationId: 'CAN-1002',
        bookingId: 'BK-2051',
        status: 'UNDER_REVIEW',
        decisionReason: null,
        details: [
          { cancellationDetailId: 'CD-3', bookingSessionId: 'SES-3', noticeHours: 15, refundBase: 600000, refundRate: 0, approvedRefund: 0, status: 'PENDING' },
        ],
      },
    ],
    refunds: [
      { refundId: 'REF-2001', cancellationId: 'CAN-0998', reason: 'Đã duyệt hủy booking BK-1998', requestedAmount: 450000, approvedAmount: 0, status: 'PENDING' },
      { refundId: 'REF-2002', cancellationId: 'CAN-0996', reason: 'Đã duyệt hủy booking BK-1996', requestedAmount: 720000, approvedAmount: 720000, status: 'APPROVED' },
      { refundId: 'REF-2003', cancellationId: 'CAN-0994', reason: 'Đã duyệt hủy booking BK-1994', requestedAmount: 250000, approvedAmount: 250000, status: 'COMPLETED' },
    ],
  };
}

function readDemoState(): DemoState {
  const saved = localStorage.getItem(demoStorageKey);
  if (saved) {
    try {
      return JSON.parse(saved) as DemoState;
    } catch {
      localStorage.removeItem(demoStorageKey);
    }
  }
  const state = initialDemoState();
  localStorage.setItem(demoStorageKey, JSON.stringify(state));
  return state;
}

function persistDemoState(state: DemoState) {
  localStorage.setItem(demoStorageKey, JSON.stringify(state));
}

const demoAdapter: AxiosAdapter = async (config) => {
  const state = readDemoState();
  const method = (config.method || 'get').toUpperCase();
  const path = config.url || '';
  const requestBody = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {};
  let data: unknown;
  let status = 200;

  if (method === 'GET' && path.endsWith('/billing/cancellations')) {
    data = state.cancellations;
  } else if (method === 'GET' && path.endsWith('/billing/refunds')) {
    data = state.refunds;
  } else {
    const cancellationReview = path.match(/\/billing\/cancellations\/([^/]+)\/review$/);
    const refundAction = path.match(/\/billing\/refunds\/([^/]+)\/(approve|execute-vnpay|record-bank-transfer|record-cash)$/);

    if (method === 'PATCH' && cancellationReview) {
      const cancellation = state.cancellations.find((item) => item.cancellationId === cancellationReview[1]);
      if (!cancellation) status = 404;
      else if (requestBody.decision === 'REJECT') {
        cancellation.status = 'REJECTED';
        cancellation.decisionReason = requestBody.decision_reason || '';
      } else {
        let total = 0;
        for (const detail of cancellation.details) {
          const hours = Number(detail.noticeHours);
          const rate = hours >= 24 ? 0.8 : hours >= 12 ? 0.5 : hours >= 6 ? 0.3 : 0;
          detail.refundRate = rate;
          detail.approvedRefund = Math.floor(Number(detail.refundBase) * rate);
          detail.status = 'APPROVED';
          total += detail.approvedRefund;
        }
        cancellation.status = 'APPROVED';
        state.refunds.unshift({
          refundId: `REF-${Date.now()}`,
          cancellationId: cancellation.cancellationId,
          reason: `Đã duyệt hủy booking ${cancellation.bookingId}`,
          requestedAmount: total,
          approvedAmount: 0,
          status: 'PENDING',
        });
      }
      data = cancellation;
    } else if (method === 'PATCH' && refundAction?.[2] === 'approve') {
      const refund = state.refunds.find((item) => item.refundId === refundAction[1]);
      if (!refund || refund.status !== 'PENDING') status = 400;
      else {
        refund.approvedAmount = refund.requestedAmount;
        refund.status = 'APPROVED';
        data = refund;
      }
    } else if (method === 'POST' && refundAction && ['execute-vnpay', 'record-bank-transfer', 'record-cash'].includes(refundAction[2])) {
      const refund = state.refunds.find((item) => item.refundId === refundAction[1]);
      if (!refund || refund.status !== 'APPROVED') status = 400;
      else {
        refund.status = 'COMPLETED';
        data = refund;
      }
    } else {
      status = 404;
      data = { message: 'Demo API route not found.' };
    }
  }

  persistDemoState(state);
  const response: AxiosResponse = {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  };
  if (status >= 400) throw new axios.AxiosError(`Demo request failed (${status})`, undefined, config, undefined, response);
  return response;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  adapter: import.meta.env.VITE_DEMO_MODE === 'false' ? undefined : demoAdapter,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiClient;