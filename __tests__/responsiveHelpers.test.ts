import { getResponsiveValue, getScreenType, getResponsiveSpacing } from '../utils/responsive';

describe('responsive helpers', () => {
  it('detects small phones, phones, and tablets correctly', () => {
    expect(getScreenType(320, 568)).toBe('small-phone');
    expect(getScreenType(390, 844)).toBe('phone');
    expect(getScreenType(768, 1024)).toBe('tablet');
    expect(getScreenType(1024, 768)).toBe('tablet');
  });

  it('returns a proportional value for compact layouts', () => {
    expect(getResponsiveValue(320, 12, 14, 16, 18)).toBe(12);
    expect(getResponsiveValue(390, 12, 16, 18, 22)).toBe(16);
    expect(getResponsiveValue(768, 12, 16, 18, 22)).toBe(22);
  });

  it('provides safe spacing values for different device sizes', () => {
    expect(getResponsiveSpacing(320, 568)).toEqual({
      pagePadding: 16,
      sectionGap: 16,
      cardPadding: 12,
    });
  });
});
