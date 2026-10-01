import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Navigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingNavigation: { name: keyof RootStackParamList; params?: any } | null = null;

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  } else {
    pendingNavigation = { name, params: params as any };
  }
}

export function flushPendingNavigation() {
  if (pendingNavigation && navigationRef.isReady()) {
    (navigationRef as any).navigate(pendingNavigation.name, pendingNavigation.params);
    pendingNavigation = null;
  }
}
