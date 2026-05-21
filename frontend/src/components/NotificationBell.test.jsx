import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from './NotificationBell';

// Mock the notification API
vi.mock('../services/notificationApi', () => ({
  notificationApi: {
    getUnreadCount: vi.fn(),
    getAll: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { notificationApi } from '../services/notificationApi';
import { useAuth } from '../context/AuthContext';

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no session', () => {
    useAuth.mockReturnValue({ session: null });
    const { container } = renderBell();
    expect(container.firstChild).toBeNull();
  });

  it('renders the bell button when session exists', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 0 } });

    renderBell();

    const button = screen.getByRole('button', { name: /notifications/i });
    expect(button).toBeInTheDocument();
  });

  it('displays unread badge when there are unread notifications', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 5 } });

    renderBell();

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('displays 99+ when unread count exceeds 99', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 150 } });

    renderBell();

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('does not show badge when unread count is 0', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 0 } });

    renderBell();

    await waitFor(() => {
      expect(notificationApi.getUnreadCount).toHaveBeenCalled();
    });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens dropdown and fetches recent notifications on click', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 2 } });
    notificationApi.getAll.mockResolvedValue({
      data: {
        content: [
          { id: 1, title: 'Appointment Confirmed', message: 'Your appointment is set.', read: false, createdAt: new Date().toISOString() },
          { id: 2, title: 'Reminder', message: 'Visit tomorrow', read: true, createdAt: new Date().toISOString() },
        ],
      },
    });

    renderBell();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Appointment Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Reminder')).toBeInTheDocument();
    });
  });

  it('shows "No notifications" when list is empty', async () => {
    useAuth.mockReturnValue({
      session: { userId: 1, token: 'test-token', role: 'PATIENT' },
    });
    notificationApi.getUnreadCount.mockResolvedValue({ data: { count: 0 } });
    notificationApi.getAll.mockResolvedValue({ data: { content: [] } });

    renderBell();

    const button = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});
