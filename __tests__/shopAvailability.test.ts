import {
  isShopOpenForBookings,
  isShopVisibleToCustomers,
} from '../utils/shopAvailability';

describe('shop availability', () => {
  it('keeps active and inactive shops visible but only allows open shops to be booked', () => {
    expect(isShopVisibleToCustomers('active')).toBe(true);
    expect(isShopVisibleToCustomers('inactive')).toBe(true);
    expect(isShopVisibleToCustomers('pending')).toBe(false);
    expect(isShopVisibleToCustomers('rejected')).toBe(false);

    expect(isShopOpenForBookings('active')).toBe(true);
    expect(isShopOpenForBookings('inactive')).toBe(false);
  });
});