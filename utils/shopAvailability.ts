const OPEN_SHOP_STATUSES = new Set(['active', 'open', 'enabled', '1']);

export function isShopOpenForBookings(status: unknown): boolean {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  return !normalizedStatus || OPEN_SHOP_STATUSES.has(normalizedStatus);
}

export function isShopVisibleToCustomers(status: unknown): boolean {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  return normalizedStatus === 'active' || normalizedStatus === 'inactive';
}