const STATUS_CONFIG = {
    pending:  { label: "Pending Review", cls: "submission-pending" },
    approved: { label: "Approved",       cls: "submission-approved" },
    rejected: { label: "Rejected",       cls: "submission-rejected" },
};

function SubmissionStatus({ submission }) {
    if (!submission) return null;
    const cfg = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending;
    return (
        <div className="submission-status-block">
            <span className={`submission-badge ${cfg.cls}`}>{cfg.label}</span>
            {submission.status === "rejected" && submission.creatorFeedback && (
                <p className="submission-feedback">
                    <strong>Feedback:</strong> {submission.creatorFeedback}
                </p>
            )}
            {submission.status === "approved" && submission.creatorFeedback && (
                <p className="submission-feedback submission-feedback-approved">
                    {submission.creatorFeedback}
                </p>
            )}
        </div>
    );
}

export default SubmissionStatus;
