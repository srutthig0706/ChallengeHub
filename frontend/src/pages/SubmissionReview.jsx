import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

function SubmissionReview() {
    const { id } = useParams();  // challenge id
    const { user } = useAuth();

    const [challenge, setChallenge]       = useState(null);
    const [submissions, setSubmissions]   = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState("");
    const [filter, setFilter]             = useState("pending");  // pending | approved | rejected | all

    // Per-submission review state
    const [feedback, setFeedback]         = useState({});   // submissionId -> string
    const [reviewing, setReviewing]       = useState(null); // submissionId being submitted
    const [reviewMsg, setReviewMsg]       = useState({});   // submissionId -> { type, text }

    const loadData = useCallback(async () => {
        try {
            const [chalRes, subRes] = await Promise.all([
                api.get(`/challenges/${id}`),
                api.get(`/challenges/${id}/submissions`),
            ]);
            setChallenge(chalRes.data.challenge);
            setSubmissions(subRes.data.submissions);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load submissions.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleReview = async (submissionId, status) => {
        setReviewing(submissionId);
        setReviewMsg((prev) => ({ ...prev, [submissionId]: null }));
        try {
            await api.put(`/submissions/${submissionId}/review`, {
                status,
                creatorFeedback: (feedback[submissionId] || "").trim(),
            });
            setReviewMsg((prev) => ({
                ...prev,
                [submissionId]: { type: "success", text: `Submission ${status}.` },
            }));
            // Update local state so UI reflects new status immediately
            setSubmissions((prev) =>
                prev.map((s) =>
                    s._id === submissionId
                        ? { ...s, status, creatorFeedback: (feedback[submissionId] || "").trim(), reviewedAt: new Date().toISOString() }
                        : s
                )
            );
        } catch (err) {
            setReviewMsg((prev) => ({
                ...prev,
                [submissionId]: { type: "error", text: err.response?.data?.message || "Review failed." },
            }));
        } finally {
            setReviewing(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <main className="page-content">
                <div className="review-container">
                    <p className="form-error">{error}</p>
                    <Link to="/my-challenges" className="btn-ghost" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to My Challenges
                    </Link>
                </div>
            </main>
        );
    }

    // Verify current user is the creator
    const isCreator = challenge?.creator?._id === user?._id;
    if (!isCreator) {
        return (
            <main className="page-content">
                <div className="review-container">
                    <p className="form-error">Only the challenge creator can review submissions.</p>
                    <Link to="/my-challenges" className="btn-ghost" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to My Challenges
                    </Link>
                </div>
            </main>
        );
    }

    const filtered = filter === "all"
        ? submissions
        : submissions.filter((s) => s.status === filter);

    const counts = {
        all: submissions.length,
        pending: submissions.filter((s) => s.status === "pending").length,
        approved: submissions.filter((s) => s.status === "approved").length,
        rejected: submissions.filter((s) => s.status === "rejected").length,
    };

    return (
        <main className="page-content">
            <div className="review-container">
                <div className="page-header">
                    <div>
                        <h1>Review Submissions</h1>
                        <p className="text-muted">{challenge.title}</p>
                    </div>
                    <Link to={`/challenges/${id}`} className="btn-secondary btn-sm">
                        Back to Challenge
                    </Link>
                </div>

                {/* Filter tabs */}
                <div className="review-filter-row">
                    {["pending", "approved", "rejected", "all"].map((f) => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? "active" : ""}`}
                            onClick={() => setFilter(f)}>
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="review-empty">
                        No {filter === "all" ? "" : filter} submissions yet.
                    </div>
                ) : (
                    <div className="submissions-list">
                        {filtered.map((sub) => {
                            const isReviewing = reviewing === sub._id;
                            const msg = reviewMsg[sub._id];
                            const isPending = sub.status === "pending";

                            return (
                                <div key={sub._id} className="submission-card">
                                    <div className="submission-card-header">
                                        <div className="submission-card-meta">
                                            <span className="submission-participant">
                                                {sub.participant?.name || "Unknown"}
                                                <span className="text-muted" style={{ fontWeight: 400 }}>
                                                    {" "}(@{sub.participant?.username})
                                                </span>
                                            </span>
                                            <span className="submission-task-label">
                                                Task: {sub.task?.title || "Unknown task"}
                                            </span>
                                            <span className="submission-date">
                                                Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className={`submission-badge submission-${sub.status}`}>
                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                        </span>
                                    </div>

                                    {sub.textProof && (
                                        <div>
                                            <span className="field-label">Proof</span>
                                            <p className="submission-proof-text">{sub.textProof}</p>
                                        </div>
                                    )}

                                    {sub.fileProof && (() => {
                                        const fileUrl = `http://localhost:5000/${sub.fileProof}`;
                                        const isImage = /\.(jpg|jpeg|png)$/i.test(sub.fileProof);
                                        return (
                                            <div>
                                                <span className="field-label">Attached File</span>
                                                {isImage ? (
                                                    <div style={{ marginTop: "0.4rem" }}>
                                                        <img
                                                            src={fileUrl}
                                                            alt="Proof attachment"
                                                            style={{ maxWidth: "100%", maxHeight: "320px", borderRadius: "6px", border: "1px solid var(--border)", display: "block" }}
                                                        />
                                                        <a href={fileUrl} target="_blank" rel="noreferrer"
                                                            style={{ fontSize: "0.82rem", color: "var(--primary)", marginTop: "0.3rem", display: "inline-block" }}>
                                                            Open full image
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div style={{ marginTop: "0.4rem" }}>
                                                        <a href={fileUrl} target="_blank" rel="noreferrer"
                                                            className="btn-secondary btn-sm"
                                                            style={{ display: "inline-block" }}>
                                                            View attached file
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {!isPending && sub.creatorFeedback && (
                                        <div>
                                            <span className="field-label">Your Feedback</span>
                                            <p className="submission-feedback">{sub.creatorFeedback}</p>
                                        </div>
                                    )}

                                    {msg && (
                                        <p className={msg.type === "error" ? "form-error" : "form-success"}
                                            style={{ margin: 0 }}>
                                            {msg.text}
                                        </p>
                                    )}

                                    {isPending && (
                                        <div className="review-form">
                                            <textarea
                                                rows={2}
                                                maxLength={1000}
                                                placeholder="Optional feedback for the participant..."
                                                value={feedback[sub._id] || ""}
                                                onChange={(e) => setFeedback((prev) => ({ ...prev, [sub._id]: e.target.value }))}
                                                disabled={isReviewing}
                                            />
                                            <div className="review-actions">
                                                <button
                                                    className="btn-approve"
                                                    onClick={() => handleReview(sub._id, "approved")}
                                                    disabled={isReviewing}>
                                                    {isReviewing ? "Saving..." : "Approve"}
                                                </button>
                                                <button
                                                    className="btn-reject"
                                                    onClick={() => handleReview(sub._id, "rejected")}
                                                    disabled={isReviewing}>
                                                    {isReviewing ? "Saving..." : "Reject"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

export default SubmissionReview;
