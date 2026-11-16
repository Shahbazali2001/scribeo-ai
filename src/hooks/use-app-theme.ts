import { useColorScheme } from 'react-native';
import { DARK_PALETTE, LIGHT_PALETTE, ThemePalette } from '@/constants/app-theme';
import { useAppStore } from '@/hooks/use-app-store';

export function useAppTheme(): ThemePalette {
  const systemScheme = useColorScheme();
  const themeSetting = useAppStore((s) => s.profile.settings.theme);

  const effective =
    themeSetting === 'system' ? (systemScheme ?? 'light') : themeSetting;

  return effective === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}
