export const NOTIFICATIONS_UPDATED_EVENT = 'notifications:updated';

export const emitNotificationsUpdated = (unreadCount: number): void => {
  window.dispatchEvent(
    new CustomEvent<number>(NOTIFICATIONS_UPDATED_EVENT, {
      detail: unreadCount
    })
  );
};
