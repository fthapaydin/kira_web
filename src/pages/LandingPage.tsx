import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { MiniProgressRing } from '../components/MiniProgressRing';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../lib/formatters';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.fatalsoft.kiratakip&hl=tr';
const CONTACT_EMAIL = 'fatalsoft.inc@gmail.com';

type HeroPreviewTab = 'tenants' | 'summary' | 'history';

interface DemoUnit {
  id: string;
  doorNo: string;
  floor: string;
  floorOrder: number;
  roomInfo: string;
  isBusiness: boolean;
  occupied: boolean;
  tenantName?: string;
  rent?: number;
  paid?: number;
  total?: number;
  contractPeriod?: string;
  cumulativeEarned: number;
  pastTenantCount: number;
}

interface DemoProperty {
  id: string;
  name: string;
  district: string;
  address: string;
  units: DemoUnit[];
  archivedHistory: {
    tenant: string;
    doorNo: string;
    period: string;
    paidLabel: string;
    collected: number;
  }[];
}

// 100% fictional, diverse sample portfolio data for the public landing page
const DEMO_PROPERTIES: DemoProperty[] = [
  {
    id: 'cinar',
    name: 'Çınar Residence',
    district: 'Kadıköy, İstanbul',
    address: 'Moda Caddesi No: 42, Kadıköy',
    units: [
      {
        id: 'c-5',
        doorNo: '5',
        floor: '3. Kat',
        floorOrder: 3,
        roomInfo: '3+1 · 125 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Selin Arslan',
        rent: 34000,
        paid: 12,
        total: 12,
        contractPeriod: '01 Kas 2025 – 01 Kas 2026',
        cumulativeEarned: 408000,
        pastTenantCount: 2,
      },
      {
        id: 'c-6',
        doorNo: '6',
        floor: '3. Kat',
        floorOrder: 3,
        roomInfo: '2+1 · 95 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Burak Çetin',
        rent: 27500,
        paid: 9,
        total: 12,
        contractPeriod: '15 Şub 2026 – 15 Şub 2027',
        cumulativeEarned: 247500,
        pastTenantCount: 1,
      },
      {
        id: 'c-3',
        doorNo: '3',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: '2+1 · 90 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Nisa Kaya',
        rent: 25000,
        paid: 10,
        total: 12,
        contractPeriod: '10 Oca 2026 – 10 Oca 2027',
        cumulativeEarned: 250000,
        pastTenantCount: 1,
      },
      {
        id: 'c-4',
        doorNo: '4',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: '2+1 · 90 m²',
        isBusiness: false,
        occupied: false,
        cumulativeEarned: 216000,
        pastTenantCount: 2,
      },
      {
        id: 'c-1',
        doorNo: '1',
        floor: '1. Kat',
        floorOrder: 1,
        roomInfo: '1+1 · 65 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Emre Koç',
        rent: 19500,
        paid: 7,
        total: 12,
        contractPeriod: '01 Nis 2026 – 01 Nis 2027',
        cumulativeEarned: 136500,
        pastTenantCount: 1,
      },
      {
        id: 'c-2',
        doorNo: '2',
        floor: '1. Kat',
        floorOrder: 1,
        roomInfo: '2+1 · 88 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Zeynep Şahin',
        rent: 24000,
        paid: 12,
        total: 12,
        contractPeriod: '20 Eki 2025 – 20 Eki 2026',
        cumulativeEarned: 288000,
        pastTenantCount: 1,
      },
    ],
    archivedHistory: [
      {
        tenant: 'Caner Aksoy',
        doorNo: 'No: 4',
        period: '15 Nis 2025 – 15 Nis 2026',
        paidLabel: '12/12 taksit',
        collected: 216000,
      },
      {
        tenant: 'Sibel Karaca',
        doorNo: 'No: 5',
        period: '01 Kas 2024 – 01 Kas 2025',
        paidLabel: '12/12 taksit',
        collected: 264000,
      },
    ],
  },
  {
    id: 'vadi',
    name: 'Vadi İş Merkezi',
    district: 'Ataşehir, İstanbul',
    address: 'Barbaros Bulvarı No: 18, Ataşehir',
    units: [
      {
        id: 'v-201',
        doorNo: '201',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: 'Ofis · 95 m²',
        isBusiness: true,
        occupied: true,
        tenantName: 'Kuzey Mimarlık Ltd.',
        rent: 48000,
        paid: 11,
        total: 12,
        contractPeriod: '01 Ara 2025 – 01 Ara 2026',
        cumulativeEarned: 528000,
        pastTenantCount: 1,
      },
      {
        id: 'v-202',
        doorNo: '202',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: 'Ofis · 70 m²',
        isBusiness: true,
        occupied: true,
        tenantName: 'Atlas Danışmanlık',
        rent: 36000,
        paid: 8,
        total: 12,
        contractPeriod: '01 Mar 2026 – 01 Mar 2027',
        cumulativeEarned: 288000,
        pastTenantCount: 0,
      },
      {
        id: 'v-101',
        doorNo: '101',
        floor: 'Zemin Kat',
        floorOrder: 0,
        roomInfo: 'Mağaza · 110 m²',
        isBusiness: true,
        occupied: true,
        tenantName: 'Ege Eczanesi',
        rent: 62000,
        paid: 12,
        total: 12,
        contractPeriod: '05 Kas 2025 – 05 Kas 2026',
        cumulativeEarned: 744000,
        pastTenantCount: 2,
      },
      {
        id: 'v-102',
        doorNo: '102',
        floor: 'Zemin Kat',
        floorOrder: 0,
        roomInfo: 'Dükkan · 65 m²',
        isBusiness: true,
        occupied: false,
        cumulativeEarned: 390000,
        pastTenantCount: 1,
      },
    ],
    archivedHistory: [
      {
        tenant: 'Güneş Optik',
        doorNo: 'No: 102',
        period: '01 May 2025 – 01 May 2026',
        paidLabel: '12/12 taksit',
        collected: 390000,
      },
    ],
  },
  {
    id: 'mavi',
    name: 'Mavi Park Sitesi',
    district: 'Çankaya, Ankara',
    address: 'Turan Güneş Bulvarı B Blok, Çankaya',
    units: [
      {
        id: 'm-14',
        doorNo: '14',
        floor: '4. Kat',
        floorOrder: 4,
        roomInfo: '3+1 · 130 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Hakan Aydın',
        rent: 28000,
        paid: 6,
        total: 12,
        contractPeriod: '01 May 2026 – 01 May 2027',
        cumulativeEarned: 168000,
        pastTenantCount: 1,
      },
      {
        id: 'm-15',
        doorNo: '15',
        floor: '4. Kat',
        floorOrder: 4,
        roomInfo: '3+1 · 130 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Elif Yılmaz',
        rent: 29500,
        paid: 12,
        total: 12,
        contractPeriod: '12 Eki 2025 – 12 Eki 2026',
        cumulativeEarned: 354000,
        pastTenantCount: 2,
      },
      {
        id: 'm-7',
        doorNo: '7',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: '2+1 · 92 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Mert Özdemir',
        rent: 22000,
        paid: 10,
        total: 12,
        contractPeriod: '01 Oca 2026 – 01 Oca 2027',
        cumulativeEarned: 220000,
        pastTenantCount: 1,
      },
      {
        id: 'm-8',
        doorNo: '8',
        floor: '2. Kat',
        floorOrder: 2,
        roomInfo: '2+1 · 92 m²',
        isBusiness: false,
        occupied: true,
        tenantName: 'Derya Polat',
        rent: 22500,
        paid: 5,
        total: 12,
        contractPeriod: '15 Haz 2026 – 15 Haz 2027',
        cumulativeEarned: 112500,
        pastTenantCount: 0,
      },
    ],
    archivedHistory: [
      {
        tenant: 'Okan Demir',
        doorNo: 'No: 14',
        period: '01 May 2025 – 01 May 2026',
        paidLabel: '12/12 taksit',
        collected: 252000,
      },
    ],
  },
];

