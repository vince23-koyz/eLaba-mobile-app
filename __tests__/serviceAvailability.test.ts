import {
  filterActiveBookingServices,
  isServiceAvailableForBooking,
} from '../utils/serviceAvailability';

describe('service availability filtering', () => {
  it('keeps active services selectable and excludes inactive ones', () => {
    const services = [
      { service_id: 1, offers: 'Haircut', status: 'Active' },
      { service_id: 2, offers: 'Massage', status: 'Inactive' },
      { service_id: 3, offers: 'Nail Care', status: 1 },
      { service_id: 4, offers: 'Spa', status: 0 },
      { service_id: 5, offers: 'Facial', status: 'disabled' },
    ];

    expect(isServiceAvailableForBooking(services[0])).toBe(true);
    expect(isServiceAvailableForBooking(services[1])).toBe(false);
    expect(isServiceAvailableForBooking(services[2])).toBe(true);
    expect(isServiceAvailableForBooking(services[3])).toBe(false);
    expect(isServiceAvailableForBooking(services[4])).toBe(false);

    expect(filterActiveBookingServices(services).map(s => s.service_id)).toEqual([1, 3]);
  });
});
