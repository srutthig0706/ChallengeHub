import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

function NotificationBell() {
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    return (
        <button
            className="notif-bell"
            onClick={() => navigate("/notifications")}
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="notif-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </button>
    );
}

export default NotificationBell;
