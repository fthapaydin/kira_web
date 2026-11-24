import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { BrandMark } from './BrandMark';

interface AuthSplitLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const SHOWCASE_POINTS = [
  {
    color: '#1DA1F2',
    title: 'Akıllı Mülk Takibi',
    desc: 'Dairelerin doluluk durumlarını, kat planını ve kontrat bitiş tarihlerini tek ekranda takip edin.',
  },
  {
    color: '#00BA7C',
    title: 'Finansal Kontrol',
    desc: 'Gelen kiraları işleyin, geciken ödemeleri anında görün ve isteğe bağlı makbuz paylaşın.',
  },
  {
    color: '#38BDF8',
    title: 'Mobil & Web Senkron',
    desc: 'Telefondaki tüm kiracılarınız, mülkleriniz ve geçmiş kazançlarınız aynı hesapla anında senkronize olur.',
  },
];

export function AuthSplitLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthSplitLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-canvas">
      {/* Left Dark Surface Column (Mirrors Mobile surfaceDark #0F1117 & primary #1DA1F2) */}
      <aside className="hidden lg:flex lg:col-span-5 dark-panel-grid text-[#E8E8E8] flex-col justify-between p-12 border-r border-[#2A2D37]">
        <div className="flex items-center justify-between">
          <BrandMark inverted />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8B8D97]">
            Web Portal
          </span>
        </div>

        <div className="space-y-8 max-w-md">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#1DA1F2] mb-3">
              Rent Tracker
            </p>
            <h2 className="text-[32px] leading-[1.18] font-bold tracking-[-0.03em] text-[#E8E8E8]">
              Mülk yönetiminde
              <br />
              yeni dönem.
            </h2>
            <p className="mt-3.5 text-[14px] leading-relaxed text-[#8B8D97]">
              Tüm dairelerinizi, kiracılarınızı ve finansal akışınızı tek bir platform
              üzerinden, karmaşadan uzak şekilde yönetin.
            </p>
          </div>

          <div className="space-y-3">
            {SHOWCASE_POINTS.map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-2xl bg-[#1A1D27]/90 border border-[#2A2D37] flex items-start gap-3.5"
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <h3 className="text-[14px] font-medium text-[#E8E8E8]">
                    {item.title}
                  </h3>
                  <p className="text-[12.5px] text-[#8B8D97] leading-relaxed mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px] text-[#5A5C66] pt-6 border-t border-[#2A2D37]">
          <span>Android ve Web tek hesapla senkron</span>
          <span className="font-mono">TR · ₺</span>
        </div>
      </aside>

      {/* Right Form Workspace */}
      <main className="lg:col-span-7 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 bg-canvas">
        <div className="flex items-center justify-between gap-4">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <Link
            to="/"
            className="text-[13px] font-medium text-ink-muted hover:text-ink transition-colors"
          >
            ← Ana sayfaya dön
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-lg border border-hairline bg-paper text-[12px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            {theme === 'light' ? 'Koyu Tema' : 'Açık Tema'}
          </button>
        </div>

        <div className="w-full max-w-[430px] mx-auto my-8">
          <div className="bg-paper border border-hairline rounded-2xl p-7 sm:p-9 shadow-[0_12px_36px_-20px_rgba(19,22,29,0.12)]">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-accent mb-2">
              {eyebrow}
            </p>
            <h1 className="text-[28px] leading-[1.2] text-ink font-bold tracking-[-0.025em]">
              {title}
            </h1>
            <p className="mt-2 text-[14px] text-ink-muted leading-relaxed">
              {subtitle}
            </p>

            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 pt-5 border-t border-divider">{footer}</div>}
          </div>
        </div>

        <div className="text-center lg:text-left text-[12px] text-ink-subtle">
          © {new Date().getFullYear()} Kira Takip. Tüm hakları saklıdır.
        </div>
      </main>
    </div>
  );
}
