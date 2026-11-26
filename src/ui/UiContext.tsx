import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  UI_STORAGE_KEY,
  UI_THEME_META,
  resolveInitialUiVariant,
  type UiThemeMeta,
  type UiVariant,
} from './themes';

interface UiContextValue {
  uiVariant: UiVariant;
  setUiVariant: (variant: UiVariant) => void;
  themeMeta: UiThemeMeta;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [uiVariant, setUiVariantState] = useState<UiVariant>(resolveInitialUiVariant);

  const setUiVariant = useCallback((variant: UiVariant) => {
    setUiVariantState(variant);
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, variant);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.ui = uiVariant;
    const meta = UI_THEME_META[uiVariant];
    const themeMetaEl = document.querySelector('meta[name="theme-color"]');
    if (themeMetaEl) {
      themeMetaEl.setAttribute('content', meta.themeColor);
    }
  }, [uiVariant]);

  const value = useMemo<UiContextValue>(
    () => ({
      uiVariant,
      setUiVariant,
      themeMeta: UI_THEME_META[uiVariant],
    }),
    [uiVariant, setUiVariant]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error('useUi must be used within a UiProvider');
  }
  return ctx;
}
