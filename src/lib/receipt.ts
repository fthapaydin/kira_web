import {
  formatCurrency,
  formatDate,
  getTenantDisplayAddress,
  getTenantFullName,
} from './formatters';
import type { Payment, Tenant } from '../types/api';

export function toWhatsAppDigits(rawPhone: string): string {
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = `90${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('5')) {
    digits = `90${digits}`;
  } else if (!digits.startsWith('90') && digits.length > 0) {
    digits = `90${digits}`;
  }
  return digits;
}

export function getReceiptNumber(tenant: Tenant, payment: Payment): string {
  const year = payment.paymentDate
    ? new Date(payment.paymentDate).getFullYear()
    : new Date(tenant.startDate).getFullYear();
  const tenantPart = String(tenant.id).padStart(4, '0');
  const monthPart = String(payment.month).padStart(2, '0');
  return `MKB-${year}-${tenantPart}-${monthPart}`;
}

export function getInstallmentDueDate(tenant: Tenant, month: number): Date {
  const start = new Date(tenant.startDate);
  return new Date(start.getFullYear(), start.getMonth() + month - 1, start.getDate());
}

export function buildReceiptText(
  tenant: Tenant,
  payment: Payment,
  landlordName?: string,
  landlordIban?: string,
): string {
  const receiptNo = getReceiptNumber(tenant, payment);
  const due = getInstallmentDueDate(tenant, payment.month);
  const periodLabel = new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
  }).format(due);
  const paidAmount =
    payment.paidAmount && payment.paidAmount > 0 ? payment.paidAmount : payment.amount;
  const paidDate = payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(new Date());
  const address = getTenantDisplayAddress(tenant);

  const lines = [
    'KİRA TAHSİLAT MAKBUZU',
    `Makbuz No: ${receiptNo}`,
    '────────────────────',
    `Kiracı: ${getTenantFullName(tenant)}`,
  ];
  if (address !== '—') {
    lines.push(`Mülk / Daire: ${address}`);
  }
  lines.push(
    `Dönem: ${payment.month}. Taksit (${periodLabel})`,
    `Tahsil Edilen: ${formatCurrency(paidAmount)}`,
    'Durum: Tahsil Edildi',
    `Tahsilat Tarihi: ${paidDate}`,
  );
  if (landlordName?.trim()) {
    lines.push(`Mülk Sahibi: ${landlordName.trim()}`);
  }
  if (landlordIban?.trim()) {
    lines.push(`IBAN: ${landlordIban.trim()}`);
  }
  lines.push('────────────────────', 'Kira Takip ile oluşturulmuştur.');
  return lines.join('\n');
}

export function buildWhatsAppReceiptUrl(
  tenant: Tenant,
  payment: Payment,
  landlordName?: string,
  landlordIban?: string,
): string {
  const text = encodeURIComponent(
    buildReceiptText(tenant, payment, landlordName, landlordIban),
  );
  const digits = tenant.phone ? toWhatsAppDigits(tenant.phone) : '';
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function openPrintablePdfReceipt(
  tenant: Tenant,
  payment: Payment,
  landlordName?: string,
  landlordIban?: string,
): void {
  const receiptNo = getReceiptNumber(tenant, payment);
  const due = getInstallmentDueDate(tenant, payment.month);
  const periodLabel = new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
  }).format(due);
  const paidAmount =
    payment.paidAmount && payment.paidAmount > 0 ? payment.paidAmount : payment.amount;
  const paidDate = payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(new Date());
  const address = getTenantDisplayAddress(tenant);

  const win = window.open('', '_blank', 'width=720,height=860');
  if (!win) return;

  const esc = (s: string) =>
    s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  win.document.write(`<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Kira Makbuzu - ${esc(receiptNo)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F0F4F7; margin: 0; padding: 36px; color: #13161D; }
    .card { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #DDE3E9; border-radius: 18px; padding: 32px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .title { font-size: 16px; font-weight: 700; letter-spacing: 0.4px; margin: 0; }
    .no { font-size: 12px; color: #5A6372; margin-top: 4px; font-family: monospace; }
    .badge { background: rgba(0,186,124,0.12); color: #00BA7C; border: 1px solid rgba(0,186,124,0.35); border-radius: 999px; padding: 5px 12px; font-size: 11px; font-weight: 700; }
    .amount-box { margin: 24px 0; padding: 20px; background: #F0F4F7; border-radius: 14px; text-align: center; }
    .amount-label { font-size: 12px; color: #5A6372; }
    .amount { font-size: 32px; font-weight: 700; color: #00BA7C; margin-top: 6px; }
    .row { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #E1E8EF; font-size: 13.5px; }
    .row:last-of-type { border-bottom: none; }
    .label { color: #5A6372; }
    .val { font-weight: 600; text-align: right; }
    .foot { margin-top: 24px; padding-top: 16px; border-top: 1px solid #E1E8EF; font-size: 11px; color: #8E9AAA; text-align: center; }
    .actions { max-width: 560px; margin: 18px auto 0; text-align: center; }
    .btn { background: #1DA1F2; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; } .actions { display: none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <div>
        <h1 class="title">KİRA TAHSİLAT MAKBUZU</h1>
        <div class="no">${esc(receiptNo)}</div>
      </div>
      <div class="badge">TAHSİL EDİLDİ</div>
    </div>
    <div class="amount-box">
      <div class="amount-label">Tahsil Edilen Tutar</div>
      <div class="amount">${esc(formatCurrency(paidAmount))}</div>
    </div>
    <div class="row"><span class="label">Kiracı</span><span class="val">${esc(getTenantFullName(tenant))}</span></div>
    ${address !== '—' ? `<div class="row"><span class="label">Mülk / Daire</span><span class="val">${esc(address)}</span></div>` : ''}
    <div class="row"><span class="label">Dönem</span><span class="val">${payment.month}. Taksit (${esc(periodLabel)})</span></div>
    <div class="row"><span class="label">Vade Tarihi</span><span class="val">${esc(formatDate(due))}</span></div>
    <div class="row"><span class="label">Tahsilat Tarihi</span><span class="val">${esc(paidDate)}</span></div>
    ${landlordName?.trim() ? `<div class="row"><span class="label">Mülk Sahibi</span><span class="val">${esc(landlordName.trim())}</span></div>` : ''}
    ${landlordIban?.trim() ? `<div class="row"><span class="label">IBAN</span><span class="val" style="font-family:monospace;font-size:12px">${esc(landlordIban.trim())}</span></div>` : ''}
    <div class="foot">Bu makbuz Kira Takip uygulaması üzerinden bilgilendirme amaçlı oluşturulmuştur.</div>
  </div>
  <div class="actions">
    <button class="btn" onclick="window.print()">PDF Olarak Kaydet / Yazdır</button>
  </div>
</body>
</html>`);
  win.document.close();
}
