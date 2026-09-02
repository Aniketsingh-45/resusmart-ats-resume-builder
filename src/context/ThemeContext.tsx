import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'bright';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('resusmart_theme');
    if (saved === 'bright' || saved === 'dark') return saved;
    return 'dark';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('resusmart_theme', newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'bright' : 'dark';
    setTheme(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    if (theme === 'bright') {
      root.classList.remove('dark');
      root.classList.add('bright');
      document.body.classList.remove('dark');
      document.body.classList.add('bright');
    } else {
      root.classList.remove('bright');
      root.classList.add('dark');
      document.body.classList.remove('bright');
      document.body.classList.add('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
