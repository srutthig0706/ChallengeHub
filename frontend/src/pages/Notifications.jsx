import { Bell, UserPlus, FileText, CheckCircle, XCircle, Trophy, Users, Trash2 } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const TYPE_ICON = {
    join:               <UserPlus size={18} />,
    submission:         <FileText size={18} />,
    approved:           <CheckCircle size={18} />,
    rejected:           <XCircle size={18} />,
    completed:          <Trophy size={18} />,
    added_to_community: <Users size={18} />,
};

const TYPE_COLOR = {
    join:               "#6c47ff",
    submission:         "#2563eb",
    approved:           "#16a34a",
    rejected:           "#dc2626",
    completed:          "#d97706",
    added_to_community: "#7c3aed",
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Notifications() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    if (loading) return <main className="page-content"><LoadingSpinner /></main>;

    return (
        <main className="page-content">
            <div className="notif-page">

                <div className="page-header">
                    <h1>Notifications</h1>
                    {unreadCount > 0 && (
                        <button className="btn-secondary btn-sm" onClick={markAllAsRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <EmptyState
                        icon={<Bell size={36} />}
                        title="No notifications yet"
                        description="You'll see activity here when something happens."
                    />
                ) : (
                    <ul className="notif-list">
                        {notifications.map((n) => (
                            <li
                                key={n._id}
                                className={`notif-item${n.read ? "" : " notif-unread"}`}
                                onClick={() => { if (!n.read) markAsRead(n._id); }}
                            >
                                <span
                                    className="notif-icon"
                                    style={{ color: TYPE_COLOR[n.type] || "var(--text-muted)" }}
                                >
                                    {TYPE_ICON[n.type] || <Bell size={18} />}
                                </span>

                                <div className="notif-body">
                                    <p className="notif-message">{n.message}</p>
                                    <span className="notif-time">{formatDate(n.createdAt)}</span>
                                </div>

                                {!n.read && <span className="notif-dot" aria-hidden="true" />}

                                <button
                                    className="notif-delete"
                                    aria-label="Delete notification"
                                    onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}

export default Notifications;
