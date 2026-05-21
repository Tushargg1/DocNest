import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationApi } from './notificationApi';

// Mock the api module
vi.mock('./api', () => {
  return {
    default: {
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

import api from './api';

describe('notificationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('calls GET /notifications with default page and size', async () => {
      api.get.mockResolvedValue({ data: { content: [], totalPages: 0 } });

      await notificationApi.getAll();

      expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 0, size: 20 } });
    });

    it('calls GET /notifications with custom page and size', async () => {
      api.get.mockResolvedValue({ data: { content: [], totalPages: 0 } });

      await notificationApi.getAll(2, 10);

      expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 2, size: 10 } });
    });

    it('returns the API response', async () => {
      const mockResponse = { data: { content: [{ id: 1, title: 'Test' }], totalPages: 1 } };
      api.get.mockResolvedValue(mockResponse);

      const result = await notificationApi.getAll();

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUnreadCount', () => {
    it('calls GET /notifications/unread', async () => {
      api.get.mockResolvedValue({ data: { count: 5 } });

      await notificationApi.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith('/notifications/unread');
    });

    it('returns unread count data', async () => {
      api.get.mockResolvedValue({ data: { count: 3 } });

      const result = await notificationApi.getUnreadCount();

      expect(result.data.count).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('calls PUT /notifications/:id/read', async () => {
      api.put.mockResolvedValue({ data: { id: 1, read: true } });

      await notificationApi.markAsRead(1);

      expect(api.put).toHaveBeenCalledWith('/notifications/1/read');
    });

    it('passes the correct notification id', async () => {
      api.put.mockResolvedValue({ data: {} });

      await notificationApi.markAsRead(42);

      expect(api.put).toHaveBeenCalledWith('/notifications/42/read');
    });
  });

  describe('markAllAsRead', () => {
    it('calls PUT /notifications/read-all', async () => {
      api.put.mockResolvedValue({ data: { updated: 5 } });

      await notificationApi.markAllAsRead();

      expect(api.put).toHaveBeenCalledWith('/notifications/read-all');
    });

    it('returns the API response', async () => {
      const mockResponse = { data: { updated: 10 } };
      api.put.mockResolvedValue(mockResponse);

      const result = await notificationApi.markAllAsRead();

      expect(result).toEqual(mockResponse);
    });
  });
});
