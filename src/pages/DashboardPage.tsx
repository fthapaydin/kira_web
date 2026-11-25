import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { MiniProgressRing } from '../components/MiniProgressRing';
import { Money } from '../components/Money';
import { ApartmentFormModal, PropertyFormModal } from '../components/PropertyModals';
import { SettingsPanel } from '../components/SettingsPanel';
import { TenantDetailDrawer } from '../components/TenantDetailDrawer';
import { TenantFormModal } from '../components/TenantFormModal';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import {
  ApiError,
  bulkUpdatePaymentsApi,
  deleteTenantApi,
  fetchApartmentsApi,
  fetchPropertiesApi,
  fetchTenantsApi,
  fetchUserStatsApi,
  updatePaymentApi,
  updateTenantApi,
} from '../lib/api';
import {
  formatDate,
  getContractEndDate,
  getDaysUntilContractEnd,
  getTenantDisplayAddress,
  getTenantFullName,
  getTenantPaymentStats,
  getUserFullName,
  isPaymentPaid,
  isWorkplaceTenant,
} from '../lib/formatters';
import type {
  Apartment,
  Payment,
  Property,
  Tenant,
  UserStatsResponse,
} from '../types/api';

type PanelSection = 'overview' | 'tenants' | 'properties' | 'calculator' | 'settings';

const NAV_ITEMS: { key: PanelSection; label: string }[] = [
  { key: 'overview', label: 'Genel Bakış' },
  { key: 'tenants', label: 'Kiracılarım' },
  { key: 'properties', label: 'Mülk & Kazanç' },
  { key: 'calculator', label: 'Kira Hesaplayıcı' },
  { key: 'settings', label: 'Ayarlar' },
];

