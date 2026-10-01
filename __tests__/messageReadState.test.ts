import { resolveEffectiveUnreadState } from '../utils/messageReadState';

describe('resolveEffectiveUnreadState', () => {
  it('keeps a locally cleared state even when the backend still reports unread messages', () => {
    const result = resolveEffectiveUnreadState({
      serverHasUnreadMessages: true,
      serverUnreadCount: 2,
      override: { hasUnreadMessages: false, unreadCount: 0 },
    });

    expect(result).toEqual({ hasUnreadMessages: false, unreadCount: 0 });
  });

  it('uses the override values when they are present', () => {
    const result = resolveEffectiveUnreadState({
      serverHasUnreadMessages: false,
      serverUnreadCount: 0,
      override: { hasUnreadMessages: true, unreadCount: 3 },
    });

    expect(result).toEqual({ hasUnreadMessages: true, unreadCount: 3 });
  });

  it('uses the server state when there is no override', () => {
    const result = resolveEffectiveUnreadState({
      serverHasUnreadMessages: true,
      serverUnreadCount: 1,
    });

    expect(result).toEqual({ hasUnreadMessages: true, unreadCount: 1 });
  });
});
