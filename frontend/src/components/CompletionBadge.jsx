import { Trophy } from "lucide-react";

function calcDuration(joinedAt, completedAt) {
    if (!joinedAt || !completedAt) return null;
    const start = new Date(joinedAt);
    const end   = new Date(completedAt);
    if (isNaN(start) || isNaN(end) || end < start) return null;
    // Floor to whole days using UTC midnight difference
    const ms   = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
    const days = Math.floor(ms / 86_400_000);
    return days === 0 ? "Same day" : `${days} day${days !== 1 ? "s" : ""}`;
}

function CompletionBadge({ challengeTitle, category, participantName, completedAt, joinedAt }) {
    const duration = calcDuration(joinedAt, completedAt);

    return (
        <div className="completion-badge-card">
            <div className="completion-badge-header">
                <span className="completion-badge-icon">
                    <Trophy size={28} />
                </span>
                <div>
                    <p className="completion-badge-title">Challenge Completed!</p>
                    {participantName && (
                        <p className="completion-badge-name">{participantName}</p>
                    )}
                </div>
            </div>

            <div className="completion-badge-body">
                <div className="completion-badge-challenge">
                    {challengeTitle}
                </div>
                {category && (
                    <span className="challenge-category">{category}</span>
                )}
            </div>

            <div className="completion-badge-meta">
                {completedAt && (
                    <div className="completion-badge-meta-item">
                        <span className="field-label">Completed</span>
                        <span className="field-value">
                            {new Date(completedAt).toLocaleDateString("en-US", {
                                year: "numeric", month: "long", day: "numeric",
                            })}
                        </span>
                    </div>
                )}
                {joinedAt && (
                    <div className="completion-badge-meta-item">
                        <span className="field-label">Started</span>
                        <span className="field-value">
                            {new Date(joinedAt).toLocaleDateString("en-US", {
                                year: "numeric", month: "long", day: "numeric",
                            })}
                        </span>
                    </div>
                )}
                {duration && (
                    <div className="completion-badge-meta-item">
                        <span className="field-label">Duration</span>
                        <span className="field-value">{duration}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CompletionBadge;
