import { useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';
import {
  formatDate,
  getDaysUntilContractEnd,
  getTenantDisplayAddress,
  getTenantFullName,
  getTenantPaymentStats,
  isPaymentPaid,
} from '../lib/formatters';
import {
  buildReceiptText,
  buildWhatsAppReceiptUrl,
  getReceiptNumber,
  openPrintablePdfReceipt,
} from '../lib/receipt';
import type { Payment, Tenant } from '../types/api';
import { Money } from './Money';

interface TenantDetailDrawerProps {
  tenant: Tenant;
  landlordName?: string;
  updatingPaymentId: number | null;
  isBulkUpdating: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onEvict: () => Promise<void>;
  onDelete: () => Promise<void>;
  onTogglePayment: (payment: Payment) => Promise<void>;
  onBulkCollect: (paymentIds: number[], amount: number) => Promise<void>;
  onNotify: (msg: string) => void;
}

export function TenantDetailDrawer({
  tenant,
  landlordName,
  updatingPaymentId,
  isBulkUpdating,
  onClose,
  onEdit,
  onRenew,
  onEvict,
  onDelete,
  onTogglePayment,
  onBulkCollect,
  onNotify,
}: TenantDetailDrawerProps) {
  const { prefs } = usePreferences();
  const [confirmAction, setConfirmAction] = useState<'evict' | 'delete' | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const stats = getTenantPaymentStats(tenant);
  const daysLeft = getDaysUntilContractEnd(tenant.startDate, tenant.contractDuration);
  const isAllPaid = !tenant.isArchived && stats.allCompleted;
  const isEndingSoonOrExpired =
    !tenant.isArchived && !isAllPaid && daysLeft <= prefs.contractWarningDays;
  const isExpired = daysLeft < 0;

  const sortedPayments = [...tenant.payments].sort((a, b) => a.month - b.month);
  const unpaidPayments = sortedPayments.filter((p) => !isPaymentPaid(p));

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setIsMutating(true);
    try {
      if (confirmAction === 'evict') {
        await onEvict();
      } else {
        await onDelete();
      }
      setConfirmAction(null);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleBulkSubmit() {
    if (selectedIds.length === 0) return;
    const first = sortedPayments.find((p) => p.id === selectedIds[0]);
    await onBulkCollect(selectedIds, first?.amount ?? tenant.rentAmount);
    setSelectedIds([]);
  }

  function handleCopyReceipt(payment: Payment) {
    const text = buildReceiptText(
      tenant,
      payment,
      landlordName,
      prefs.landlordIban,
    );
    navigator.clipboard.writeText(text).then(() => {
      onNotify('Makbuz metni kopyalandı.');
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-paper h-full shadow-2xl border-l border-hairline flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-divider flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                tenant.isArchived
                  ? 'bg-variant text-ink-muted'
                  : 'bg-accent-soft text-accent'
              }`}
            >
              {tenant.isArchived ? 'Eski Kiracı' : 'Aktif Sözleşme'}
            </span>
            <h2 className="mt-1.5 text-[19px] font-bold text-ink truncate">
              {getTenantFullName(tenant)}
            </h2>
            <p className="text-[12.5px] text-ink-muted mt-0.5 truncate">
              {getTenantDisplayAddress(tenant)}
              {tenant.phone ? ` · ${tenant.phone}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg border border-hairline text-[12px] text-ink-muted hover:text-ink cursor-pointer"
          >
            Kapat
          </button>
        </div>

        {/* Action Strip */}
        <div className="px-6 py-2.5 border-b border-divider bg-canvas/60 flex flex-wrap items-center gap-2">
          {!tenant.isArchived && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 rounded-lg border border-hairline bg-paper text-[12px] font-medium text-ink hover:border-accent cursor-pointer"
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={onRenew}
                className="px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-[12px] font-semibold hover:bg-accent hover:text-white transition-colors cursor-pointer"
              >
                Sözleşme Yenile
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction('evict')}
                className="px-3 py-1.5 rounded-lg border border-hairline bg-paper text-[12px] font-medium text-ink-muted hover:text-danger hover:border-danger/40 cursor-pointer"
              >
                Kiracıyı Çıkar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setConfirmAction('delete')}
            className="ml-auto px-3 py-1.5 rounded-lg text-[12px] font-medium text-danger hover:bg-danger-soft cursor-pointer"
          >
            Sil
          </button>
        </div>

        {/* Inline 2-step Confirm Banner (Evict / Delete) */}
        {confirmAction && (
          <div className="mx-6 mt-4 p-4 rounded-xl border border-danger/35 bg-danger-soft space-y-3">
            <div className="text-[13.5px] font-bold text-danger">
              {confirmAction === 'evict'
                ? 'Kiracıyı çıkarmak istediğinize emin misiniz?'
                : 'Kiracı kaydını kalıcı olarak silmek istiyor musunuz?'}
            </div>
            <p className="text-[12.5px] text-ink-muted leading-relaxed">
              {confirmAction === 'evict'
                ? 'Kiracı Eski Kiracılar listesine taşınır ve bağlı daire boş duruma getirilir.'
                : 'Bu işlem geri alınamaz ve kiracıya ait tüm ödeme geçmişi silinir.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setConfirmAction(null)}
                className="px-3.5 py-1.5 rounded-lg border border-hairline bg-paper text-[12px] font-medium text-ink cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleConfirm}
                className="px-3.5 py-1.5 rounded-lg bg-danger text-white text-[12px] font-semibold disabled:opacity-60 cursor-pointer"
              >
                {isMutating
                  ? 'İşleniyor...'
                  : confirmAction === 'evict'
                    ? 'Evet, Çıkar'
                    : 'Evet, Sil'}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Mobile-Matched Contract Completed Banner */}
          {isAllPaid && (
            <div className="p-4 rounded-2xl bg-paid-soft border border-paid/35 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-bold text-paid">
                  Tüm Ödemeler Tamamlandı
                </span>
                <span className="px-2 py-0.5 rounded-full bg-paid/15 font-mono text-[11px] font-bold text-paid">
                  {stats.paid}/{stats.total}
                </span>
              </div>
              <p className="text-[12.5px] text-ink-muted">
                Bu sözleşmenin tüm kira ödemeleri tahsil edildi. Yeni sözleşme imzalayabilir
                veya kiracıyı çıkarabilirsiniz.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onRenew}
                  className="px-3.5 py-2 rounded-xl bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover cursor-pointer"
                >
                  Yeni Sözleşme İmzala
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('evict')}
                  className="px-3.5 py-2 rounded-xl border border-danger/35 bg-paper text-danger text-[12.5px] font-semibold hover:bg-danger-soft cursor-pointer"
                >
                  Kiracıyı Çıkar
                </button>
              </div>
            </div>
          )}

          {/* Expired / Ending Soon Banner */}
          {isEndingSoonOrExpired && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                isExpired
                  ? 'bg-danger-soft border-danger/30'
                  : 'bg-warn-soft border-warn/30'
              }`}
            >
              <div>
                <div
                  className={`text-[13.5px] font-bold ${
                    isExpired ? 'text-danger' : 'text-warn'
                  }`}
                >
                  {isExpired ? 'Sözleşme Süresi Doldu' : 'Sözleşme Bitişine Yaklaşıyor'}
                </div>
                <p className="text-[12px] text-ink-muted mt-0.5">
                  {isExpired
                    ? `Bitişin üzerinden ${Math.abs(daysLeft)} gün geçti.`
                    : daysLeft === 0
                      ? 'Sözleşme bugün sona eriyor.'
                      : `Sözleşme bitimine ${daysLeft} gün kaldı.`}
                </p>
              </div>
              <button
                type="button"
                onClick={onRenew}
                className="px-3 py-1.5 rounded-lg bg-paper border border-hairline text-[12px] font-semibold text-ink shrink-0 cursor-pointer"
              >
                Yenile →
              </button>
            </div>
          )}

          {/* 3-Card Stat Strip (Mirrors Mobile TenantDetailStats) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-canvas border border-hairline">
              <p className="text-[10.5px] text-ink-subtle">Aylık Kira</p>
              <p className="font-mono text-[14.5px] font-bold text-ink mt-1">
                <Money amount={tenant.rentAmount} />
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-canvas border border-hairline">
              <p className="text-[10.5px] text-ink-subtle">Ödeme</p>
              <p
                className={`font-mono text-[14.5px] font-bold tabular-nums mt-1 ${
                  isAllPaid ? 'text-paid' : 'text-warn'
                }`}
              >
                {stats.paid}/{stats.total}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-canvas border border-hairline">
              <p className="text-[10.5px] text-ink-subtle">Depozito</p>
              <p className="font-mono text-[14.5px] font-bold text-ink mt-1">
                <Money amount={tenant.depositAmount} />
              </p>
            </div>
          </div>

          {/* Optional Receipt Preview Card when user clicks "Makbuz" */}
          {receiptPayment && (
            <div className="p-4 rounded-2xl bg-canvas border border-paid/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold text-ink">
                    Tahsilat Makbuzu · {receiptPayment.month}. Taksit
                  </div>
                  <div className="font-mono text-[11px] text-ink-subtle">
                    {getReceiptNumber(tenant, receiptPayment)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptPayment(null)}
                  className="text-[11.5px] text-ink-muted hover:text-ink cursor-pointer"
                >
                  Kapat
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={buildWhatsAppReceiptUrl(
                    tenant,
                    receiptPayment,
                    landlordName,
                    prefs.landlordIban,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-[12.5px] font-semibold hover:opacity-90"
                >
                  WhatsApp Gönder
                </a>
                <button
                  type="button"
                  onClick={() =>
                    openPrintablePdfReceipt(
                      tenant,
                      receiptPayment,
                      landlordName,
                      prefs.landlordIban,
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover cursor-pointer"
                >
                  PDF / Yazdır
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyReceipt(receiptPayment)}
                  className="px-3.5 py-2 rounded-xl border border-hairline bg-paper text-[12.5px] font-medium text-ink cursor-pointer"
                >
                  Metni Kopyala
                </button>
              </div>
            </div>
          )}

          {/* Installments Section Header + Bulk Collect */}
          <div className="pt-1 flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-bold text-ink">
              Ödeme Takvimi ({sortedPayments.length} Taksit)
            </h3>
            {unpaidPayments.length > 0 && selectedIds.length > 0 && (
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={handleBulkSubmit}
                className="px-3 py-1.5 rounded-xl bg-paid text-white text-[12px] font-semibold disabled:opacity-60 cursor-pointer"
              >
                {isBulkUpdating
                  ? 'Güncelleniyor...'
                  : `Seçili ${selectedIds.length} Taksiti Tahsil Et`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sortedPayments.map((p) => {
              const paid = isPaymentPaid(p);
              const busy = updatingPaymentId === p.id;
              const checked = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    checked
                      ? 'border-accent bg-accent-soft'
                      : 'border-hairline bg-canvas/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {!paid && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 accent-[#1DA1F2] cursor-pointer"
                        aria-label={`${p.month}. taksiti seç`}
                      />
                    )}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        paid ? 'bg-paid' : 'bg-danger'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink">
                        {p.month}. Taksit
                      </div>
                      <div className="text-[11.5px] text-ink-subtle">
                        {p.paymentDate
                          ? formatDate(p.paymentDate)
                          : paid
                            ? 'Ödendi'
                            : 'Bekleniyor'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Money
                      amount={p.amount}
                      className="font-mono text-[13px] font-semibold text-ink"
                    />
                    {paid && (
                      <button
                        type="button"
                        onClick={() => setReceiptPayment(p)}
                        className="px-2.5 py-1 rounded-lg bg-paid-soft text-paid text-[11.5px] font-semibold hover:opacity-85 cursor-pointer"
                      >
                        Makbuz
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onTogglePayment(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        paid
                          ? 'border border-hairline bg-paper text-ink-muted hover:text-danger hover:border-danger/40'
                          : 'bg-accent text-white hover:bg-accent-hover'
                      }`}
                    >
                      {busy ? '...' : paid ? 'Geri Al' : 'Tahsil Et'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
