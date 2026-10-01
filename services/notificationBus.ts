type EventName =
  | 'notifications:allRead'
  | 'notifications:readOne'
  | 'notifications:removeDeclinedBooking';

class NotificationBus {
  private listeners: Record<EventName, Set<(payload?: any) => void>> = {
    'notifications:allRead': new Set(),
    'notifications:readOne': new Set(),
    'notifications:removeDeclinedBooking': new Set(),
  };

  on(event: EventName, handler: (payload?: any) => void) {
    this.listeners[event].add(handler);
    return () => this.off(event, handler);
  }

  off(event: EventName, handler: (payload?: any) => void) {
    this.listeners[event].delete(handler);
  }

  emit(event: EventName, payload?: any) {
    for (const fn of this.listeners[event]) {
      try {
        fn(payload);
      } catch (e) {
        // noop
      }
    }
  }
}

const bus = new NotificationBus();
export default bus;
