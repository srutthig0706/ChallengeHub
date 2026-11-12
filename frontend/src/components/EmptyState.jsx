function EmptyState({ icon, title, description }) {
    return (
        <div className="empty-state">
            {icon && <div className="empty-state-icon">{icon}</div>}
            <p className="empty-state-title">{title}</p>
            {description && <p className="empty-state-desc">{description}</p>}
        </div>
    );
}

export default EmptyState;
