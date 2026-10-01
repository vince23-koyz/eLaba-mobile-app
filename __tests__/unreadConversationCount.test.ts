import { mergeUnreadMessagesByConversation, removeUnreadMessagesForConversation } from '../utils/unreadConversationState';

describe('mergeUnreadMessagesByConversation', () => {
  it('does not add a duplicate unread entry for the same conversation', () => {
    const existing = [
      { id: 1, sender_id: '2', sender_type: 'admin' as const, shop_id: '10', message_text: 'Hello', created_at: '2025-01-01T00:00:00Z' },
    ];

    const next = mergeUnreadMessagesByConversation(existing, {
      id: 2,
      sender_id: '2',
      sender_type: 'admin' as const,
      shop_id: '10',
      message_text: 'Still here',
      created_at: '2025-01-01T00:01:00Z',
    });

    expect(next).toHaveLength(1);
    expect(next[0].message_text).toBe('Hello');
  });

  it('adds a new unread entry for a different conversation', () => {
    const existing = [
      { id: 1, sender_id: '2', sender_type: 'admin' as const, shop_id: '10', message_text: 'Hello', created_at: '2025-01-01T00:00:00Z' },
    ];

    const next = mergeUnreadMessagesByConversation(existing, {
      id: 2,
      sender_id: '3',
      sender_type: 'admin' as const,
      shop_id: '10',
      message_text: 'New person',
      created_at: '2025-01-01T00:01:00Z',
    });

    expect(next).toHaveLength(2);
  });

  it('removes an unread entry for the conversation that was just read', () => {
    const existing = [
      { id: 1, sender_id: '2', sender_type: 'admin' as const, shop_id: '10', message_text: 'Hello', created_at: '2025-01-01T00:00:00Z' },
    ];

    const next = removeUnreadMessagesForConversation(existing, {
      sender_id: '2',
      sender_type: 'admin' as const,
      shop_id: '10',
    });

    expect(next).toHaveLength(0);
  });
});
