import type { AuthUser, Payment, Tenant } from '../types/api';

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatDate(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatPhone10(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join(' ');
}

export function stripDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function getTenantFullName(tenant: Pick<Tenant, 'name' | 'surname'>): string {
  return `${tenant.name} ${tenant.surname}`.trim();
}

export function getUserFullName(user: Pick<AuthUser, 'name' | 'surname' | 'email'>): string {
  const full = `${user.name} ${user.surname}`.trim();
  return full || user.email;
}

export function getTenantDisplayAddress(tenant: Tenant): string {
  if (tenant.apartment?.property?.name) {
    const parts = [tenant.apartment.property.name];
    if (tenant.apartment.doorNumber) parts.push(`No: ${tenant.apartment.doorNumber}`);
    if (tenant.apartment.floor) parts.push(`(${tenant.apartment.floor})`);
    return parts.join(' ');
  }
  return tenant.address || '—';
}

export function isPaymentPaid(p: Payment): boolean {
  return p.isPaid || (p.amount > 0 && (p.paidAmount ?? 0) >= p.amount);
}

export function getTenantPaymentStats(tenant: Tenant) {
  const total = tenant.payments.length > 0 ? tenant.payments.length : tenant.contractDuration;
  const paid = tenant.payments.filter(isPaymentPaid).length;
  const collected = tenant.payments.reduce((sum, p) => {
    if (p.paidAmount && p.paidAmount > 0) return sum + p.paidAmount;
    if (p.isPaid) return sum + p.amount;
    return sum;
  }, 0);
  const expected =
    tenant.payments.length > 0
      ? tenant.payments.reduce((sum, p) => sum + p.amount, 0)
      : tenant.rentAmount * tenant.contractDuration;

  return {
    paid,
    total,
    collected,
    expected,
    pending: Math.max(0, expected - collected),
    allCompleted: tenant.payments.length > 0 && paid === tenant.payments.length,
  };
}

export function getContractEndDate(startDate: string, durationMonths: number): Date {
  const start = new Date(startDate);
  return new Date(start.getFullYear(), start.getMonth() + durationMonths, start.getDate());
}

export function getDaysUntilContractEnd(startDate: string, durationMonths: number): number {
  const end = getContractEndDate(startDate, durationMonths);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWorkplaceTenant(type: number | string): boolean {
  return type === 2 || type === 'WORKPLACE';
}
