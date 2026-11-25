import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  usePreferences,
  type CardDensity,
  type PrivacyStyle,
} from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';
import {
  ApiError,
  changePasswordApi,
  deleteSessionApi,
  fetchSessionsApi,
} from '../lib/api';
import { formatDate, getUserFullName } from '../lib/formatters';
import type { UserSession } from '../types/api';
import { Money } from './Money';

interface SettingsPanelProps {
  onNotify: (msg: string) => void;
}

const PRIVACY_STYLES: { value: PrivacyStyle; label: string; desc: string }[] = [
  { value: 'blur-soft', label: 'Hafif Blur', desc: '4px yumuşak bulanıklık' },
  { value: 'blur-medium', label: 'Orta Blur', desc: '7px dengeli bulanıklık' },
  { value: 'blur-strong', label: 'Güçlü Blur', desc: '11px tam gizlilik' },
  { value: 'mask', label: 'Maskele', desc: '₺ ••••• şeklinde gizle' },
];

export function SettingsPanel({ onNotify }: SettingsPanelProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { prefs, updatePrefs, resetPrefs } = usePreferences();

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSessionsApi()
      .then((list) => {
        if (active) setSessions(list);
      })
      .catch(() => {
        if (active) setSessions([]);
      })
      .finally(() => {
        if (active) setLoadingSessions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError(null);
    if (!currentPassword || !newPassword) {
      setPassError('Lütfen mevcut ve yeni şifrenizi girin.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Yeni şifreler eşleşmiyor.');
      return;
    }
    setIsChangingPass(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('Şifreniz başarıyla güncellendi.');
    } catch (err) {
      setPassError(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi.');
    } finally {
      setIsChangingPass(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      await deleteSessionApi(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onNotify('Oturum sonlandırıldı.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Oturum sonlandırılamadı.');
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Privacy & Amount Blurring */}
      <section className="rounded-2xl bg-paper border border-hairline shadow-[0_6px_24px_-16px_rgba(19,22,29,0.14)] overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-divider flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Gizlilik Modu
            </p>
            <h2 className="text-[17px] font-bold text-ink mt-1">
              Tutar Gizleme ve Bulanıklaştırma
            </h2>
            <p className="text-[13px] text-ink-muted mt-0.5">
              Kamusal alanda veya kiracı yanında ekranı açtığınızda tüm kira ve kazanç
              tutarlarını tek tuşla gizleyin. Kısayol: <kbd className="px-1.5 py-0.5 rounded bg-variant border border-hairline font-mono text-[11px] text-ink">Shift + H</kbd>
            </p>
          </div>

          {/* Live Blur Preview Pill */}
          <div className="px-4 py-3 rounded-xl bg-canvas border border-hairline min-w-[210px]">
            <div className="text-[10.5px] uppercase tracking-[0.08em] text-ink-subtle font-medium">
              Canlı Önizleme
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <Money
                amount={28000}
                className="font-mono text-[18px] font-bold text-accent"
              />
              <Money
                amount={1622500}
                className="font-mono text-[13px] font-semibold text-paid"
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <SettingToggleRow
            title="Tutarları Bulanıklaştır / Gizle"
            description="Paneldeki tüm gelir, kira, taksit ve kazanç tutarlarını anında gizler."
            checked={prefs.hideAmounts}
            onChange={(val) => updatePrefs({ hideAmounts: val })}
          />

          <div className="h-px bg-divider" />

          <SettingToggleRow
            title="Üzerine Gelince Geçici Göster (Hover)"
            description="Tutarlar gizliyken imleci tek bir rakamın üzerine getirdiğinizde sadece o tutarı geçici olarak netleştirir."
            checked={prefs.revealOnHover}
            onChange={(val) => updatePrefs({ revealOnHover: val })}
          />

          <div className="h-px bg-divider" />

          <SettingToggleRow
            title="Açılışta Her Zaman Gizli Başlat"
            description="Sayfayı her açtığınızda gizlilik modunu otomatik olarak aktif eder."
            checked={prefs.startHiddenOnLoad}
            onChange={(val) =>
              updatePrefs({
                startHiddenOnLoad: val,
                ...(val ? { hideAmounts: true } : {}),
              })
            }
          />

          <div className="h-px bg-divider" />

          {/* Privacy Style Selector */}
          <div>
            <div className="text-[13.5px] font-semibold text-ink">
              Gizleme Stili & Bulanıklık Seviyesi
            </div>
            <p className="text-[12px] text-ink-muted mt-0.5 mb-3">
              Bulanıklaştırma şiddetini veya tamamen maskeleme görünümünü seçin.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRIVACY_STYLES.map((opt) => {
                const active = prefs.privacyStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      updatePrefs({ privacyStyle: opt.value, hideAmounts: true })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-accent bg-accent-soft ring-1 ring-accent/25'
                        : 'border-hairline bg-canvas hover:border-accent/40'
                    }`}
                  >
                    <div
                      className={`text-[13.5px] font-semibold ${
                        active ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[11.5px] text-ink-muted mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Appearance + Workspace Defaults (2 Columns) */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Theme & Density */}
        <section className="rounded-2xl bg-paper border border-hairline shadow-[0_6px_24px_-16px_rgba(19,22,29,0.14)] p-6 space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Görünüm
            </p>
            <h2 className="text-[16.5px] font-bold text-ink mt-1">
              Tema ve Kart Yoğunluğu
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (theme !== 'light') toggleTheme();
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-accent ring-1 ring-accent/30 bg-[#F0F4F7]'
                  : 'border-hairline bg-canvas hover:border-accent/40'
              }`}
            >
              <div className="h-10 rounded-lg bg-white border border-[#DDE3E9] p-2 flex items-center justify-between mb-3">
                <span className="w-8 h-2 rounded bg-[#1DA1F2]" />
                <span className="w-4 h-2 rounded bg-[#00BA7C]" />
              </div>
              <div className="text-[13.5px] font-semibold text-[#13161D]">Açık Tema</div>
              <div className="text-[11.5px] text-[#5A6372]">Cloud · #F0F4F7</div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (theme !== 'dark') toggleTheme();
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-accent ring-1 ring-accent/30 bg-[#1A1D27]'
                  : 'border-hairline bg-[#0F1117] hover:border-accent/40'
              }`}
            >
              <div className="h-10 rounded-lg bg-[#232735] border border-[#33363F] p-2 flex items-center justify-between mb-3">
                <span className="w-8 h-2 rounded bg-[#1DA1F2]" />
                <span className="w-4 h-2 rounded bg-[#00BA7C]" />
              </div>
              <div className="text-[13.5px] font-semibold text-[#E8E8E8]">Koyu Tema</div>
              <div className="text-[11.5px] text-[#8B8D97]">Gece · #0F1117</div>
            </button>
          </div>

          <div className="pt-2">
            <div className="text-[13px] font-semibold text-ink mb-2">Kart Yoğunluğu</div>
            <div className="grid grid-cols-2 p-1 rounded-xl bg-variant border border-hairline">
              {(
                [
                  ['comfortable', 'Rahat Görünüm'],
                  ['compact', 'Kompakt Görünüm'],
                ] as [CardDensity, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => updatePrefs({ density: val })}
                  className={`py-2 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                    prefs.density === val
                      ? 'bg-paper text-ink shadow-xs font-semibold'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Receipt IBAN & Calculation Defaults */}
        <section className="rounded-2xl bg-paper border border-hairline shadow-[0_6px_24px_-16px_rgba(19,22,29,0.14)] p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Tercihler
              </p>
              <h2 className="text-[16.5px] font-bold text-ink mt-1">
                Makbuz & Hesaplama Varsayılanları
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                resetPrefs();
                onNotify('Tüm yerel tercihler varsayılana sıfırlandı.');
              }}
              className="text-[12px] font-medium text-ink-muted hover:text-danger cursor-pointer"
            >
              Sıfırla
            </button>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ink-muted mb-1.5">
              Varsayılan IBAN (PDF & WhatsApp makbuzlarına eklenir)
            </label>
            <input
              type="text"
              value={prefs.landlordIban}
              onChange={(e) => updatePrefs({ landlordIban: e.target.value.toUpperCase() })}
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-medium text-ink-muted mb-1.5">
                Varsayılan Artış Oranı (%)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={prefs.defaultIncreaseRate}
                onChange={(e) =>
                  updatePrefs({
                    defaultIncreaseRate: Math.max(
                      0,
                      Math.min(200, Number(e.target.value) || 0),
                    ),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline font-mono text-[14px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-medium text-ink-muted mb-1.5">
                Sözleşme Uyarı Eşiği
              </label>
              <select
                value={prefs.contractWarningDays}
                onChange={(e) =>
                  updatePrefs({
                    contractWarningDays: Number(e.target.value) as 30 | 60 | 90,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
              >
                <option value={30}>Son 30 gün</option>
                <option value={60}>Son 60 gün</option>
                <option value={90}>Son 90 gün</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* 3. Account Security & Active Sessions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account & Password */}
        <section className="rounded-2xl bg-paper border border-hairline shadow-[0_6px_24px_-16px_rgba(19,22,29,0.14)] p-6 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
              Hesap Güvenliği
            </p>
            <h2 className="text-[16.5px] font-bold text-ink mt-1">
              {user ? getUserFullName(user) : 'Hesap Bilgileri'}
            </h2>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              {user?.email}
              {user?.phone ? ` · ${user.phone}` : ''}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2 border-t border-divider">
            <div className="text-[13px] font-semibold text-ink">Şifre Değiştir</div>
            {passError && (
              <div className="px-3.5 py-2.5 rounded-xl bg-danger-soft border border-danger/30 text-[12.5px] text-danger">
                {passError}
              </div>
            )}
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Mevcut şifre"
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifre"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifre tekrar"
                className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-hairline text-[13.5px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPass}
              className="px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
            >
              {isChangingPass ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </section>

        {/* Active Sessions (Live from /v1/sessions) */}
        <section className="rounded-2xl bg-paper border border-hairline shadow-[0_6px_24px_-16px_rgba(19,22,29,0.14)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Cihazlar
              </p>
              <h2 className="text-[16.5px] font-bold text-ink mt-1">
                Aktif Oturumlar
              </h2>
            </div>
            <span className="font-mono text-[12px] text-ink-subtle">
              {sessions.length} cihaz
            </span>
          </div>

          {loadingSessions ? (
            <div className="space-y-2">
              <div className="h-14 rounded-xl bg-canvas animate-pulse" />
              <div className="h-14 rounded-xl bg-canvas animate-pulse" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-[13px] text-ink-muted">Aktif oturum bilgisi alınamadı.</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-canvas border border-hairline flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          s.current ? 'bg-paid' : 'bg-accent'
                        }`}
                      />
                      <span className="text-[13.5px] font-semibold text-ink truncate">
                        {s.deviceName || s.platform || 'Cihaz'}
                      </span>
                      {s.current && (
                        <span className="px-2 py-0.5 rounded-full bg-paid-soft text-paid text-[10.5px] font-semibold">
                          Bu Cihaz
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-ink-subtle pl-4 mt-0.5 truncate">
                      {[s.platform, s.osVersion, s.ipAddress, s.lastActiveAt ? formatDate(s.lastActiveAt) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {!s.current && (
                    <button
                      type="button"
                      disabled={revokingId === s.id}
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-2.5 py-1 rounded-lg border border-hairline text-[11.5px] font-medium text-danger hover:bg-danger-soft disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {revokingId === s.id ? '...' : 'Sonlandır'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SettingToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink">{title}</div>
        <p className="text-[12.5px] text-ink-muted mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${
          checked ? 'bg-accent' : 'bg-hairline'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
