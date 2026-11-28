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
  bg: '#F4F7FB', // Clean cool paper background
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgInput: '#EDF2F8',
  bgSubtle: '#E3ECF7',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF2F8',
  border: '#DCE5F2',
  borderFocus: '#2563EB',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#2563EB', // Royal Blue
  primaryHover: '#1D4ED8',
  primarySoft: '#DBEAFE',
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
  tabBarBorder: '#E2E8F0',
};

export const DARK_PALETTE: ThemePalette = {
  isDark: true,
  bg: '#090F1A', // Deep Midnight Navy
  bgElevated: '#0F172A',
  bgCard: '#131E33',
  bgInput: '#0D1526',
  bgSubtle: '#1B2942',
  surface: '#131E33',
  surfaceMuted: '#0D1526',
  border: '#1E304F',
  borderFocus: '#3B82F6',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3B82F6', // Vibrant Blue
  primaryHover: '#2563EB',
  primarySoft: '#172B4D',
  primaryText: '#FFFFFF',
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
  tabBarBg: '#0C1322',
  tabBarBorder: '#1A2842',
};
