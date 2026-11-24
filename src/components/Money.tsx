import { usePreferences } from '../context/PreferencesContext';
import { formatCurrency } from '../lib/formatters';

interface MoneyProps {
  amount: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function Money({ amount, prefix = '', suffix = '', className = '' }: MoneyProps) {
  const { prefs } = usePreferences();
  const formatted = `${prefix}${formatCurrency(amount)}${suffix}`;

  if (!prefs.hideAmounts) {
    return <span className={`tabular-nums ${className}`}>{formatted}</span>;
  }

  if (prefs.privacyStyle === 'mask') {
    return (
      <span
        title={prefs.revealOnHover ? formatted : 'Tutar gizli (Ayarlardan açabilirsiniz)'}
        className={`group/money relative inline-flex items-center tabular-nums select-none ${className}`}
      >
        <span className={prefs.revealOnHover ? 'group-hover/money:hidden' : ''}>
          {prefix}₺ •••••{suffix}
        </span>
        {prefs.revealOnHover && (
          <span className="hidden group-hover/money:inline">{formatted}</span>
        )}
      </span>
    );
  }

  const blurClass =
    prefs.privacyStyle === 'blur-soft'
      ? 'blur-[4px]'
      : prefs.privacyStyle === 'blur-strong'
        ? 'blur-[11px]'
        : 'blur-[7px]';

  const hoverClass = prefs.revealOnHover ? 'hover:blur-none cursor-help' : '';

  return (
    <span
      aria-label="Gizli tutar"
      title={prefs.revealOnHover ? 'Görmek için üzerine gelin' : 'Tutar gizli'}
      className={`inline-block tabular-nums select-none transition-[filter] duration-200 ${blurClass} ${hoverClass} ${className}`}
    >
      {formatted}
    </span>
  );
}
