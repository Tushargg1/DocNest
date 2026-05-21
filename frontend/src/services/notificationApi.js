import api from "./api";

export const notificationApi = {
  getAll(page = 0, size = 20) {
    return api.get("/notifications", { params: { page, size } });
  },

  getUnreadCount() {
    return api.get("/notifications/unread");
  },

  markAsRead(id) {
    return api.put(`/notifications/${id}/read`);
  },

  markAllAsRead() {
    return api.put("/notifications/read-all");
  },
};
