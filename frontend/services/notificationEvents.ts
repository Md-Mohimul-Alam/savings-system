export const NOTIFICATION_UPDATED_EVENT =
  "notification-updated";

export const emitNotificationUpdated =
  () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new Event(
          NOTIFICATION_UPDATED_EVENT
        )
      );
    }
  };