const HERO_SAMPLE_TENANTS = [
  {
    initial: 'S',
    name: 'Selin Arslan',
    place: 'Çınar Residence No: 5 (3. Kat)',
    isBusiness: false,
    rent: 34000,
    paid: 12,
    total: 12,
  },
  {
    initial: 'K',
    name: 'Kuzey Mimarlık Ltd.',
    place: 'Vadi İş Merkezi No: 201 (2. Kat)',
    isBusiness: true,
    rent: 48000,
    paid: 11,
    total: 12,
  },
  {
    initial: 'B',
    name: 'Burak Çetin',
    place: 'Çınar Residence No: 6 (3. Kat)',
    isBusiness: false,
    rent: 27500,
    paid: 9,
    total: 12,
  },
  {
    initial: 'E',
    name: 'Ege Eczanesi',
    place: 'Vadi İş Merkezi No: 101 (Zemin)',
    isBusiness: true,
    rent: 62000,
    paid: 12,
    total: 12,
  },
];

const EXTRA_CAPABILITIES = [
  {
    tag: 'Tahsilat & Makbuz',
    title: 'Taksit Takibi & İsteğe Bağlı Makbuz',
    body: 'Tekil veya çoklu seçimle toplu tahsilat yapın. Tahsil edilen her taksit için dilediğinizde WhatsApp veya PDF makbuz paylaşın.',
    meta: 'Toplu Tahsilat · PDF & WhatsApp Makbuzu',
  },
  {
    tag: 'Sözleşme & Arşiv',
    title: 'Sözleşme Yenileme & Tahliye Akışı',
    body: '12/12 ödemesi biten kiracılarda tek ekrandan kira artışı hesaplayıp yeni sözleşme açın veya kiracıyı arşive alarak daireyi boşa çıkarın.',
    meta: 'Akıllı Yenileme · Eski Kiracılar Arşivi',
  },
  {
    tag: 'Gizlilik & Görünüm',
    title: 'Gizlilik Modu (Tutar Bulanıklaştırma)',
    body: 'Kamusal alanda veya kiracı yanında ekranı açtığınızda tüm kira ve kazanç tutarlarını tek tıkla bulanıklaştırın; imleçle yalnızca istediğiniz rakamı görün.',
    meta: 'Blur / Maske · Açık & Koyu Tema',
  },
];

