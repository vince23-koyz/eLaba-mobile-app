export type BookingServiceStatus = string | number | null | undefined;

export interface BookingServiceLike {
  service_id?: number;
  status?: BookingServiceStatus;
  offers?: string;
  price?: number;
  description?: string;
}

export const isServiceAvailableForBooking = (service?: Partial<BookingServiceLike> | null): boolean => {
  if (!service) return false;

  const statusValue = service.status;
  if (statusValue === undefined || statusValue === null || statusValue === '') return true;

  if (typeof statusValue === 'string') {
    const normalized = statusValue.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'enabled') return true;
    if (normalized === 'inactive' || normalized === 'disabled' || normalized === 'archived') return false;
    return true;
  }

  if (typeof statusValue === 'number') {
    return statusValue === 1;
  }

  return true;
};

export const filterActiveBookingServices = <T extends Partial<BookingServiceLike>>(services: T[] = []): T[] =>
  services.filter(isServiceAvailableForBooking as (service?: Partial<BookingServiceLike> | null) => boolean);