type TenantModalState =
  | {
      mode: 'create' | 'edit' | 'renew';
      sourceTenant?: Tenant | null;
      initialPropertyId?: number | null;
      initialApartmentId?: number | null;
      initialNewRent?: number | null;
    }
  | null;

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { prefs, toggleHideAmounts } = usePreferences();
  const navigate = useNavigate();

  const [section, setSection] = useState<PanelSection>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTenants, setActiveTenants] = useState<Tenant[]>([]);
  const [archivedTenants, setArchivedTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);

  // Filters & interactive states
  const [tenantTab, setTenantTab] = useState<'active' | 'archived'>('active');
  const [tenantTypeFilter, setTenantTypeFilter] = useState<'all' | 'house' | 'business'>('all');
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedApartmentFilter, setSelectedApartmentFilter] = useState<number | null>(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyUnitStatus, setPropertyUnitStatus] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // Modals
  const [tenantModal, setTenantModal] = useState<TenantModalState>(null);
  const [propertyModal, setPropertyModal] = useState<{ open: boolean; editing?: Property | null }>({
    open: false,
  });
  const [apartmentModalProperty, setApartmentModalProperty] = useState<Property | null>(null);

  // Mutations & feedback
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [calcRates, setCalcRates] = useState<Record<number, number>>({});

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [active, archived, props, apts, userStats] = await Promise.all([
          fetchTenantsApi({ isArchived: false, size: 100 }),
          fetchTenantsApi({ isArchived: true, size: 100 }),
          fetchPropertiesApi(),
          fetchApartmentsApi(),
          fetchUserStatsApi().catch(() => null),
        ]);
        setActiveTenants(active);
        setArchivedTenants(archived);
        setProperties(props);
        setApartments(apts);
        setStats(userStats);
        setSelectedPropertyId((prev) =>
          prev && props.some((p) => p.id === prev) ? prev : props[0]?.id ?? null,
        );
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          logout();
          navigate('/giris', { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.');
      } finally {
        setIsLoading(false);
      }
    },
    [logout, navigate],
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const allTenants = useMemo(
    () => [...activeTenants, ...archivedTenants],
    [activeTenants, archivedTenants],
  );

  const selectedTenant = useMemo(
    () => allTenants.find((t) => t.id === selectedTenantId) ?? null,
    [allTenants, selectedTenantId],
  );

  const occupiedCount = useMemo(
    () => apartments.filter((a) => a.isOccupied).length,
    [apartments],
  );

  const occupancyPercent = useMemo(
    () => (apartments.length > 0 ? Math.round((occupiedCount / apartments.length) * 100) : 0),
    [apartments.length, occupiedCount],
  );

  const portfolioBreakdown = useMemo(() => {
    let houseMonthly = 0;
    let businessMonthly = 0;
    let houseCount = 0;
    let businessCount = 0;
    const byProp = new Map<string, number>();

    for (const t of activeTenants) {
      if (isWorkplaceTenant(t.type)) {
        businessMonthly += t.rentAmount;
        businessCount++;
      } else {
        houseMonthly += t.rentAmount;
        houseCount++;
      }
      const propName = t.apartment?.property?.name || 'Diğer';
      byProp.set(propName, (byProp.get(propName) ?? 0) + t.rentAmount);
    }

    const totalMonthly = houseMonthly + businessMonthly;
    const houseShare = totalMonthly > 0 ? Math.round((houseMonthly / totalMonthly) * 100) : 0;
    const topProperties = [...byProp.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      houseMonthly,
      businessMonthly,
      houseCount,
      businessCount,
      totalMonthly,
      houseShare,
      topProperties,
    };
  }, [activeTenants]);

  const computedTotals = useMemo(() => {
    let collected = 0;
    let pending = 0;
    let expected = 0;
    for (const t of allTenants) {
      const s = getTenantPaymentStats(t);
      collected += s.collected;
      pending += s.pending;
      expected += s.expected;
    }
    return { collected, pending, expected };
  }, [allTenants]);

  const filteredTenants = useMemo(() => {
    const source = tenantTab === 'active' ? activeTenants : archivedTenants;
    const q = tenantSearch.trim().toLowerCase();
    return source.filter((t) => {
      if (tenantTypeFilter === 'house' && isWorkplaceTenant(t.type)) return false;
      if (tenantTypeFilter === 'business' && !isWorkplaceTenant(t.type)) return false;
      if (!q) return true;
      const name = getTenantFullName(t).toLowerCase();
      const addr = getTenantDisplayAddress(t).toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
  }, [tenantTab, tenantTypeFilter, activeTenants, archivedTenants, tenantSearch]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) ?? properties[0] ?? null,
    [properties, selectedPropertyId],
  );

  const activeTenantById = useMemo(() => {
    const m = new Map<number, Tenant>();
    for (const t of activeTenants) m.set(t.id, t);
    return m;
  }, [activeTenants]);

  const propertyDetails = useMemo(() => {
    if (!selectedProperty) {
      return {
        apts: [] as Apartment[],
        visibleAptsCount: 0,
        floorGroups: [] as [string, Apartment[]][],
        records: [] as Tenant[],
        collected: 0,
        pending: 0,
        aptEarnings: new Map<number, number>(),
      };
    }

    const apts = apartments.filter((a) => a.property?.id === selectedProperty.id);
    const aptIds = new Set(apts.map((a) => a.id));

    const q = propertySearch.trim().toLowerCase();
    const visibleApts = apts.filter((apt) => {
      if (propertyUnitStatus === 'occupied' && !apt.isOccupied) return false;
      if (propertyUnitStatus === 'vacant' && apt.isOccupied) return false;
      if (!q) return true;
      return (
        (apt.doorNumber ?? '').toLowerCase().includes(q) ||
        (apt.floor ?? '').toLowerCase().includes(q) ||
        (apt.roomCount ?? '').toLowerCase().includes(q) ||
        (apt.tenantName ?? '').toLowerCase().includes(q)
      );
    });

    const map = new Map<string, Apartment[]>();
    for (const apt of visibleApts) {
      const rawFloor = apt.floor?.trim() ?? '';
      const floorName = rawFloor ? (rawFloor.toLowerCase().includes('kat') ? rawFloor : `${rawFloor}. Kat`) : 'Zemin / Giriş';
      const list = map.get(floorName) ?? [];
      list.push(apt);
      map.set(floorName, list);
    }
    const floorGroups = [...map.entries()].sort((a, b) => {
      const numA = parseInt(a[0].match(/-?\d+/)?.[0] ?? '', 10);
      const numB = parseInt(b[0].match(/-?\d+/)?.[0] ?? '', 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numB - numA;
      return b[0].localeCompare(a[0], 'tr');
    });

    const allPropRecords = allTenants
      .filter(
        (t) =>
          t.apartment &&
          (t.apartment.property?.id === selectedProperty.id || aptIds.has(t.apartment.id)),
      )
      .sort((a, b) => {
        if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });

    const aptEarnings = new Map<number, number>();
    for (const r of allPropRecords) {
      const id = r.apartment?.id;
      if (id) {
        const s = getTenantPaymentStats(r);
        aptEarnings.set(id, (aptEarnings.get(id) ?? 0) + s.collected);
      }
    }

    const records =
      selectedApartmentFilter == null
        ? allPropRecords
        : allPropRecords.filter((r) => r.apartment?.id === selectedApartmentFilter);

    let collected = 0;
    let pending = 0;
    for (const r of records) {
      const s = getTenantPaymentStats(r);
      collected += s.collected;
      pending += s.pending;
    }

    return {
      apts,
      visibleAptsCount: visibleApts.length,
      floorGroups,
      records,
      collected,
      pending,
      aptEarnings,
    };
  }, [selectedProperty, apartments, allTenants, selectedApartmentFilter, propertySearch, propertyUnitStatus]);

  const sortedForCalculator = useMemo(() => {
    return [...activeTenants].sort(
      (a, b) =>
        getDaysUntilContractEnd(a.startDate, a.contractDuration) -
        getDaysUntilContractEnd(b.startDate, b.contractDuration),
    );
  }, [activeTenants]);

  async function handleTogglePayment(payment: Payment) {
    const currentlyPaid = isPaymentPaid(payment);
    const nextIsPaid = !currentlyPaid;
    setUpdatingPaymentId(payment.id);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      await updatePaymentApi(payment.id, {
        isPaid: nextIsPaid,
        paidAmount: nextIsPaid ? payment.amount : 0,
        paymentDate: nextIsPaid ? todayIso : null,
      });
      await loadAll(true);
      setToast(
        nextIsPaid
          ? `${payment.month}. taksit tahsil edildi olarak işaretlendi.`
          : `${payment.month}. taksit bekliyor durumuna alındı.`,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Ödeme güncellenemedi.');
    } finally {
      setUpdatingPaymentId(null);
    }
  }

  async function handleBulkCollect(ids: number[], amount: number) {
    setIsBulkUpdating(true);
    try {
      await bulkUpdatePaymentsApi({ ids, isPaid: true, paidAmount: amount });
      await loadAll(true);
      setToast(`${ids.length} taksit toplu olarak tahsil edildi.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Toplu güncelleme başarısız.');
    } finally {
      setIsBulkUpdating(false);
    }
  }

  async function handleEvictTenant(tenant: Tenant) {
    const tType: 1 | 2 = isWorkplaceTenant(tenant.type) ? 2 : 1;
    await updateTenantApi(tenant.id, { isArchived: true, type: tType });
    setSelectedTenantId(null);
    await loadAll(true);
    setToast('Kiracı Eski Kiracılar listesine taşındı ve daire boşa çıktı.');
  }

  async function handleDeleteTenant(tenant: Tenant) {
    await deleteTenantApi(tenant.id);
    setSelectedTenantId(null);
    await loadAll(true);
    setToast('Kiracı kaydı silindi.');
  }

  function handleLogout() {
    logout();
    navigate('/giris', { replace: true });
  }

  const displayMonthlyPotential =
    stats?.financialMetrics?.monthlyPotentialIncome ?? portfolioBreakdown.totalMonthly;
  const displayAnnualProjected =
    stats?.financialMetrics?.annualProjectedRevenue ?? displayMonthlyPotential * 12;
  const displayTotalPaid = stats?.financialMetrics?.totalPaid ?? computedTotals.collected;
  const displayTotalDue = stats?.financialMetrics?.totalDue ?? computedTotals.expected;
  const displayOutstanding =
    stats?.financialMetrics?.outstandingBalance ?? computedTotals.pending;
  const overallCollectionPct =
    displayTotalDue > 0
      ? Math.min(100, Math.round((displayTotalPaid / displayTotalDue) * 100))
      : 0;
  const upcomingPayments = stats?.upcomingPayments ?? [];
  const overdueCount = upcomingPayments.filter((p) => p.daysUntilDue < 0).length;
  const compact = prefs.density === 'compact';

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:shrink-0 bg-paper border-b lg:border-b-0 lg:border-r border-hairline flex flex-col justify-between">
        <div>
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-2 border-b border-divider">
            <BrandMark to="/panel" />
            <div className="flex lg:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 py-1.5 rounded-lg border border-hairline bg-canvas text-[11.5px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                {theme === 'light' ? 'Koyu' : 'Açık'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg border border-hairline text-[11.5px] font-medium text-ink-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer"
              >
                Çıkış
              </button>
            </div>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = section === item.key;
              const badgeCount =
                item.key === 'tenants' && !isLoading
                  ? activeTenants.length
                  : item.key === 'properties' && !isLoading
                    ? properties.length
                    : null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSection(item.key)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer text-left ${
                    active
                      ? 'bg-accent text-white shadow-[0_6px_18px_-8px_rgba(29,161,242,0.7)]'
                      : 'text-ink-muted hover:text-ink hover:bg-variant'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <NavIcon section={item.key} active={active} />
                    <span>{item.label}</span>
                  </span>
                  {badgeCount !== null && (
                    <span
                      className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-variant text-ink-subtle'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                  {item.key === 'settings' && prefs.hideAmounts && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? 'bg-white' : 'bg-accent'
                      }`}
                      title="Gizlilik modu aktif"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-5 border-t border-divider space-y-3">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink truncate">
              {user ? getUserFullName(user) : 'Hesap'}
            </p>
            <p className="text-[11.5px] text-ink-subtle truncate">{user?.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="py-2 px-2.5 rounded-xl border border-hairline bg-canvas text-[12px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              {theme === 'light' ? 'Koyu Tema' : 'Açık Tema'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-2.5 rounded-xl border border-hairline text-[12px] font-medium text-ink-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="min-h-16 py-2.5 sm:py-0 px-4 sm:px-8 border-b border-hairline bg-paper/90 backdrop-blur-md sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-[17px] sm:text-[18px] font-bold tracking-[-0.02em] text-ink truncate">
              {NAV_ITEMS.find((n) => n.key === section)?.label}
            </h1>
            {overdueCount > 0 && section === 'overview' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-soft text-danger text-[11.5px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                {overdueCount} Geciken Ödeme
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Global Privacy Blur Quick Toggle */}
            <button
              type="button"
              onClick={toggleHideAmounts}
              title="Tutarları bulanıklaştır / göster (Kısayol: Shift + H)"
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-[12px] sm:text-[12.5px] font-medium transition-all cursor-pointer ${
                prefs.hideAmounts
                  ? 'border-accent/40 bg-accent-soft text-accent font-semibold'
                  : 'border-hairline bg-canvas text-ink-muted hover:text-ink hover:border-accent/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  prefs.hideAmounts ? 'bg-accent' : 'bg-ink-subtle'
                }`}
              />
              <span className="hidden sm:inline">
                {prefs.hideAmounts ? 'Gizlilik Açık' : 'Tutarları Gizle'}
              </span>
              <span className="sm:hidden">
                {prefs.hideAmounts ? 'Gizli' : 'Gizle'}
              </span>
            </button>

            {section === 'properties' ? (
              <button
                type="button"
                onClick={() => setPropertyModal({ open: true, editing: null })}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-accent text-white text-[12.5px] sm:text-[13px] font-semibold hover:bg-accent-hover shadow-[0_6px_16px_-8px_rgba(29,161,242,0.75)] transition-all cursor-pointer whitespace-nowrap"
              >
                + Yeni Mülk
              </button>
            ) : section !== 'settings' ? (
              <button
                type="button"
                onClick={() => setTenantModal({ mode: 'create' })}
                className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-accent text-white text-[12.5px] sm:text-[13px] font-semibold hover:bg-accent-hover shadow-[0_6px_16px_-8px_rgba(29,161,242,0.75)] transition-all cursor-pointer whitespace-nowrap"
              >
                + Yeni Kiracı
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => loadAll()}
              disabled={isLoading}
              className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-hairline bg-canvas text-[12.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? '...' : 'Yenile'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {toast && (
            <div className="px-4 py-3 rounded-xl bg-paper border border-accent/40 shadow-md text-[13.5px] text-ink flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-paid shrink-0" />
                <span>{toast}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-[12px] text-ink-muted hover:text-ink ml-4 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-danger/30 bg-danger-soft text-[13.5px] text-danger flex items-center justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadAll()}
                className="px-3.5 py-1.5 rounded-lg bg-danger text-white text-[12px] font-semibold cursor-pointer"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {isLoading && activeTenants.length === 0 && section !== 'settings' ? (
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 h-56 rounded-2xl border border-hairline bg-paper animate-pulse" />
              <div className="lg:col-span-5 h-56 rounded-2xl border border-hairline bg-paper animate-pulse" />
            </div>
          ) : (
            <>
              {/* ── 01: GENEL BAKIŞ (Elevated Depth + Live Breakdown Visuals) ── */}
              {section === 'overview' && (
                <div className="space-y-6">
                  {/* Top Featured Portfolio Row */}
                  <div className="grid lg:grid-cols-12 gap-5 items-stretch">
                    {/* Featured Deep Financial Hero Card */}
                    <div className="lg:col-span-7 relative overflow-hidden rounded-2xl p-5 sm:p-7 bg-gradient-to-br from-[#131823] via-[#172133] to-[#111927] text-[#E8E8E8] border border-[#273247] shadow-[0_18px_44px_-22px_rgba(19,22,29,0.55)] flex flex-col justify-between gap-6">
                      {/* Ambient subtle brand glow */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full"
                        style={{
                          background:
                            'radial-gradient(circle, rgba(29,161,242,0.22) 0%, rgba(0,186,124,0.06) 55%, transparent 75%)',
                        }}
                      />

                      <div className="relative flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#7FCBF9]">
                            Toplam Portföy Tahsilatı
                          </p>
                          <div className="mt-2 font-mono text-[28px] sm:text-[38px] font-bold tracking-[-0.03em] text-white leading-none">
                            <Money amount={displayTotalPaid} />
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1.5">
                          <span className="px-3 py-1 rounded-full bg-[#00BA7C]/18 border border-[#00BA7C]/35 text-[#34D399] font-mono text-[12px] font-semibold w-fit">
                            %{overallCollectionPct} Tahsilat
                          </span>
                          <span className="text-[11.5px] text-white/50">
                            {activeTenants.length} aktif · {archivedTenants.length} geçmiş
                          </span>
                        </div>
                      </div>

                      {/* Collection Progress Bar */}
                      <div className="relative space-y-2">
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#1DA1F2] to-[#00BA7C] transition-all duration-500"
                            style={{ width: `${overallCollectionPct}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11.5px] text-white/55 font-mono">
                          <span>
                            Tahsil Edilen: <Money amount={displayTotalPaid} className="text-white/85" />
                          </span>
                          <span>
                            Toplam Hacim: <Money amount={displayTotalDue} className="text-white/85" />
                          </span>
                        </div>
                      </div>

                      {/* Bottom 3-Metric Strip */}
                      <div className="relative pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-3">
                        <div>
                          <p className="text-[11px] text-white/55">Aylık Potansiyel</p>
                          <p className="mt-1 font-mono text-[15.5px] sm:text-[18px] font-bold text-[#7FCBF9]">
                            <Money amount={displayMonthlyPotential} />
                          </p>
                        </div>
                        <div className="sm:border-x sm:border-white/10 sm:px-3">
                          <p className="text-[11px] text-white/55">Yıllık Öngörü</p>
                          <p className="mt-1 font-mono text-[15.5px] sm:text-[18px] font-bold text-white">
                            <Money amount={displayAnnualProjected} />
                          </p>
                        </div>
                        <div className="col-span-2 sm:col-span-1 sm:pl-1">
                          <p className="text-[11px] text-white/55">Bekleyen Bakiye</p>
                          <p
                            className={`mt-1 font-mono text-[15.5px] sm:text-[18px] font-bold ${
                              displayOutstanding > 0 ? 'text-[#FBBF24]' : 'text-[#34D399]'
                            }`}
                          >
                            <Money amount={displayOutstanding} />
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Elevated Portfolio Distribution & Occupancy Card */}
                    <div className="lg:col-span-5 rounded-2xl bg-paper border border-hairline shadow-[0_12px_30px_-20px_rgba(19,22,29,0.16)] p-6 flex flex-col justify-between gap-5">
                      {/* Occupancy Donut Header */}
                      <div className="flex items-center justify-between gap-4 pb-4 border-b border-divider">
                        <div>
                          <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
                            Portföy Doluluğu
                          </p>
                          <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="font-mono text-[26px] font-bold text-ink tabular-nums">
                              {occupiedCount} / {apartments.length}
                            </span>
                            <span className="text-[12.5px] text-ink-muted">birim dolu</span>
                          </div>
                          <p className="text-[12px] text-ink-subtle mt-0.5">
                            {properties.length} mülk · {apartments.length - occupiedCount} kiralanabilir boş
                          </p>
                        </div>
                        <LargeDonutRing
                          percent={occupancyPercent}
                          color={occupancyPercent === 100 ? '#00BA7C' : '#1DA1F2'}
                        />
                      </div>

                      {/* Konut vs İşyeri Revenue Mix Bar */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-semibold text-ink">Aylık Gelir Dağılımı</span>
                          <span className="font-mono text-[11px] text-ink-subtle">
                            Konut %{portfolioBreakdown.houseShare} · İşyeri %
                            {portfolioBreakdown.totalMonthly > 0
                              ? 100 - portfolioBreakdown.houseShare
                              : 0}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-variant overflow-hidden flex">
                          <div
                            className="h-full bg-[#0EA5E9] transition-all duration-500"
                            style={{ width: `${portfolioBreakdown.houseShare}%` }}
                          />
                          <div
                            className="h-full bg-[#D946EF] transition-all duration-500"
                            style={{
                              width: `${
                                portfolioBreakdown.totalMonthly > 0
                                  ? 100 - portfolioBreakdown.houseShare
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-canvas">
                            <span className="flex items-center gap-1.5 text-ink-muted">
                              <span className="w-2 h-2 rounded-full bg-[#0EA5E9]" />
                              Konut ({portfolioBreakdown.houseCount})
                            </span>
                            <Money
                              amount={portfolioBreakdown.houseMonthly}
                              className="font-mono font-semibold text-ink"
                            />
                          </div>
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-canvas">
                            <span className="flex items-center gap-1.5 text-ink-muted">
                              <span className="w-2 h-2 rounded-full bg-[#D946EF]" />
                              İşyeri ({portfolioBreakdown.businessCount})
                            </span>
                            <Money
                              amount={portfolioBreakdown.businessMonthly}
                              className="font-mono font-semibold text-ink"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Top Properties Share Mini Bars */}
                      {portfolioBreakdown.topProperties.length > 0 && (
                        <div className="pt-3 border-t border-divider space-y-2">
                          <div className="flex items-center justify-between text-[11.5px]">
                            <span className="font-semibold text-ink-muted">Mülk Bazlı Aylık Pay</span>
                            <button
                              type="button"
                              onClick={() => setSection('properties')}
                              className="text-accent font-medium hover:underline cursor-pointer"
                            >
                              Detay →
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {portfolioBreakdown.topProperties.map(([propName, monthly]) => {
                              const pct =
                                portfolioBreakdown.totalMonthly > 0
                                  ? Math.round((monthly / portfolioBreakdown.totalMonthly) * 100)
                                  : 0;
                              return (
                                <div key={propName} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11.5px]">
                                    <span className="text-ink truncate pr-2">{propName}</span>
                                    <Money
                                      amount={monthly}
                                      className="font-mono text-ink-muted font-medium"
                                    />
                                  </div>
                                  <div className="h-1.5 rounded-full bg-variant overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-accent/80"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Tenants + Upcoming / Overdue */}
                  <div className="grid lg:grid-cols-12 gap-6 items-start">
                    <section className="lg:col-span-7 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h2 className="text-[15.5px] font-bold text-ink">
                          Aktif Kiracılar ({activeTenants.length})
                        </h2>
                        <button
                          type="button"
                          onClick={() => setSection('tenants')}
                          className="text-[13px] font-medium text-accent hover:underline cursor-pointer"
                        >
                          Tümünü Gör →
                        </button>
                      </div>

                      {activeTenants.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-hairline bg-paper text-center text-[13.5px] text-ink-muted">
                          Henüz aktif kiracı kaydı bulunmuyor.
                        </div>
                      ) : (
                        <div className={compact ? 'space-y-2' : 'space-y-3'}>
                          {activeTenants.map((tenant) => (
                            <MobileStyleTenantCard
                              key={tenant.id}
                              tenant={tenant}
                              compact={compact}
                              onClick={() => setSelectedTenantId(tenant.id)}
                            />
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="lg:col-span-5 bg-paper border border-hairline rounded-2xl shadow-[0_10px_28px_-20px_rgba(19,22,29,0.16)] overflow-hidden">
                      <div className="px-5 py-4 border-b border-divider flex items-center justify-between">
                        <div>
                          <h2 className="text-[15px] font-bold text-ink">
                            Geciken & Yaklaşan Ödemeler
                          </h2>
                          <p className="text-[12px] text-ink-subtle mt-0.5">
                            Vade sırasına göre açık taksitler
                          </p>
                        </div>
                        {overdueCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-danger-soft text-danger font-mono text-[11px] font-bold">
                            {overdueCount} gecikme
                          </span>
                        )}
                      </div>

                      {upcomingPayments.length === 0 ? (
                        <p className="p-6 text-[13.5px] text-ink-muted">
                          Yaklaşan veya gecikmiş ödeme görünmüyor.
                        </p>
                      ) : (
                        <div className="divide-y divide-divider">
                          {upcomingPayments.slice(0, 8).map((p) => {
                            const overdue = p.daysUntilDue < 0;
                            return (
                              <div
                                key={p.id}
                                className="relative px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-canvas/50 transition-colors"
                              >
                                <span
                                  className={`absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full ${
                                    overdue ? 'bg-danger' : 'bg-warn'
                                  }`}
                                />
                                <div className="min-w-0">
                                  <p className="text-[13.5px] font-semibold text-ink truncate">
                                    {p.tenantName}
                                  </p>
                                  <p className="font-mono text-[11.5px] text-ink-subtle mt-0.5">
                                    {formatDate(p.paymentDate)}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-[13.5px] font-bold text-ink">
                                    <Money amount={p.amount} />
                                  </div>
                                  <div
                                    className={`text-[11.5px] font-medium ${
                                      overdue ? 'text-danger' : 'text-warn'
                                    }`}
                                  >
                                    {overdue
                                      ? `${Math.abs(p.daysUntilDue)} gün gecikti`
                                      : p.daysUntilDue === 0
                                        ? 'Bugün'
                                        : `${p.daysUntilDue} gün kaldı`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}

              {/* ── 02: KİRACILARIM ── */}
              {section === 'tenants' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="inline-flex p-1 rounded-xl bg-paper border border-hairline">
                        {(
                          [
                            ['active', `Aktif (${activeTenants.length})`],
                            ['archived', `Eski Kiracılar (${archivedTenants.length})`],
                          ] as const
                        ).map(([tab, label]) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setTenantTab(tab)}
                            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                              tenantTab === tab
                                ? 'bg-accent text-white'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="inline-flex p-1 rounded-xl bg-paper border border-hairline">
                        {(
                          [
                            ['all', 'Tümü'],
                            ['house', 'Konut'],
                            ['business', 'İşyeri'],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTenantTypeFilter(val)}
                            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                              tenantTypeFilter === val
                                ? 'bg-variant text-ink font-semibold'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="search"
                      placeholder="Kiracı veya daire ara..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                      className="w-full sm:w-72 px-3.5 py-2 rounded-xl bg-paper border border-hairline text-[13.5px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                    />
                  </div>

                  {filteredTenants.length === 0 ? (
                    <div className="p-10 rounded-2xl border border-hairline bg-paper text-center text-[14px] text-ink-muted">
                      Eşleşen kiracı bulunamadı.
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3.5">
                      {filteredTenants.map((tenant) => (
                        <MobileStyleTenantCard
                          key={tenant.id}
                          tenant={tenant}
                          compact={compact}
                          onClick={() => setSelectedTenantId(tenant.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── 03: MÜLK & KAZANÇ (Mirrors Mobile PropertyManagementScreen + FloorBlueprintGrid) ── */}
              {section === 'properties' && (
                <div className="space-y-6">
                  {/* Top PropertyStatHeader + Search & Status Filter */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-2xl bg-paper border border-accent/25 shadow-[0_8px_22px_-18px_rgba(29,161,242,0.3)] flex items-center justify-between">
                      <div>
                        <p className="text-[11.5px] font-semibold text-ink-muted">Mülk / Bina</p>
                        <p className="font-mono text-[24px] font-bold text-ink tabular-nums mt-0.5">
                          {properties.length}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-accent-soft text-accent font-mono text-[11px] font-bold">
                        Portföy
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-paper border border-hairline shadow-[0_8px_22px_-18px_rgba(19,22,29,0.14)] flex items-center justify-between">
                      <div>
                        <p className="text-[11.5px] font-semibold text-ink-muted">Toplam Birim</p>
                        <p className="font-mono text-[24px] font-bold text-ink tabular-nums mt-0.5">
                          {apartments.length}
                        </p>
                      </div>
                      <span className="font-mono text-[12px] font-semibold text-ink-subtle">
                        %{occupancyPercent} dolu
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-paper border border-paid/30 shadow-[0_8px_22px_-18px_rgba(0,186,124,0.28)] flex items-center justify-between">
                      <div>
                        <p className="text-[11.5px] font-semibold text-ink-muted">Dolu Daire</p>
                        <p className="font-mono text-[24px] font-bold text-paid tabular-nums mt-0.5">
                          {occupiedCount}
                        </p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-paid" />
                    </div>
                    <div className="p-4 rounded-2xl bg-paper border border-warn/35 shadow-[0_8px_22px_-18px_rgba(245,158,11,0.28)] flex items-center justify-between">
                      <div>
                        <p className="text-[11.5px] font-semibold text-ink-muted">Boş Daire</p>
                        <p className="font-mono text-[24px] font-bold text-warn tabular-nums mt-0.5">
                          {apartments.length - occupiedCount}
                        </p>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-warn" />
                    </div>
                  </div>

                  {/* Building Selector Cards */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-subtle">
                        Mülkler / Binalar
                      </span>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div className="inline-flex p-1 rounded-xl bg-paper border border-hairline">
                          {(
                            [
                              ['all', `Tümü (${apartments.length})`],
                              ['occupied', `Dolu (${occupiedCount})`],
                              ['vacant', `Boş (${apartments.length - occupiedCount})`],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setPropertyUnitStatus(key)}
                              className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                propertyUnitStatus === key
                                  ? key === 'occupied'
                                    ? 'bg-paid text-white'
                                    : key === 'vacant'
                                      ? 'bg-warn text-white'
                                      : 'bg-accent text-white'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="search"
                          value={propertySearch}
                          onChange={(e) => setPropertySearch(e.target.value)}
                          placeholder="Daire, kat veya kiracı ara..."
                          className="w-full sm:w-56 px-3 py-1.5 rounded-xl bg-paper border border-hairline text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {properties.map((prop) => {
                        const active = selectedProperty?.id === prop.id;
                        const propApts = apartments.filter((a) => a.property?.id === prop.id);
                        const occ = propApts.filter((a) => a.isOccupied).length;
                        const rate = propApts.length > 0 ? Math.round((occ / propApts.length) * 100) : 0;
                        return (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => {
                              setSelectedPropertyId(prop.id);
                              setSelectedApartmentFilter(null);
                            }}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              active
                                ? 'border-accent bg-paper shadow-[0_12px_28px_-18px_rgba(29,161,242,0.5)] ring-1 ring-accent/25'
                                : 'border-hairline bg-paper/75 hover:bg-paper hover:-translate-y-0.5'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[14.5px] font-bold text-ink truncate">
                                {prop.name}
                              </div>
                              <div className="text-[11.5px] text-ink-subtle truncate mt-0.5">
                                {prop.address || 'Adres belirtilmemiş'}
                              </div>
                              <div className="text-[11.5px] font-medium text-ink-muted mt-1.5">
                                {occ} Dolu · {propApts.length - occ} Boş
                              </div>
                            </div>
                            <MiniProgressRing
                              percent={rate}
                              color={rate === 100 && propApts.length > 0 ? '#00BA7C' : '#1DA1F2'}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedProperty && (
                    <div className="grid lg:grid-cols-12 gap-6 items-start">
                      {/* Modern Akıllı Kat Planı (FloorBlueprintGrid) */}
                      <div className="lg:col-span-6 bg-paper border border-hairline rounded-2xl shadow-[0_12px_32px_-22px_rgba(19,22,29,0.18)] p-4 sm:p-6 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-divider">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h2 className="text-[17px] font-bold text-ink truncate">
                                {selectedProperty.name}
                              </h2>
                              <span className="px-2 py-0.5 rounded-md bg-variant font-mono text-[11px] font-semibold text-ink-muted">
                                {propertyDetails.visibleAptsCount} birim
                              </span>
                            </div>
                            <p className="text-[12px] text-ink-muted mt-0.5">
                              {selectedProperty.address || 'Adres belirtilmemiş'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPropertyModal({ open: true, editing: selectedProperty })
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-hairline text-[12px] font-medium text-ink-muted hover:text-ink cursor-pointer"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => setApartmentModalProperty(selectedProperty)}
                              className="px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-[12px] font-semibold hover:bg-accent hover:text-white transition-colors cursor-pointer"
                            >
                              + Daire Ekle
                            </button>
                          </div>
                        </div>

                        {propertyDetails.floorGroups.length === 0 ? (
                          <p className="text-[13.5px] text-ink-muted py-8 text-center">
                            Bu mülk veya filtre için gösterilecek daire bulunmuyor.
                          </p>
                        ) : (
                          <div className="space-y-5">
                            {propertyDetails.floorGroups.map(([floor, floorApts]) => {
                              const occInFloor = floorApts.filter((a) => a.isOccupied).length;
                              return (
                                <div key={floor} className="space-y-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <span className="px-2.5 py-0.5 rounded-md bg-variant text-[11.5px] font-bold text-ink">
                                      {floor}
                                    </span>
                                    <span className="h-px flex-1 bg-divider" />
                                    <span className="font-mono text-[11px] text-ink-subtle">
                                      {occInFloor}/{floorApts.length} dolu
                                    </span>
                                  </div>

                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {floorApts.map((apt) => {
                                      const linkedTenant = apt.tenantId
                                        ? activeTenantById.get(apt.tenantId)
                                        : undefined;
                                      const tStats = linkedTenant
                                        ? getTenantPaymentStats(linkedTenant)
                                        : null;
                                      const allPaid = Boolean(tStats?.allCompleted);
                                      return (
                                        <button
                                          key={apt.id}
                                          type="button"
                                          onClick={() => {
                                            if (apt.isOccupied && apt.tenantId) {
                                              setSelectedTenantId(apt.tenantId);
                                            } else {
                                              setTenantModal({
                                                mode: 'create',
                                                initialPropertyId: selectedProperty.id,
                                                initialApartmentId: apt.id,
                                              });
                                            }
                                          }}
                                          className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer overflow-hidden hover:-translate-y-0.5 ${
                                            apt.isOccupied
                                              ? 'border-paid/30 bg-paid-soft/65 hover:border-paid'
                                              : 'border-warn/35 bg-warn-soft/70 hover:border-warn'
                                          }`}
                                        >
                                          <span
                                            className={`absolute left-0 top-0 bottom-0 w-1 ${
                                              apt.isOccupied ? 'bg-paid' : 'bg-warn'
                                            }`}
                                          />
                                          <div className="pl-2 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-[13.5px] font-bold text-ink">
                                                No: {apt.doorNumber || apt.id}
                                              </span>
                                              {apt.roomCount && (
                                                <span className="text-[11px] text-ink-muted truncate">
                                                  {apt.roomCount}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                              <span
                                                className={`text-[12px] font-semibold truncate ${
                                                  apt.isOccupied ? 'text-paid' : 'text-warn'
                                                }`}
                                              >
                                                {apt.isOccupied
                                                  ? apt.tenantName || 'Dolu'
                                                  : 'Boş · Kiracı Ata'}
                                              </span>
                                              {linkedTenant && (
                                                <Money
                                                  amount={linkedTenant.rentAmount}
                                                  className="font-mono text-[12px] font-bold text-ink shrink-0"
                                                />
                                              )}
                                            </div>
                                            {tStats && (
                                              <div className="flex items-center justify-between pt-1">
                                                <div className="h-1.5 flex-1 mr-2.5 rounded-full bg-hairline overflow-hidden">
                                                  <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                      width: `${
                                                        tStats.total > 0
                                                          ? Math.min(
                                                              100,
                                                              Math.round(
                                                                (tStats.paid / tStats.total) * 100,
                                                              ),
                                                            )
                                                          : 0
                                                      }%`,
                                                      backgroundColor: allPaid
                                                        ? '#00BA7C'
                                                        : '#1DA1F2',
                                                    }}
                                                  />
                                                </div>
                                                <span
                                                  className={`font-mono text-[10.5px] font-semibold ${
                                                    allPaid ? 'text-paid' : 'text-ink-subtle'
                                                  }`}
                                                >
                                                  {tStats.paid}/{tStats.total}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Property Earnings & Tenant History */}
                      <div className="lg:col-span-6 bg-paper border border-hairline rounded-2xl shadow-[0_12px_32px_-22px_rgba(19,22,29,0.18)] overflow-hidden">
                        <div className="p-5 border-b border-divider bg-gradient-to-r from-accent-soft/65 to-paid-soft/45 space-y-4">
                          <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                              <p className="text-[12px] font-semibold text-ink-muted">
                                Toplam Tahsil Edilen Kazanç (Aktif + Geçmiş)
                              </p>
                              <p className="font-mono text-[28px] font-bold text-paid mt-1">
                                <Money amount={propertyDetails.collected} />
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11.5px] text-ink-subtle">Bekleyen Alacak</p>
                              <p className="font-mono text-[16px] font-bold text-ink">
                                <Money amount={propertyDetails.pending} />
                              </p>
                            </div>
                          </div>

                          {propertyDetails.apts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedApartmentFilter(null)}
                                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                                  selectedApartmentFilter === null
                                    ? 'bg-accent text-white'
                                    : 'bg-paper border border-hairline text-ink-muted hover:text-ink'
                                }`}
                              >
                                Tüm Daireler
                              </button>
                              {propertyDetails.apts.map((apt) => {
                                const active = selectedApartmentFilter === apt.id;
                                const earn = propertyDetails.aptEarnings.get(apt.id) ?? 0;
                                return (
                                  <button
                                    key={apt.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedApartmentFilter(active ? null : apt.id)
                                    }
                                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                      active
                                        ? 'bg-accent text-white'
                                        : 'bg-paper border border-hairline text-ink-muted hover:text-ink'
                                    }`}
                                  >
                                    <span>No: {apt.doorNumber || apt.id}</span>
                                    {earn > 0 && (
                                      <>
                                        <span>·</span>
                                        <Money amount={earn} className="font-mono" />
                                      </>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="divide-y divide-divider">
                          {propertyDetails.records.map((tenant) => {
                            const s = getTenantPaymentStats(tenant);
                            return (
                              <button
                                key={tenant.id}
                                type="button"
                                onClick={() => setSelectedTenantId(tenant.id)}
                                className="w-full px-5 py-4 hover:bg-variant/50 transition-colors flex items-center justify-between gap-4 text-left cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2 h-2 rounded-full shrink-0 ${
                                        tenant.isArchived ? 'bg-ink-subtle' : 'bg-paid'
                                      }`}
                                    />
                                    <span className="text-[14px] font-semibold text-ink truncate">
                                      {getTenantFullName(tenant)}
                                    </span>
                                    <span
                                      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                                        tenant.isArchived
                                          ? 'bg-variant text-ink-muted'
                                          : 'bg-paid-soft text-paid'
                                      }`}
                                    >
                                      {tenant.isArchived ? 'Eski Kiracı' : 'Aktif'}
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-ink-muted pl-4 mt-0.5">
                                    No: {tenant.apartment?.doorNumber || '—'} ·{' '}
                                    {formatDate(tenant.startDate)} –{' '}
                                    {formatDate(
                                      getContractEndDate(
                                        tenant.startDate,
                                        tenant.contractDuration,
                                      ),
                                    )}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-[14.5px] font-bold text-paid">
                                    <Money amount={s.collected} />
                                  </div>
                                  <div className="font-mono text-[11.5px] text-ink-subtle tabular-nums">
                                    {s.paid}/{s.total} taksit
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {propertyDetails.records.length === 0 && (
                            <p className="p-6 text-[13.5px] text-ink-muted text-center">
                              Bu seçim için kayıtlı kiracı geçmişi bulunmuyor.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 04: KİRA HESAPLAYICI ── */}
              {section === 'calculator' && (
                <div className="space-y-4">
                  {sortedForCalculator.map((tenant) => {
                    const daysLeft = getDaysUntilContractEnd(
                      tenant.startDate,
                      tenant.contractDuration,
                    );
                    const rate = calcRates[tenant.id] ?? prefs.defaultIncreaseRate;
                    const projected = Math.round(tenant.rentAmount * (1 + rate / 100));

                    return (
                      <div
                        key={tenant.id}
                        className="bg-paper border border-hairline rounded-2xl shadow-[0_8px_24px_-18px_rgba(19,22,29,0.14)] p-5 grid lg:grid-cols-12 gap-5 items-center"
                      >
                        <div className="lg:col-span-4 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-bold text-ink truncate">
                              {getTenantFullName(tenant)}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                daysLeft <= 30
                                  ? 'bg-danger-soft text-danger'
                                  : daysLeft <= prefs.contractWarningDays
                                    ? 'bg-warn-soft text-warn'
                                    : 'bg-paid-soft text-paid'
                              }`}
                            >
                              {daysLeft < 0
                                ? `${Math.abs(daysLeft)} gün geçti`
                                : daysLeft === 0
                                  ? 'Bugün bitiyor'
                                  : `${daysLeft} gün`}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-ink-muted mt-1 truncate">
                            {getTenantDisplayAddress(tenant)}
                          </p>
                        </div>

                        <div className="lg:col-span-4 space-y-2">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-ink-muted">Artış Oranı</span>
                            <span className="px-2 py-0.5 rounded-md bg-accent-soft font-mono font-semibold text-accent tabular-nums">
                              %{rate}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={200}
                            value={rate}
                            onChange={(e) =>
                              setCalcRates((prev) => ({
                                ...prev,
                                [tenant.id]: Number(e.target.value),
                              }))
                            }
                            className="w-full brand-range"
                          />
                        </div>

                        <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-4">
                          <div className="text-left lg:text-right">
                            <p className="text-[11px] text-ink-subtle">
                              Mevcut: <Money amount={tenant.rentAmount} className="font-mono" />
                            </p>
                            <p className="font-mono text-[20px] font-bold text-paid">
                              <Money amount={projected} />
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTenantModal({
                                mode: 'renew',
                                sourceTenant: tenant,
                                initialNewRent: projected,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover transition-colors shrink-0 cursor-pointer"
                          >
                            Yenile →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 05: AYARLAR ── */}
              {section === 'settings' && <SettingsPanel onNotify={(m) => setToast(m)} />}
            </>
          )}
        </main>
      </div>

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <TenantDetailDrawer
          tenant={selectedTenant}
          landlordName={user ? getUserFullName(user) : undefined}
          updatingPaymentId={updatingPaymentId}
          isBulkUpdating={isBulkUpdating}
          onClose={() => setSelectedTenantId(null)}
          onEdit={() =>
            setTenantModal({ mode: 'edit', sourceTenant: selectedTenant })
          }
          onRenew={() =>
            setTenantModal({ mode: 'renew', sourceTenant: selectedTenant })
          }
          onEvict={() => handleEvictTenant(selectedTenant)}
          onDelete={() => handleDeleteTenant(selectedTenant)}
          onTogglePayment={(p) => handleTogglePayment(p)}
          onBulkCollect={handleBulkCollect}
          onNotify={(m) => setToast(m)}
        />
      )}

      {/* Create / Edit / Renew Tenant Modal */}
      {tenantModal && (
        <TenantFormModal
          mode={tenantModal.mode}
          sourceTenant={tenantModal.sourceTenant}
          initialPropertyId={tenantModal.initialPropertyId}
          initialApartmentId={tenantModal.initialApartmentId}
          initialNewRent={tenantModal.initialNewRent}
          properties={properties}
          apartments={apartments}
          onClose={() => setTenantModal(null)}
          onSuccess={async (msg, focusId) => {
            setTenantModal(null);
            await loadAll(true);
            if (focusId) setSelectedTenantId(focusId);
            setToast(msg);
          }}
        />
      )}

      {/* Property Create / Edit Modal */}
      {propertyModal.open && (
        <PropertyFormModal
          editingProperty={propertyModal.editing}
          onClose={() => setPropertyModal({ open: false })}
          onSuccess={async (msg, propId) => {
            setPropertyModal({ open: false });
            await loadAll(true);
            if (propId) setSelectedPropertyId(propId);
            setToast(msg);
          }}
        />
      )}

      {/* Apartment Create Modal */}
      {apartmentModalProperty && (
        <ApartmentFormModal
          property={apartmentModalProperty}
          onClose={() => setApartmentModalProperty(null)}
          onSuccess={async (msg) => {
            setApartmentModalProperty(null);
            await loadAll(true);
            setToast(msg);
          }}
        />
      )}
    </div>
  );
}

function MobileStyleTenantCard({
  tenant,
  compact = false,
  onClick,
}: {
  tenant: Tenant;
  compact?: boolean;
  onClick: () => void;
}) {
  const isBusiness = isWorkplaceTenant(tenant.type);
  const accent = isBusiness ? '#D946EF' : '#0EA5E9';
  const stats = getTenantPaymentStats(tenant);
  const isAllPaid = !tenant.isArchived && stats.allCompleted;
  const ringColor = isAllPaid ? '#00BA7C' : accent;
  const percent = stats.total > 0 ? Math.min(100, Math.round((stats.paid / stats.total) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-paper border border-hairline hover:border-accent/55 rounded-2xl shadow-[0_6px_22px_-18px_rgba(19,22,29,0.22)] hover:shadow-[0_12px_28px_-16px_rgba(29,161,242,0.24)] hover:-translate-y-0.5 overflow-hidden transition-all cursor-pointer"
    >
      <div className={`${compact ? 'px-4 py-2.5' : 'px-4 py-3.5'} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-semibold shrink-0"
            style={{ backgroundColor: `${accent}1A`, color: accent }}
          >
            {tenant.name ? tenant.name[0].toUpperCase() : '?'}
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-semibold text-ink truncate">
              {getTenantFullName(tenant)}
            </div>
            <div className="text-[12px] text-ink-muted truncate mt-0.5">
              {getTenantDisplayAddress(tenant)}
            </div>
          </div>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          {isBusiness ? 'İşyeri' : 'Konut'}
        </span>
      </div>

      <div className={`border-t border-divider ${compact ? 'px-3 sm:px-4 py-2' : 'px-3 sm:px-4 py-3'} grid grid-cols-3 items-center gap-1.5 sm:gap-2`}>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[10.5px] text-ink-subtle">Aylık Kira</div>
          <div className="font-mono text-[12.5px] sm:text-[13.5px] font-semibold text-ink mt-0.5 truncate">
            <Money amount={tenant.rentAmount} />
          </div>
        </div>
        <div className="border-x border-divider px-2 sm:px-3 flex items-center justify-between gap-1">
          <div>
            <div className="text-[10px] sm:text-[10.5px] text-ink-subtle">Ödeme</div>
            <div className="font-mono text-[12.5px] sm:text-[13.5px] font-semibold text-ink tabular-nums mt-0.5">
              {stats.paid}/{stats.total}
            </div>
          </div>
          <MiniProgressRing percent={percent} color={ringColor} />
        </div>
        <div className="pl-1.5 sm:pl-2 min-w-0">
          <div className="text-[10px] sm:text-[10.5px] text-ink-subtle">Durum</div>
          <div
            className="text-[11.5px] sm:text-[12.5px] font-semibold mt-0.5 truncate"
            style={{
              color: tenant.isArchived
                ? 'var(--text-subtle)'
                : isAllPaid
                  ? '#00BA7C'
                  : 'var(--text-primary)',
            }}
          >
            {tenant.isArchived ? 'Eski Kiracı' : isAllPaid ? 'Tamamlandı' : 'Aktif'}
          </div>
        </div>
      </div>
    </button>
  );
}

function LargeDonutRing({ percent, color }: { percent: number; color: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="5.5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute font-mono text-[13px] font-bold text-ink">
        %{percent}
      </span>
    </div>
  );
}

function NavIcon({ section, active }: { section: PanelSection; active: boolean }) {
  const cls = `w-4 h-4 shrink-0 ${active ? 'opacity-100' : 'opacity-75'}`;
  switch (section) {
    case 'overview':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'tenants':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'properties':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10h2" />
          <path d="M13 10h2" />
          <path d="M9 14h2" />
          <path d="M13 14h2" />
        </svg>
      );
    case 'calculator':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="8" y1="6" x2="16" y2="6" />
          <line x1="8" y1="11" x2="8.01" y2="11" />
          <line x1="12" y1="11" x2="12.01" y2="11" />
          <line x1="16" y1="11" x2="16.01" y2="11" />
          <line x1="8" y1="15" x2="8.01" y2="15" />
          <line x1="12" y1="15" x2="12.01" y2="15" />
          <line x1="16" y1="15" x2="16.01" y2="15" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      );
  }
}
