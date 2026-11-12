import { Link } from "react-router-dom";

const STATUS_COLORS = {
    draft:     "status-draft",
    published: "status-published",
    completed: "status-completed",
    archived:  "status-archived",
};

const ACCESS_COLORS = {
    public:    "access-public",
    private:   "access-private",
    community: "access-community",
};

function ChallengeCard({ challenge }) {
    const { _id, title, description, category, creator, accessType, startDate, endDate, status } = challenge;

    return (
        <article className="challenge-card">
            <div className="challenge-card-header">
                <span className="challenge-category">{category}</span>
                <span className={`challenge-status ${STATUS_COLORS[status] || ""}`}>{status}</span>
            </div>
            <h3 className="challenge-card-title">{title}</h3>
            <p className="challenge-card-desc">
                {description.length > 120 ? description.slice(0, 120) + "…" : description}
            </p>
            <div className="challenge-card-meta">
                {creator && (
                    <span className="meta-item">
                        by{" "}
                        <Link
                            to={`/users/${creator._id}`}
                            style={{ color: "var(--primary)", textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {creator.name || creator.username}
                        </Link>
                    </span>
                )}
                <span className={`access-badge-detail ${ACCESS_COLORS[accessType] || ""}`}>
                    {accessType}
                </span>
            </div>
            {(startDate || endDate) && (
                <div className="challenge-card-dates">
                    {startDate && <span>{new Date(startDate).toLocaleDateString()}</span>}
                    {startDate && endDate && <span> → </span>}
                    {endDate && <span>{new Date(endDate).toLocaleDateString()}</span>}
                </div>
            )}
            <Link to={`/challenges/${_id}`} className="btn-card-view">View Challenge</Link>
        </article>
    );
}

export default ChallengeCard;
