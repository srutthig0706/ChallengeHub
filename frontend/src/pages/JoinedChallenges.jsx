import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ProgressBar from "../components/ProgressBar";

const ACCESS_COLORS = {
    public:    "access-public",
    private:   "access-private",
    community: "access-community",
};

const PART_STATUS = {
    active:    { label: "Active",    cls: "status-published" },
    completed: { label: "Completed", cls: "status-completed" },
    left:      { label: "Left",      cls: "status-archived" },
};

function JoinedChallenges() {
    const [participations, setParticipations] = useState([]);
    const [taskCounts, setTaskCounts]         = useState({});   // { challengeId: totalTasks }
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get("/users/me/challenges");
                setParticipations(data.participations);

                // Fetch task counts for each unique challenge
                const ids = [...new Set(
                    data.participations
                        .map((p) => p.challenge?._id)
                        .filter(Boolean)
                )];
                const counts = {};
                await Promise.all(
                    ids.map(async (cid) => {
                        try {
                            const res = await api.get(`/challenges/${cid}/tasks`);
                            counts[cid] = res.data.tasks.length;
                        } catch {
                            counts[cid] = 0;
                        }
                    })
                );
                setTaskCounts(counts);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load joined challenges.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <main className="page-content">
            <div className="my-challenges-container">
                <div className="page-header">
                    <h1>Joined Challenges</h1>
                </div>

                {error && <p className="form-error">{error}</p>}

                {!error && participations.length === 0 ? (
                    <div className="empty-page-state">
                        <EmptyState
                            icon={<Trophy size={40} />}
                            title="No joined challenges yet"
                            description="Browse challenges and join ones that interest you."
                        />
                        <Link to="/challenges" className="btn-primary btn-inline"
                            style={{ marginTop: "1rem" }}>
                            Explore Challenges
                        </Link>
                    </div>
                ) : (
                    <div className="challenges-grid">
                        {participations.map(({ _id, challenge, status, progress, completedTasks, joinedAt, completedAt }) => {
                            if (!challenge) return null;
                            const accessCls  = ACCESS_COLORS[challenge.accessType] || "access-public";
                            const partStatus = PART_STATUS[status] || PART_STATUS.active;
                            const totalTasks = taskCounts[challenge._id] ?? 0;
                            const doneTasks  = completedTasks?.length || 0;

                            return (
                                <div key={_id} className="challenge-card">
                                    <div className="challenge-card-header">
                                        <span className="challenge-category">{challenge.category}</span>
                                        <span className={`challenge-status status-${challenge.status}`}>
                                            {challenge.status}
                                        </span>
                                        <span className={`access-badge ${accessCls}`}>
                                            {challenge.accessType}
                                        </span>
                                    </div>

                                    <h3 className="challenge-card-title">{challenge.title}</h3>

                                    <p className="challenge-card-desc">
                                        {challenge.description?.length > 100
                                            ? challenge.description.slice(0, 100) + "…"
                                            : challenge.description}
                                    </p>

                                    <div className="challenge-card-meta">
                                        {challenge.startDate && (
                                            <span className="meta-item">
                                                Start: {new Date(challenge.startDate).toLocaleDateString()}
                                            </span>
                                        )}
                                        {challenge.endDate && (
                                            <span className="meta-item">
                                                End: {new Date(challenge.endDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress */}
                                    {(status === "active" || status === "completed") && (
                                        <div style={{ marginTop: "0.5rem" }}>
                                            <ProgressBar progress={progress || 0} />
                                            {totalTasks > 0 && (
                                                <p className="text-muted"
                                                    style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                                                    {doneTasks} / {totalTasks} tasks completed
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="joined-meta">
                                        <span className={`challenge-status ${partStatus.cls}`}>
                                            {partStatus.label}
                                        </span>
                                        <span className="meta-item">
                                            Joined {new Date(joinedAt).toLocaleDateString()}
                                        </span>
                                        {completedAt && (
                                            <span className="meta-item">
                                                ✓ {new Date(completedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    <Link to={`/challenges/${challenge._id}`} className="btn-card-view">
                                        View Challenge
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

export default JoinedChallenges;
