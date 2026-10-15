import { useWindowDimensions } from 'react-native';

export type ScreenType = 'small-phone' | 'phone' | 'large-phone' | 'tablet';

export const BREAKPOINTS = {
  smallPhoneMax: 359,
  phoneMax: 430,
  largePhoneMax: 767,
  tabletMin: 768,
};

export function getScreenType(width = 0, height = 0): ScreenType {
  const safeWidth = Math.max(width, 0);
  const safeHeight = Math.max(height, 0);

  if (safeWidth >= BREAKPOINTS.tabletMin) {
    return 'tablet';
  }

  if (safeWidth <= BREAKPOINTS.smallPhoneMax) {
    return 'small-phone';
  }

  if (safeWidth <= BREAKPOINTS.phoneMax) {
    return 'phone';
  }

  if (safeWidth <= BREAKPOINTS.largePhoneMax) {
    return 'large-phone';
  }

  return safeHeight >= BREAKPOINTS.tabletMin ? 'tablet' : 'large-phone';
}

export function isLandscape(width = 0, height = 0): boolean {
  return Math.max(width, 0) > Math.max(height, 0);
}

export function getResponsiveValue(
  width: number,
  small: number,
  phone: number,
  large: number,
  tablet = large,
): number {
  if (width <= BREAKPOINTS.smallPhoneMax) return small;
  if (width <= BREAKPOINTS.phoneMax) return phone;
  if (width >= BREAKPOINTS.tabletMin) return tablet;
  return large;
}

export function getResponsiveSpacing(width = 0, height = 0) {
  const screenType = getScreenType(width, height);

  const map: Record<ScreenType, { pagePadding: number; sectionGap: number; cardPadding: number }> = {
    'small-phone': { pagePadding: 16, sectionGap: 16, cardPadding: 12 },
    phone: { pagePadding: 18, sectionGap: 18, cardPadding: 14 },
    'large-phone': { pagePadding: 20, sectionGap: 20, cardPadding: 16 },
    tablet: { pagePadding: 28, sectionGap: 24, cardPadding: 18 },
  };

  return map[screenType];
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const screenType = getScreenType(width, height);
  const orientation = isLandscape(width, height) ? 'landscape' : 'portrait';

  return {
    width,
    height,
    screenType,
    orientation,
    isLandscape: orientation === 'landscape',
    isTablet: screenType === 'tablet',
    isCompact: screenType === 'small-phone' || screenType === 'phone',
    spacing: getResponsiveSpacing(width, height),
  };
}
