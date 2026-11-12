import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000;

export function NotificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading]             = useState(false);
    const intervalRef                       = useRef(null);
    const mountedRef                        = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const refreshNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await api.get("/notifications");
            if (mountedRef.current) setNotifications(data.notifications);
        } catch {
            // silently fail — bell/page still render
        }
    }, [isAuthenticated]);

    // Initial fetch + polling
    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            clearInterval(intervalRef.current);
            return;
        }

        setLoading(true);
        api.get("/notifications")
            .then(({ data }) => { if (mountedRef.current) setNotifications(data.notifications); })
            .catch(() => {})
            .finally(() => { if (mountedRef.current) setLoading(false); });

        intervalRef.current = setInterval(refreshNotifications, POLL_INTERVAL);

        return () => clearInterval(intervalRef.current);
    }, [isAuthenticated, refreshNotifications]);

    const markAsRead = useCallback(async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            if (mountedRef.current) {
                setNotifications((prev) =>
                    prev.map((n) => (n._id === id ? { ...n, read: true } : n))
                );
            }
        } catch {
            // silently fail
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.patch("/notifications/read-all");
            if (mountedRef.current) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }
        } catch {
            // silently fail
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            if (mountedRef.current) {
                setNotifications((prev) => prev.filter((n) => n._id !== id));
            }
        } catch {
            // silently fail
        }
    }, []);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refreshNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
