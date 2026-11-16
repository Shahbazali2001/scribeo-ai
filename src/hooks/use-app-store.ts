import { useSyncExternalStore } from 'react';
import { appStore, AppState } from '@/store/app-store';

export function useAppStore<T = AppState>(selector?: (state: AppState) => T): T {
  const select = selector ?? ((state: AppState) => state as unknown as T);
  return useSyncExternalStore(
    (listener) => appStore.subscribe(listener),
    () => select(appStore.getState()),
    () => select(appStore.getState())
  );
}
