import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Trophy } from "lucide-react";
import api from "../services/api";
import ChallengeCard from "../components/ChallengeCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

function MyChallenges() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState("");
    const [deleteId, setDeleteId]     = useState(null);
    const [deleting, setDeleting]     = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [meta, setMeta]             = useState({});  // { challengeId: { tasks, participants, pending } }

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get("/challenges/mine");
                setChallenges(data.challenges);
                const metaMap = {};
                await Promise.all(
                    data.challenges.map(async (c) => {
                        try {
                            const requests = [
                                api.get(`/challenges/${c._id}/tasks`),
                                api.get(`/challenges/${c._id}/participants`),
                            ];
                            if (c.proofRequired) {
                                requests.push(api.get(`/challenges/${c._id}/submissions`));
                            }
                            const results = await Promise.all(requests);
                            metaMap[c._id] = {
                                tasks: results[0].data.tasks.length,
                                participants: results[1].data.participants.filter(
                                    (p) => p.status === "active"
                                ).length,
                                pending: c.proofRequired
                                    ? results[2].data.submissions.filter((s) => s.status === "pending").length
                                    : 0,
                            };
                        } catch {
                            metaMap[c._id] = { tasks: 0, participants: 0, pending: 0 };
                        }
                    })
                );
                setMeta(metaMap);
            } catch {
                setError("Failed to load your challenges.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        setDeleteError("");
        try {
            await api.delete(`/challenges/${deleteId}`);
            setChallenges((prev) => prev.filter((c) => c._id !== deleteId));
            setDeleteId(null);
        } catch (err) {
            setDeleteError(err.response?.data?.message || "Failed to delete challenge.");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <main className="page-content">
            <div className="my-challenges-container">
                <div className="page-header">
                    <div>
                        <h1>My Challenges</h1>
                        <p className="text-muted">Challenges you have created.</p>
                    </div>
                    <Link to="/create-challenge" className="btn-primary btn-inline">
                        <Plus size={16} /> Create Challenge
                    </Link>
                </div>

                {error && <p className="form-error">{error}</p>}

                {challenges.length === 0 ? (
                    <div className="empty-page-state">
                        <EmptyState
                            icon={<Trophy size={40} />}
                            title="No challenges yet"
                            description="You haven't created any challenges yet."
                        />
                        <Link to="/create-challenge" className="btn-primary btn-inline" style={{ marginTop: "1rem" }}>
                            Create your first challenge
                        </Link>
                    </div>
                ) : (
                    <div className="challenges-grid">
                        {challenges.map((challenge) => (
                            <div key={challenge._id} className="challenge-card-wrapper">
                                <ChallengeCard challenge={challenge} />
                                {meta[challenge._id] && (
                                    <div className="challenge-meta-row">
                                        <span className="meta-item">
                                            {meta[challenge._id].tasks} task{meta[challenge._id].tasks !== 1 ? "s" : ""}
                                        </span>
                                        <span className="meta-item">
                                            {meta[challenge._id].participants} participant{meta[challenge._id].participants !== 1 ? "s" : ""}
                                        </span>
                                        {meta[challenge._id].pending > 0 && (
                                            <span className="pending-badge">
                                                {meta[challenge._id].pending} pending review{meta[challenge._id].pending !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="challenge-card-actions">
                                    <Link to={`/challenges/${challenge._id}/edit`} className="btn-secondary btn-sm">
                                        Edit
                                    </Link>
                                    <Link to={`/challenges/${challenge._id}/stats`} className="btn-secondary btn-sm">
                                        Stats
                                    </Link>
                                    {challenge.proofRequired && (
                                        <Link to={`/challenges/${challenge._id}/review`} className="btn-secondary btn-sm">
                                            Review Submissions
                                        </Link>
                                    )}
                                    <button
                                        className="btn-danger btn-sm"
                                        onClick={() => { setDeleteId(challenge._id); setDeleteError(""); }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Delete Challenge</h2>
                        <p>Are you sure you want to delete this challenge? This action cannot be undone.</p>
                        {deleteError && <p className="form-error" style={{ marginTop: "0.75rem" }}>{deleteError}</p>}
                        <div className="modal-actions">
                            <button className="btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                                {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                            <button className="btn-ghost" onClick={() => setDeleteId(null)} disabled={deleting}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default MyChallenges;
