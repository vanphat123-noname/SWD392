// Name: Lê Văn Phát ; ngày edit : 2026-11-09
import { FormEvent, useEffect, useState } from 'react';
import { refundService } from '../../services/refund.service';
import type { CancellationRecord, RefundRecord } from '../../types/billing.types';

type Tab = 'cancellations' | 'approval' | 'vnpay' | 'bank' | 'cash';
const tabs: { id: Tab; label: string }[] = [
  { id: 'cancellations', label: 'Duyệt hủy' },
  { id: 'approval', label: 'Duyệt hoàn tiền' },
  { id: 'vnpay', label: 'Hoàn VNPay' },
  { id: 'bank', label: 'Chuyển khoản' },
  { id: 'cash', label: 'Tiền mặt' },
];
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

export default function RefundManagementPage() {
  const [tab, setTab] = useState<Tab>('cancellations');
  const [cancellations, setCancellations] = useState<CancellationRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [selected, setSelected] = useState<RefundRecord | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    const [cancellationData, refundData] = await Promise.all([
      refundService.listCancellations(),
      refundService.listRefunds(),
    ]);
    setCancellations(cancellationData);
    setRefunds(refundData);
  }

  useEffect(() => {
    load().catch(() => setNotice('Không thể tải dữ liệu hoàn tiền.'));
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setNotice('');
    try {
      await action();
      await load();
      setSelected(null);
      setCashOpen(false);
      setNotice('Đã cập nhật thành công.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  }

  const actionableRefunds = refunds.filter((refund) =>
    tab === 'approval' ? refund.status === 'PENDING' : refund.status === 'APPROVED',
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-slate-900 sm:px-6">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">CourtChain / Billing</p>
          <h1 className="mt-1 text-2xl font-bold">Hủy sân & hoàn tiền</h1>
          <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">DEMO · dữ liệu lưu trên trình duyệt, không phát sinh giao dịch thật</p>
        </div>
        <button onClick={() => load().catch(() => setNotice('Không thể tải lại dữ liệu.'))}
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Làm mới
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Quản lý hoàn tiền">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.id ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {item.label}
          </button>
        ))}
      </nav>

      {notice && <p role="status" className="my-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{notice}</p>}

      {tab === 'cancellations' ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="p-3">Mã yêu cầu</th><th className="p-3">Booking</th><th className="p-3">Ca chơi</th><th className="p-3">Trạng thái</th><th className="p-3">Quyết định</th></tr>
            </thead>
            <tbody>
              {cancellations.map((item) => <tr key={item.cancellationId} className="border-b">
                <td className="p-3 font-mono text-xs">{item.cancellationId}</td>
                <td className="p-3">{item.bookingId}</td>
                <td className="p-3">{item.details?.length || 0}</td>
                <td className="p-3">{item.status}</td>
                <td className="flex gap-2 p-3">
                  <button disabled={busy || !['REQUESTED', 'UNDER_REVIEW'].includes(item.status)}
                    onClick={() => run(() => refundService.reviewCancellation(item.cancellationId, { decision: 'APPROVE' }))}
                    className="rounded bg-emerald-700 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Duyệt</button>
                  <button disabled={busy || !['REQUESTED', 'UNDER_REVIEW'].includes(item.status)}
                    onClick={() => { const reason = window.prompt('Lý do từ chối:'); if (reason?.trim()) void run(() => refundService.reviewCancellation(item.cancellationId, { decision: 'REJECT', decision_reason: reason })); }}
                    className="rounded border border-rose-300 px-3 py-1.5 font-semibold text-rose-700 disabled:opacity-40">Từ chối</button>
                </td>
              </tr>)}
              {!cancellations.length && <tr><td className="p-6 text-center text-slate-500" colSpan={5}>Không có yêu cầu hủy.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
              <tr><th className="p-3">Mã hoàn tiền</th><th className="p-3">Yêu cầu hủy</th><th className="p-3">Số tiền</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr>
            </thead>
            <tbody>
              {actionableRefunds.map((refund) => <tr key={refund.refundId} className="border-b">
                <td className="p-3 font-mono text-xs">{refund.refundId}</td><td className="p-3 font-mono text-xs">{refund.cancellationId}</td>
                <td className="p-3 font-semibold">{money(refund.approvedAmount || refund.requestedAmount)}</td><td className="p-3">{refund.status}</td>
                <td className="p-3">
                  {tab === 'approval' && <button disabled={busy} onClick={() => run(() => refundService.approveRefund(refund.refundId))} className="rounded bg-emerald-700 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Duyệt hoàn</button>}
                  {tab === 'vnpay' && <button onClick={() => setSelected(refund)} className="rounded border border-slate-300 px-3 py-1.5 font-semibold">Thực hiện VNPay</button>}
                  {tab === 'bank' && <button onClick={() => setSelected(refund)} className="rounded border border-slate-300 px-3 py-1.5 font-semibold">Ghi nhận chuyển khoản</button>}
                  {tab === 'cash' && <button onClick={() => { setSelected(refund); setCashOpen(true); }} className="rounded border border-slate-300 px-3 py-1.5 font-semibold">Chi tiền mặt</button>}
                </td>
              </tr>)}
              {!actionableRefunds.length && <tr><td className="p-6 text-center text-slate-500" colSpan={5}>Không có khoản hoàn tiền phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {selected && !cashOpen && <ActionModal title={tab === 'vnpay' ? 'Hoàn tiền qua VNPay' : 'Ghi nhận chuyển khoản'} busy={busy} onClose={() => setSelected(null)} onSubmit={(event) => {
        event.preventDefault(); const form = new FormData(event.currentTarget); const reference = String(form.get('reference') || '');
        if (tab === 'vnpay') void run(() => refundService.executeVnPay(selected.refundId, reference));
        else void run(() => refundService.recordBankTransfer(selected.refundId, { reference, evidence_reference: String(form.get('evidence_reference') || '') }));
      }}>
        <label className="block text-sm font-medium">Mã giao dịch {tab === 'vnpay' ? 'gốc' : 'chuyển khoản'}<input name="reference" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" /></label>
        {tab === 'bank' && <label className="mt-4 block text-sm font-medium">Tham chiếu ảnh biên lai<input name="evidence_reference" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="URL hoặc storage key" /></label>}
      </ActionModal>}

      {cashOpen && selected && <CashModal busy={busy} onClose={() => setCashOpen(false)} onSubmit={(event) => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        void run(() => refundService.recordCash(selected.refundId, { reference: String(form.get('reference') || ''), evidence_reference: String(form.get('evidence_reference') || '') }));
      }} />}
    </main>
  );
}

function ActionModal({ title, busy, onClose, onSubmit, children }: {
  title: string; busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: React.ReactNode;
}) {
  return <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-4" role="presentation">
    <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng" className="px-2 text-xl">×</button></div>
      {children}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded border px-3 py-2">Hủy</button><button disabled={busy} className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Xác nhận</button></div>
    </form>
  </div>;
}

function CashModal({ busy, onClose, onSubmit }: {
  busy: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <ActionModal title="Chi tiền mặt tại quầy" busy={busy} onClose={onClose} onSubmit={onSubmit}>
    <label className="block text-sm font-medium">Mã phiếu chi<input name="reference" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" /></label>
    <label className="mt-4 block text-sm font-medium">Tham chiếu ảnh phiếu chi có chữ ký<input name="evidence_reference" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="URL hoặc storage key" /></label>
    <p className="mt-3 text-xs text-slate-500">Số tiền và số dư két ca được xác minh tại máy chủ.</p>
  </ActionModal>;
}