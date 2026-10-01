export interface MessageReadStateOverride {
  hasUnreadMessages: boolean;
  unreadCount: number;
}

export interface MessageReadStateInput {
  serverHasUnreadMessages: boolean;
  serverUnreadCount: number;
  override?: MessageReadStateOverride;
}

export const resolveEffectiveUnreadState = ({
  serverHasUnreadMessages,
  serverUnreadCount,
  override,
}: MessageReadStateInput) => {
  if (override) {
    return {
      hasUnreadMessages: override.hasUnreadMessages,
      unreadCount: override.unreadCount,
    };
  }

  return {
    hasUnreadMessages: serverHasUnreadMessages,
    unreadCount: serverUnreadCount,
  };
};
