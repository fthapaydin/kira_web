import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type PrivacyStyle = 'blur-soft' | 'blur-medium' | 'blur-strong' | 'mask';
export type CardDensity = 'comfortable' | 'compact';

export interface AppPreferences {
  hideAmounts: boolean;
  startHiddenOnLoad: boolean;
  privacyStyle: PrivacyStyle;
  revealOnHover: boolean;
  density: CardDensity;
  defaultIncreaseRate: number;
  contractWarningDays: 30 | 60 | 90;
  landlordIban: string;
}

const STORAGE_KEY = 'kt_web_preferences_v1';

const DEFAULT_PREFS: AppPreferences = {
  hideAmounts: false,
  startHiddenOnLoad: false,
  privacyStyle: 'blur-medium',
  revealOnHover: true,
  density: 'comfortable',
  defaultIncreaseRate: 50,
  contractWarningDays: 90,
  landlordIban: '',
};

interface PreferencesContextValue {
  prefs: AppPreferences;
  updatePrefs: (patch: Partial<AppPreferences>) => void;
  toggleHideAmounts: () => void;
  resetPrefs: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadInitialPrefs(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    const merged: AppPreferences = { ...DEFAULT_PREFS, ...parsed };
    if (merged.startHiddenOnLoad) {
      merged.hideAmounts = true;
    }
    return merged;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(loadInitialPrefs);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage quota issues
    }
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<AppPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleHideAmounts = useCallback(() => {
    setPrefs((prev) => ({ ...prev, hideAmounts: !prev.hideAmounts }));
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
  }, []);

  // Global keyboard shortcut: Shift + H toggles privacy blur (outside inputs)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditable) return;

      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleHideAmounts();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleHideAmounts]);

  return (
    <PreferencesContext.Provider
      value={{ prefs, updatePrefs, toggleHideAmounts, resetPrefs }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}
