import api from "./api";
import { assertWritable } from "./demoMode";

export const getMyNotifications = async () => {
  const response = await api.get("/notifications");

  return response.data;
};

export const markNotificationAsRead = async (
  notificationId: string
) => {
  assertWritable();

  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );

  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  assertWritable();

  const response = await api.patch("/notifications/read-all");

  return response.data;
};
