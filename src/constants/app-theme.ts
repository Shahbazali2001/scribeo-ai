export interface ThemePalette {
  isDark: boolean;
  bg: string;
  bgElevated: string;
  bgCard: string;
  bgInput: string;
  bgSubtle: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderFocus: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  amber: string;
  amberSoft: string;
  danger: string;
  dangerSoft: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const LIGHT_PALETTE: ThemePalette = {
  isDark: false,
  bg: '#F7F5F0', // Warm editorial paper background
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgInput: '#F1EFEA',
  bgSubtle: '#EAE6DF',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEA',
  border: '#E2DDD5',
  borderFocus: '#0D9488',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  primary: '#0D9488', // Deep Teal / Emerald
  primaryHover: '#0F766E',
  primarySoft: '#CCFBF1',
  primaryText: '#FFFFFF',
  accent: '#D97706', // Warm Amber
  accentSoft: '#FEF3C7',
  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E0D8',
};

export const DARK_PALETTE: ThemePalette = {
  isDark: true,
  bg: '#0B1114', // Deep Obsidian Teal-Slate
  bgElevated: '#121B20',
  bgCard: '#152026',
  bgInput: '#0E161A',
  bgSubtle: '#1C2A32',
  surface: '#152026',
  surfaceMuted: '#0E161A',
  border: '#23343E',
  borderFocus: '#14B8A6',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#14B8A6', // Vibrant Teal
  primaryHover: '#0D9488',
  primarySoft: '#113835',
  primaryText: '#042F2E',
  accent: '#F59E0B',
  accentSoft: '#3B2806',
  success: '#10B981',
  successSoft: '#06392A',
  warning: '#F59E0B',
  warningSoft: '#3B2806',
  amber: '#F59E0B',
  amberSoft: '#3B2806',
  danger: '#EF4444',
  dangerSoft: '#3B1215',
  tabBarBg: '#10181C',
  tabBarBorder: '#1E2D35',
};