const QUICK_RATES = [25, 40, 50, 60, 65];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Hero preview state
  const [heroTab, setHeroTab] = useState<HeroPreviewTab>('tenants');
  const [demoBlur, setDemoBlur] = useState(false);

  // Interactive Floor Plan showcase state
  const [selectedPropId, setSelectedPropId] = useState<string>(DEMO_PROPERTIES[0].id);
  const [unitFilter, setUnitFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(DEMO_PROPERTIES[0].units[0].id);

  // Calculator state
  const [currentRent, setCurrentRent] = useState<number>(25000);
  const [increaseRate, setIncreaseRate] = useState<number>(50);

  const portfolioStats = useMemo(() => {
    const allUnits = DEMO_PROPERTIES.flatMap((p) => p.units);
    const occupied = allUnits.filter((u) => u.occupied).length;
    return {
      properties: DEMO_PROPERTIES.length,
      totalUnits: allUnits.length,
      occupied,
      vacant: allUnits.length - occupied,
    };
  }, []);

  const activeProperty = useMemo(
    () => DEMO_PROPERTIES.find((p) => p.id === selectedPropId) ?? DEMO_PROPERTIES[0],
    [selectedPropId],
  );

  const filteredBlueprintFloors = useMemo(() => {
    const filtered = activeProperty.units.filter((u) => {
      if (unitFilter === 'occupied') return u.occupied;
      if (unitFilter === 'vacant') return !u.occupied;
      return true;
    });
    const map = new Map<string, { order: number; units: DemoUnit[] }>();
    for (const u of filtered) {
      const existing = map.get(u.floor);
      if (existing) {
        existing.units.push(u);
      } else {
        map.set(u.floor, { order: u.floorOrder, units: [u] });
      }
    }
    return [...map.entries()].sort((a, b) => b[1].order - a[1].order);
  }, [activeProperty, unitFilter]);

  const activeUnit = useMemo(() => {
    return (
      activeProperty.units.find((u) => u.id === selectedUnitId) ??
      activeProperty.units[0]
    );
  }, [activeProperty, selectedUnitId]);

  const safeRent = Number.isFinite(currentRent) && currentRent > 0 ? currentRent : 0;
  const newRent = Math.round(safeRent * (1 + increaseRate / 100));
  const monthlyDiff = newRent - safeRent;
  const yearlyDiff = monthlyDiff * 12;

  const blurStyle = demoBlur
    ? 'blur-[6px] hover:blur-none transition-[filter] duration-200 select-none cursor-help'
    : 'transition-[filter] duration-200';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <BrandMark />

          <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-ink-muted whitespace-nowrap">
            <a href="#kat-plani" className="hover:text-ink transition-colors">
              Kat & Mülk Planı
            </a>
            <a href="#ozellikler" className="hover:text-ink transition-colors">
              Özellikler
            </a>
            <a href="#hesaplayici" className="hover:text-ink transition-colors">
              Kira Hesaplayıcı
            </a>
            <a href="#roller" className="hover:text-ink transition-colors">
              Ev Sahibi & Kiracı
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-hairline bg-canvas text-[12.5px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
            >
              {theme === 'light' ? 'Koyu' : 'Açık'}
            </button>
            {isAuthenticated ? (
              <Link
                to="/panel"
                className="px-3.5 sm:px-4 py-2 rounded-xl bg-accent text-white text-[13px] sm:text-[13.5px] font-medium hover:bg-accent-hover transition-colors whitespace-nowrap"
              >
                Panele Git →
              </Link>
            ) : (
              <>
                <Link
                  to="/giris"
                  className="px-2.5 sm:px-3.5 py-2 text-[13px] sm:text-[13.5px] font-medium text-ink-muted hover:text-ink transition-colors whitespace-nowrap"
                >
                  Giriş Yap
                </Link>
                <Link
                  to="/kayit"
                  className="px-3 sm:px-4 py-2 rounded-xl bg-accent text-white text-[12.5px] sm:text-[13.5px] font-medium hover:bg-accent-hover transition-colors whitespace-nowrap"
                >
                  Ücretsiz Başla
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="cloud-grid border-b border-hairline">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[12px] font-medium text-accent">
                Android & Web Tek Hesapla Senkron
              </span>
            </div>

            <h1 className="text-[34px] sm:text-[50px] leading-[1.08] font-bold tracking-[-0.03em] text-ink">
              Mülk yönetiminde{' '}
              <span className="text-accent">yeni dönem.</span>
            </h1>

            <p className="text-[15px] sm:text-[16.5px] leading-[1.65] text-ink-muted max-w-lg">
              Tüm dairelerinizi, iş yerlerinizi, aylık kira tahsilatlarınızı ve mülk
              bazlı kazanç geçmişinizi Android uygulamanızla birebir uyumlu web
              panelinden yönetin.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              <Link
                to={isAuthenticated ? '/panel' : '/kayit'}
                className="w-full sm:w-auto text-center px-5 sm:px-6 py-3 rounded-xl bg-accent text-white text-[14.5px] font-semibold hover:bg-accent-hover shadow-[0_8px_20px_-10px_rgba(29,161,242,0.8)] transition-all"
              >
                {isAuthenticated ? 'Panele Devam Et →' : 'Ücretsiz Hesap Oluştur →'}
              </Link>
              <Link
                to="/giris"
                className="flex-1 sm:flex-none text-center px-5 py-3 rounded-xl border border-hairline bg-paper text-ink text-[14.5px] font-medium hover:border-accent/50 transition-colors"
              >
                Giriş Yap
              </Link>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-hairline bg-paper text-ink text-[13.5px] font-medium hover:border-accent/50 transition-colors whitespace-nowrap"
              >
                <img
                  src="/app-logo.png"
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-md object-cover shrink-0"
                />
                <span>Google Play</span>
              </a>
            </div>

            <div className="pt-4 border-t border-hairline grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md">
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle font-medium">
                  Mülk Tipi
                </div>
                <div className="mt-1 text-[13.5px] font-semibold text-ink">
                  Konut & İşyeri
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle font-medium">
                  Belgeler
                </div>
                <div className="mt-1 text-[13.5px] font-semibold text-ink">
                  PDF Makbuz & Kontrat
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle font-medium">
                  Platform
                </div>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[13.5px] font-semibold text-accent hover:underline"
                >
                  Android & Web ↗
                </a>
              </div>
            </div>
          </div>

          {/* Interactive Hero Preview (100% Fictional Data + Live Blur Demo) */}
          <div className="lg:col-span-6">
            <div className="bg-paper border border-hairline rounded-2xl shadow-[0_24px_56px_-28px_rgba(19,22,29,0.22)] overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b border-divider bg-variant/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {(
                    [
                      ['tenants', 'Kiracılarım'],
                      ['summary', 'Portföy Özeti'],
                      ['history', 'Mülk Kazancı'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setHeroTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                        heroTab === key
                          ? 'bg-accent text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Live Blur Demo Switch */}
                <button
                  type="button"
                  onClick={() => setDemoBlur((b) => !b)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-medium transition-colors cursor-pointer ${
                    demoBlur
                      ? 'border-accent/40 bg-accent-soft text-accent font-semibold'
                      : 'border-hairline bg-paper text-ink-muted hover:text-ink'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      demoBlur ? 'bg-accent' : 'bg-ink-subtle'
                    }`}
                  />
                  {demoBlur ? 'Gizlilik Açık' : 'Tutarları Gizle'}
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3 bg-canvas/55">
                {heroTab === 'tenants' &&
                  HERO_SAMPLE_TENANTS.map((t) => {
                    const accent = t.isBusiness ? '#D946EF' : '#0EA5E9';
                    const isAllPaid = t.paid === t.total;
                    const ringColor = isAllPaid ? '#00BA7C' : accent;
                    const pct = Math.round((t.paid / t.total) * 100);
                    return (
                      <div
                        key={t.name}
                        className="bg-paper border border-hairline rounded-2xl overflow-hidden shadow-[0_4px_14px_-12px_rgba(19,22,29,0.2)]"
                      >
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-semibold shrink-0"
                              style={{
                                backgroundColor: `${accent}1A`,
                                color: accent,
                              }}
                            >
                              {t.initial}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[14px] font-semibold text-ink truncate">
                                {t.name}
                              </div>
                              <div className="text-[11.5px] text-ink-muted truncate">
                                {t.place}
                              </div>
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10.5px] font-medium shrink-0"
                            style={{
                              backgroundColor: `${accent}14`,
                              color: accent,
                            }}
                          >
                            {t.isBusiness ? 'İşyeri' : 'Konut'}
                          </span>
                        </div>
                        <div className="border-t border-divider px-3 sm:px-4 py-2.5 grid grid-cols-3 items-center gap-1.5 sm:gap-2">
                          <div className="min-w-0">
                            <div className="text-[10px] text-ink-subtle">Aylık Kira</div>
                            <div
                              className={`font-mono text-[12px] sm:text-[13px] font-semibold text-ink tabular-nums truncate ${blurStyle}`}
                            >
                              {formatCurrency(t.rent)}
                            </div>
                          </div>
                          <div className="border-x border-divider px-2 sm:px-3 flex items-center justify-between gap-1">
                            <div>
                              <div className="text-[10px] text-ink-subtle">Ödeme</div>
                              <div className="font-mono text-[12px] sm:text-[13px] font-semibold text-ink tabular-nums">
                                {t.paid}/{t.total}
                              </div>
                            </div>
                            <MiniProgressRing percent={pct} color={ringColor} />
                          </div>
                          <div className="pl-1.5 sm:pl-2 min-w-0">
                            <div className="text-[10px] text-ink-subtle">Durum</div>
                            <div
                              className="text-[11.5px] sm:text-[12px] font-semibold truncate"
                              style={{ color: isAllPaid ? '#00BA7C' : 'var(--text-primary)' }}
                            >
                              {isAllPaid ? 'Tamamlandı' : 'Aktif'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {heroTab === 'summary' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#131823] via-[#172133] to-[#111927] text-white border border-[#273247] space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7FCBF9]">
                            Örnek Portföy Tahsilatı
                          </p>
                          <p className={`mt-1.5 font-mono text-[28px] font-bold tabular-nums ${blurStyle}`}>
                            ₺3.852.000
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#00BA7C]/20 text-[#34D399] font-mono text-[11px] font-semibold">
                          %92 Tahsilat
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#1DA1F2] to-[#00BA7C]" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[12px]">
                        <div>
                          <div className="text-white/55 text-[10.5px]">Aylık Gelir</div>
                          <div className={`font-mono font-bold text-[#7FCBF9] ${blurStyle}`}>
                            ₺378.000
                          </div>
                        </div>
                        <div>
                          <div className="text-white/55 text-[10.5px]">Doluluk</div>
                          <div className="font-mono font-bold text-white">12 / 14</div>
                        </div>
                        <div>
                          <div className="text-white/55 text-[10.5px]">Bekleyen</div>
                          <div className={`font-mono font-bold text-[#FBBF24] ${blurStyle}`}>
                            ₺112.000
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-paper border border-hairline space-y-2.5">
                      <div className="flex justify-between text-[12px]">
                        <span className="font-semibold text-ink">Konut & İşyeri Dengesi</span>
                        <span className="font-mono text-ink-subtle">Konut %61 · İşyeri %39</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-variant overflow-hidden flex">
                        <div className="h-full w-[61%] bg-[#0EA5E9]" />
                        <div className="h-full w-[39%] bg-[#D946EF]" />
                      </div>
                    </div>
                  </div>
                )}

                {heroTab === 'history' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-paper border border-accent/25">
                      <p className="text-[11.5px] font-medium text-ink-muted">
                        Çınar Residence · Kümülatif Tahsil Edilen Kazanç
                      </p>
                      <div className="mt-1 flex items-baseline justify-between">
                        <p className={`font-mono text-[26px] font-bold text-ink tabular-nums ${blurStyle}`}>
                          ₺1.810.000
                        </p>
                        <span className="px-2.5 py-0.5 rounded-full bg-paid-soft text-paid font-mono text-[11px] font-semibold">
                          5 Aktif · 2 Eski Kiracı
                        </span>
                      </div>
                    </div>
                    {[
                      {
                        tenant: 'Selin Arslan',
                        unit: 'No: 5',
                        range: '01 Kas 2025 – 01 Kas 2026',
                        paidLabel: '12/12 taksit',
                        collected: 408000,
                        active: true,
                      },
                      {
                        tenant: 'Sibel Karaca',
                        unit: 'No: 5',
                        range: '01 Kas 2024 – 01 Kas 2025',
                        paidLabel: '12/12 taksit',
                        collected: 264000,
                        active: false,
                      },
                      {
                        tenant: 'Caner Aksoy',
                        unit: 'No: 4',
                        range: '15 Nis 2025 – 15 Nis 2026',
                        paidLabel: '12/12 taksit',
                        collected: 216000,
                        active: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.tenant}
                        className="p-3.5 rounded-2xl bg-paper border border-hairline flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.active ? 'bg-paid' : 'bg-ink-subtle'
                              }`}
                            />
                            <span className="text-[13.5px] font-semibold text-ink">
                              {item.tenant}
                            </span>
                            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-variant text-ink-muted">
                              {item.active ? 'Aktif' : 'Eski Kiracı'}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-ink-muted pl-4 mt-0.5">
                            {item.unit} · {item.range}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`font-mono text-[14px] font-bold text-paid tabular-nums ${blurStyle}`}>
                            {formatCurrency(item.collected)}
                          </div>
                          <div className="font-mono text-[11px] text-ink-subtle">
                            {item.paidLabel}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Modern Interactive "Akıllı Kat & Mülk Planı" Section (Mirrors Mobile PropertyManagementScreen) */}
      <section id="kat-plani" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-22 space-y-7 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
              Akıllı Kat & Mülk Planı
            </p>
            <h2 className="mt-2 text-[26px] sm:text-[38px] leading-[1.14] font-bold tracking-[-0.025em] text-ink">
              Binalarınızı kat kat görün, her daireye tek dokunuşla ulaşın.
            </h2>
            <p className="mt-2.5 text-[14.5px] leading-[1.6] text-ink-muted">
              Aşağıdaki etkileşimli örnekte binalar arasında geçiş yapın, dolu/boş
              birimleri filtreleyin ve herhangi bir daireye tıklayarak sözleşme ve
              kazanç özetini inceleyin.
            </p>
          </div>

          {/* Mobile-Matched PropertyStatHeader Mini Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-paper border border-accent/25">
              <div className="font-mono text-[17px] sm:text-[19px] font-bold text-ink tabular-nums">
                {portfolioStats.properties}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-medium text-ink-muted">Mülk / Bina</div>
            </div>
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-paper border border-paid/30">
              <div className="font-mono text-[17px] sm:text-[19px] font-bold text-paid tabular-nums">
                {portfolioStats.occupied}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-medium text-ink-muted">Dolu Daire</div>
            </div>
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-paper border border-warn/35">
              <div className="font-mono text-[17px] sm:text-[19px] font-bold text-warn tabular-nums">
                {portfolioStats.vacant}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-medium text-ink-muted">Boş Daire</div>
            </div>
          </div>
        </div>

        {/* Interactive Building Selector Cards (Mirrors Mobile PropertySelectorCard) */}
        <div className="grid sm:grid-cols-3 gap-3.5">
          {DEMO_PROPERTIES.map((prop) => {
            const occupied = prop.units.filter((u) => u.occupied).length;
            const total = prop.units.length;
            const rate = Math.round((occupied / total) * 100);
            const selected = prop.id === activeProperty.id;
            return (
              <button
                key={prop.id}
                type="button"
                onClick={() => {
                  setSelectedPropId(prop.id);
                  setSelectedUnitId(prop.units[0].id);
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  selected
                    ? 'border-accent bg-paper shadow-[0_12px_30px_-18px_rgba(29,161,242,0.45)] ring-1 ring-accent/25'
                    : 'border-hairline bg-paper/70 hover:bg-paper hover:-translate-y-0.5'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-ink truncate">
                    {prop.name}
                  </div>
                  <div className="text-[12px] text-ink-muted truncate mt-0.5">
                    {prop.district}
                  </div>
                  <div className="text-[11.5px] font-medium text-ink-subtle mt-1.5">
                    {occupied} Dolu · {total - occupied} Boş
                  </div>
                </div>
                <MiniProgressRing
                  percent={rate}
                  color={rate === 100 ? '#00BA7C' : '#1DA1F2'}
                />
              </button>
            );
          })}
        </div>

        {/* Interactive Multi-Floor Blueprint + Selected Unit Detail Inspector */}
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Left: Floor-by-Floor Blueprint Card */}
          <div className="lg:col-span-7 bg-paper border border-hairline rounded-2xl shadow-[0_14px_36px_-24px_rgba(19,22,29,0.18)] p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-divider">
              <div>
                <h3 className="text-[17px] font-bold text-ink">{activeProperty.name}</h3>
                <p className="text-[12.5px] text-ink-muted mt-0.5">
                  {activeProperty.address}
                </p>
              </div>
              <div className="inline-flex p-1 rounded-xl bg-canvas border border-hairline">
                {(
                  [
                    ['all', `Tümü (${activeProperty.units.length})`],
                    [
                      'occupied',
                      `Dolu (${activeProperty.units.filter((u) => u.occupied).length})`,
                    ],
                    [
                      'vacant',
                      `Boş (${activeProperty.units.filter((u) => !u.occupied).length})`,
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setUnitFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      unitFilter === key
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
            </div>

            {filteredBlueprintFloors.length === 0 ? (
              <div className="py-10 text-center text-[13.5px] text-ink-muted">
                Bu filtrede gösterilecek birim bulunmuyor.
              </div>
            ) : (
              <div className="space-y-5">
                {filteredBlueprintFloors.map(([floorName, group]) => {
                  const occInFloor = group.units.filter((u) => u.occupied).length;
                  return (
                    <div key={floorName} className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-variant text-[11.5px] font-bold text-ink">
                          {floorName}
                        </span>
                        <span className="h-px flex-1 bg-divider" />
                        <span className="font-mono text-[11px] text-ink-subtle">
                          {occInFloor}/{group.units.length} dolu
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {group.units.map((unit) => {
                          const isSelected = activeUnit.id === unit.id;
                          const allPaid =
                            unit.occupied &&
                            unit.paid != null &&
                            unit.total != null &&
                            unit.paid === unit.total;
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => setSelectedUnitId(unit.id)}
                              className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                  ? 'border-accent ring-2 ring-accent/20 bg-paper shadow-sm'
                                  : unit.occupied
                                    ? 'border-paid/30 bg-paid-soft/60 hover:border-paid'
                                    : 'border-warn/35 bg-warn-soft/70 hover:border-warn'
                              }`}
                            >
                              <span
                                className={`absolute left-0 top-0 bottom-0 w-1 ${
                                  unit.occupied ? 'bg-paid' : 'bg-warn'
                                }`}
                              />
                              <div className="pl-2 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13.5px] font-bold text-ink">
                                    No: {unit.doorNo}
                                  </span>
                                  <span className="text-[11px] text-ink-muted font-medium">
                                    {unit.roomInfo}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-[12.5px] font-semibold truncate ${
                                      unit.occupied ? 'text-paid' : 'text-warn'
                                    }`}
                                  >
                                    {unit.occupied
                                      ? unit.tenantName
                                      : 'Boş · Kiracı Atamaya Hazır'}
                                  </span>
                                  {unit.occupied && unit.rent && (
                                    <span
                                      className={`font-mono text-[12px] font-bold text-ink shrink-0 ${blurStyle}`}
                                    >
                                      {formatCurrency(unit.rent)}
                                    </span>
                                  )}
                                </div>
                                {unit.occupied && unit.paid != null && unit.total != null && (
                                  <div className="flex items-center justify-between pt-1">
                                    <div className="h-1.5 flex-1 mr-3 rounded-full bg-hairline overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${Math.round((unit.paid / unit.total) * 100)}%`,
                                          backgroundColor: allPaid ? '#00BA7C' : '#1DA1F2',
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`font-mono text-[10.5px] font-semibold ${
                                        allPaid ? 'text-paid' : 'text-ink-subtle'
                                      }`}
                                    >
                                      {unit.paid}/{unit.total}
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

          {/* Right: Live Selected Unit Inspector */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-paper border border-hairline shadow-[0_14px_36px_-24px_rgba(19,22,29,0.18)] p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      activeUnit.occupied
                        ? 'bg-paid-soft text-paid'
                        : 'bg-warn-soft text-warn'
                    }`}
                  >
                    {activeUnit.occupied ? 'Dolu Birim' : 'Boş Birim'}
                  </span>
                  <h4 className="mt-2 text-[19px] font-bold text-ink">
                    {activeProperty.name} · No: {activeUnit.doorNo}
                  </h4>
                  <p className="text-[12.5px] text-ink-muted mt-0.5">
                    {activeUnit.floor} · {activeUnit.roomInfo} ·{' '}
                    {activeUnit.isBusiness ? 'İşyeri' : 'Konut'}
                  </p>
                </div>
              </div>

              {activeUnit.occupied ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-canvas border border-hairline space-y-2">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">Aktif Kiracı</span>
                      <span className="font-semibold text-ink">{activeUnit.tenantName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">Sözleşme Dönemi</span>
                      <span className="font-mono text-[12px] text-ink">
                        {activeUnit.contractPeriod}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">Aylık Kira</span>
                      <span className={`font-mono font-bold text-accent ${blurStyle}`}>
                        {formatCurrency(activeUnit.rent ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-ink-muted">Ödeme İlerlemesi</span>
                      <span className="font-mono font-bold text-paid">
                        {activeUnit.paid}/{activeUnit.total} Taksit
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-warn-soft/70 border border-warn/30 space-y-2">
                  <div className="text-[13.5px] font-bold text-warn">
                    Bu birim şu an kiracıya hazır
                  </div>
                  <p className="text-[12.5px] text-ink-muted leading-relaxed">
                    Panelde boş daireye dokunduğunuzda bina ve daire bilgileri otomatik
                    seçili olarak yeni kiracı sözleşmesi açılır.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-divider flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11.5px] text-ink-subtle">
                    Bu Dairenin Toplam Kazancı
                  </div>
                  <div className={`font-mono text-[22px] font-bold text-paid mt-0.5 ${blurStyle}`}>
                    {formatCurrency(activeUnit.cumulativeEarned)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11.5px] text-ink-subtle">Geçmiş Dönem</div>
                  <div className="text-[13.5px] font-semibold text-ink mt-0.5">
                    {activeUnit.pastTenantCount} eski kiracı
                  </div>
                </div>
              </div>
            </div>

            {/* Building Archived History Preview */}
            <div className="rounded-2xl bg-paper border border-hairline p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-ink">
                  {activeProperty.name} · Arşivden Örnekler
                </span>
                <span className="font-mono text-[11px] text-ink-subtle">Geçmiş Kazanç</span>
              </div>
              <div className="divide-y divide-divider">
                {activeProperty.archivedHistory.map((h) => (
                  <div
                    key={`${h.tenant}-${h.doorNo}`}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-[13px] font-semibold text-ink">
                        {h.tenant}{' '}
                        <span className="text-[11.5px] font-normal text-ink-subtle">
                          ({h.doorNo})
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted">{h.period}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-[13px] font-bold text-paid ${blurStyle}`}>
                        {formatCurrency(h.collected)}
                      </div>
                      <div className="font-mono text-[10.5px] text-ink-subtle">
                        {h.paidLabel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Capabilities */}
      <section id="ozellikler" className="border-t border-hairline bg-paper/55">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
              Diğer Özellikler
            </p>
            <h2 className="mt-2 text-[28px] sm:text-[34px] leading-[1.15] font-bold tracking-[-0.025em] text-ink">
              Android uygulamanızdaki her akış, webde birebir elinizin altında.
            </h2>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {EXTRA_CAPABILITIES.map((item) => (
              <article
                key={item.title}
                className="p-6 rounded-2xl border border-hairline bg-paper hover:border-accent/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between gap-6 shadow-[0_8px_24px_-20px_rgba(19,22,29,0.16)]"
              >
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {item.tag}
                  </span>
                  <h3 className="mt-3 text-[17px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-muted">
                    {item.body}
                  </p>
                </div>
                <div className="pt-3.5 border-t border-divider text-[11.5px] font-medium text-ink-subtle">
                  {item.meta}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Live Rent Increase Calculator */}
      <section id="hesaplayici" className="border-y border-hairline bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-18 sm:py-22 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-3.5">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">
              Kira Artış Hesaplayıcı
            </p>
            <h2 className="text-[30px] sm:text-[36px] leading-[1.15] font-bold tracking-[-0.025em] text-ink">
              Yeni dönem kiranızı anında hesaplayın.
            </h2>
            <p className="text-[14.5px] leading-[1.6] text-ink-muted">
              TÜFE veya özel artış oranıyla yeni kira bedelini hesaplayın; panelde tek
              tıkla kiracınızın yenileme sözleşmesine aktarın.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-hairline bg-canvas p-6 sm:p-7 space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="landing-rent-input"
                    className="block text-[12.5px] font-medium text-ink-muted mb-2"
                  >
                    Mevcut Kira Tutarı (₺)
                  </label>
                  <input
                    id="landing-rent-input"
                    type="number"
                    min={0}
                    step={500}
                    value={currentRent}
                    onChange={(e) => setCurrentRent(Number(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl bg-paper border border-hairline font-mono text-[16px] font-semibold text-ink tabular-nums focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[12.5px] font-medium text-ink-muted mb-2">
                    <span>Artış Oranı</span>
                    <span className="px-2 py-0.5 rounded-md bg-accent-soft font-mono font-semibold text-accent tabular-nums">
                      %{increaseRate}
                    </span>
                  </div>
                  <div className="pt-2.5 pb-1">
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={1}
                      value={increaseRate}
                      onChange={(e) => setIncreaseRate(Number(e.target.value))}
                      className="w-full brand-range"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {QUICK_RATES.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setIncreaseRate(rate)}
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-mono font-medium transition-colors cursor-pointer ${
                          increaseRate === rate
                            ? 'bg-accent text-white'
                            : 'bg-paper border border-hairline text-ink-muted hover:text-ink'
                        }`}
                      >
                        %{rate}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-hairline grid sm:grid-cols-3 gap-4 items-end">
                <div>
                  <p className="text-[12px] text-ink-subtle">Yeni Kira Tutarı</p>
                  <p className="font-mono text-[28px] font-bold text-paid tabular-nums leading-tight mt-1">
                    {formatCurrency(newRent)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-subtle">Aylık Fark</p>
                  <p className="font-mono text-[17px] font-semibold text-ink tabular-nums mt-1">
                    +{formatCurrency(monthlyDiff)}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-subtle">Yıllık Toplam Fark</p>
                  <p className="font-mono text-[17px] font-semibold text-accent tabular-nums mt-1">
                    +{formatCurrency(yearlyDiff)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Roles */}
      <section id="roller" className="max-w-6xl mx-auto px-6 py-18 sm:py-22">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-8 rounded-2xl border border-hairline bg-paper space-y-5 shadow-[0_8px_24px_-20px_rgba(19,22,29,0.14)]">
            <span className="inline-block px-2.5 py-1 rounded-lg bg-accent-soft text-[11.5px] font-semibold text-accent">
              Mülk Sahibi Paneli
            </span>
            <h3 className="text-[24px] font-bold tracking-[-0.02em] text-ink">
              Binalarınız ve kiracılarınız tam kontrolde
            </h3>
            <ul className="space-y-2.5 text-[14px] text-ink-muted leading-relaxed">
              <li>— Kat bazlı akıllı mülk planı ile anlık boş/dolu takibi</li>
              <li>— Tekil ve toplu taksit tahsilatı + isteğe bağlı PDF/WhatsApp makbuzu</li>
              <li>— Sözleşme bittiğinde tek akışta yenileme veya tahliye</li>
              <li>— Mülk ve daire bazlı geçmiş kiracılar ve toplam kazanç</li>
            </ul>
          </div>

          <div className="p-8 rounded-2xl border border-hairline bg-paper space-y-5 shadow-[0_8px_24px_-20px_rgba(19,22,29,0.14)]">
            <span className="inline-block px-2.5 py-1 rounded-lg bg-paid-soft text-[11.5px] font-semibold text-paid">
              Kiracı Portalı
            </span>
            <h3 className="text-[24px] font-bold tracking-[-0.02em] text-ink">
              Kira ve aidat geçmişiniz hep elinizin altında
            </h3>
            <ul className="space-y-2.5 text-[14px] text-ink-muted leading-relaxed">
              <li>— Kira taksitleri ve aidat ödemelerini tek ekranda izleme</li>
              <li>— Ev sahibi IBAN ve iletişim bilgilerine hızlı erişim</li>
              <li>— Sözleşme bitiş tarihi ve kalan taksit özeti</li>
              <li>— Android uygulamasıyla aynı kullanıcı bilgileriyle giriş</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="dark-panel-grid rounded-2xl px-6 py-10 sm:px-12 sm:py-14 border border-[#2A2D37] flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#1DA1F2]">
              Hemen Başlayın
            </p>
            <h2 className="mt-2.5 text-[25px] sm:text-[34px] leading-[1.15] font-bold tracking-[-0.025em] text-[#E8E8E8]">
              Mevcut Kira Takip hesabınızla Android ve webde devam edin.
            </h2>
            <p className="mt-3 text-[13.5px] text-[#8B8D97]">
              Sorularınız ve destek talepleriniz için{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[#7FCBF9] hover:underline font-medium"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              adresinden bize ulaşabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/giris"
              className="px-5 sm:px-6 py-3 rounded-xl bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover transition-colors"
            >
              Giriş Yap →
            </Link>
            <Link
              to="/kayit"
              className="px-5 sm:px-6 py-3 rounded-xl border border-[#33363F] text-[#E8E8E8] text-[14px] font-medium hover:border-white/40 transition-colors"
            >
              Hesap Oluştur
            </Link>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1D27] border border-[#33363F] text-[#E8E8E8] text-[13.5px] font-medium hover:border-[#1DA1F2]/60 transition-colors"
            >
              <img
                src="/app-logo.png"
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 rounded-md object-cover shrink-0"
              />
              <span>Google Play'de İndir</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline bg-paper">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-4">
              <BrandMark />
              <p className="text-[13.5px] leading-relaxed text-ink-muted max-w-sm">
                Ev sahipleri ve kiracılar için Android ve Web üzerinde kat bazlı mülk,
                kira takvimi, makbuz ve geçmiş kazanç yönetimi.
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-hairline bg-canvas hover:border-accent/50 transition-colors"
              >
                <img
                  src="/app-logo.png"
                  alt="Kira Net Google Play Logo"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg object-cover shrink-0"
                />
                <div className="text-left leading-tight">
                  <div className="text-[10.5px] text-ink-subtle uppercase tracking-[0.06em]">
                    Google Play
                  </div>
                  <div className="text-[13px] font-semibold text-ink">
                    Android Uygulamasını İndir ↗
                  </div>
                </div>
              </a>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
                Platform
              </h3>
              <ul className="space-y-2 text-[13.5px] text-ink-muted">
                <li>
                  <a href="#kat-plani" className="hover:text-ink transition-colors">
                    Kat & Mülk Planı
                  </a>
                </li>
                <li>
                  <a href="#ozellikler" className="hover:text-ink transition-colors">
                    Özellikler
                  </a>
                </li>
                <li>
                  <a href="#hesaplayici" className="hover:text-ink transition-colors">
                    Kira Hesaplayıcı
                  </a>
                </li>
                <li>
                  <Link to="/giris" className="hover:text-ink transition-colors">
                    Giriş Yap
                  </Link>
                </li>
                <li>
                  <Link to="/kayit" className="hover:text-ink transition-colors">
                    Hesap Oluştur
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
                İletişim & Destek
              </h3>
              <ul className="space-y-2.5 text-[13.5px] text-ink-muted">
                <li>
                  <div className="text-[11px] text-ink-subtle">Destek E-postası</div>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-mono text-[13px] font-medium text-accent hover:underline break-all"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <div className="text-[11px] text-ink-subtle">Mobil Uygulama</div>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-medium text-ink hover:text-accent transition-colors"
                  >
                    Google Play · Kira Net (Android) ↗
                  </a>
                </li>
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="px-3 py-1.5 rounded-lg border border-hairline bg-canvas text-[12px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    {theme === 'light' ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-divider flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-ink-subtle">
            <span>© {new Date().getFullYear()} Kira Takip · FatalSoft</span>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/sifremi-unuttum" className="hover:text-ink transition-colors">
                Şifremi Unuttum
              </Link>
              <span>·</span>
              <span>Android & Web</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
