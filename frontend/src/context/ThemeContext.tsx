import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'pink';

interface ThemeSettings {
  mode: ThemeMode;
  accent: AccentColor;
  compactMode: boolean;
  animations: boolean;
}

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (updates: Partial<ThemeSettings>) => void;
  resolvedMode: 'dark' | 'light';
}

const defaultSettings: ThemeSettings = {
  mode: 'dark',
  accent: 'green',
  compactMode: false,
  animations: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'corpspend-theme';

// Accent color CSS variable mappings
const accentColors: Record<AccentColor, { primary: string; hover: string; glow: string }> = {
  green: {
    primary: '34, 197, 94',    // vault-500
    hover: '22, 163, 74',      // vault-600
    glow: '34, 197, 94',
  },
  blue: {
    primary: '59, 130, 246',   // blue-500
    hover: '37, 99, 235',      // blue-600
    glow: '59, 130, 246',
  },
  purple: {
    primary: '168, 85, 247',   // purple-500
    hover: '147, 51, 234',     // purple-600
    glow: '168, 85, 247',
  },
  orange: {
    primary: '249, 115, 22',   // orange-500
    hover: '234, 88, 12',      // orange-600
    glow: '249, 115, 22',
  },
  pink: {
    primary: '236, 72, 153',   // pink-500
    hover: '219, 39, 119',     // pink-600
    glow: '236, 72, 153',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [systemMode, setSystemMode] = useState<'dark' | 'light'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Resolve the actual mode
  const resolvedMode = settings.mode === 'system' ? systemMode : settings.mode;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const accent = accentColors[settings.accent];

    // Set color mode class
    root.classList.remove('dark', 'light');
    root.classList.add(resolvedMode);

    // Set accent color CSS variables
    root.style.setProperty('--accent-primary', accent.primary);
    root.style.setProperty('--accent-hover', accent.hover);
    root.style.setProperty('--accent-glow', accent.glow);

    // Set compact mode
    if (settings.compactMode) {
      root.classList.add('compact');
    } else {
      root.classList.remove('compact');
    }

    // Set animations preference
    if (!settings.animations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, resolvedMode]);

  const updateSettings = (updates: Partial<ThemeSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

