import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ProgressBar from "../components/ProgressBar";
import { Trophy } from "lucide-react";

function StatCard({ label, value }) {
    return (
        <div className="profile-field">
            <span className="field-label">{label}</span>
            <span className="field-value">{value}</span>
        </div>
    );
}

function ChallengeStats() {
    const { id } = useParams();
    const { user } = useAuth();

    const [challenge, setChallenge]       = useState(null);
    const [participants, setParticipants] = useState([]);
    const [taskCount, setTaskCount]       = useState(0);
    const [submissions, setSubmissions]   = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState("");

    const load = useCallback(async () => {
        try {
            const [chalRes, partRes, taskRes] = await Promise.all([
                api.get(`/challenges/${id}`),
                api.get(`/challenges/${id}/participants`),
                api.get(`/challenges/${id}/tasks`),
            ]);

            const chal = chalRes.data.challenge;
            setChallenge(chal);
            setTaskCount(taskRes.data.tasks.length);

            // Sort: completed first (earliest completedAt wins), then active by progress desc, then left
            const sorted = [...partRes.data.participants].sort((a, b) => {
                if (a.status === "completed" && b.status !== "completed") return -1;
                if (b.status === "completed" && a.status !== "completed") return 1;
                if (a.status === "completed" && b.status === "completed") {
                    return new Date(a.completedAt) - new Date(b.completedAt);
                }
                if (a.status === "left" && b.status !== "left") return 1;
                if (b.status === "left" && a.status !== "left") return -1;
                return (b.progress || 0) - (a.progress || 0);
            });
            setParticipants(sorted);

            // Fetch submissions only if proof is required (creator sees all)
            if (chal.proofRequired) {
                try {
                    const subRes = await api.get(`/challenges/${id}/submissions`);
                    setSubmissions(subRes.data.submissions);
                } catch {
                    // Non-critical — stats still render without it
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load stats.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <main className="page-content">
                <div className="challenge-detail-container">
                    <p className="form-error">{error}</p>
                    <Link to="/my-challenges" className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to My Challenges
                    </Link>
                </div>
            </main>
        );
    }

    const isCreator = user && challenge?.creator &&
        (challenge.creator._id || challenge.creator) === user._id;

    if (!isCreator) {
        return (
            <main className="page-content">
                <div className="challenge-detail-container">
                    <p className="form-error">Only the challenge creator can view stats.</p>
                    <Link to={`/challenges/${id}`} className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to Challenge
                    </Link>
                </div>
            </main>
        );
    }

    // ── Participation stats ───────────────────────────────────────────────────
    const total     = participants.length;
    const active    = participants.filter((p) => p.status === "active").length;
    const completed = participants.filter((p) => p.status === "completed").length;
    const left      = participants.filter((p) => p.status === "left").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const retentionRate  = total > 0 ? Math.round(((total - left) / total) * 100) : 0;

    // Average progress across active + completed participants only
    const progressParticipants = participants.filter((p) => p.status !== "left");
    const avgProgress = progressParticipants.length > 0
        ? Math.round(
            progressParticipants.reduce((sum, p) => sum + (p.progress || 0), 0) /
            progressParticipants.length
          )
        : 0;

    // Earliest and latest join dates
    const joinDates = participants.map((p) => new Date(p.joinedAt)).filter((d) => !isNaN(d));
    const firstJoin = joinDates.length > 0 ? new Date(Math.min(...joinDates)) : null;
    const lastJoin  = joinDates.length > 0 ? new Date(Math.max(...joinDates)) : null;

    // Fastest completion
    const completedParts = participants.filter((p) => p.status === "completed" && p.completedAt);
    const fastestCompletion = completedParts.length > 0
        ? completedParts.reduce((best, p) =>
            new Date(p.completedAt) < new Date(best.completedAt) ? p : best
          )
        : null;

    // ── Proof / submission stats (only when proofRequired) ───────────────────
    const totalSubs    = submissions.length;
    const pendingSubs  = submissions.filter((s) => s.status === "pending").length;
    const approvedSubs = submissions.filter((s) => s.status === "approved").length;
    const rejectedSubs = submissions.filter((s) => s.status === "rejected").length;
    const approvalRate = totalSubs > 0 ? Math.round((approvedSubs / totalSubs) * 100) : 0;

    return (
        <main className="page-content">
            <div className="challenge-detail-container">

                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1>Challenge Stats</h1>
                        <p className="text-muted">{challenge.title}</p>
                    </div>
                    <Link to={`/challenges/${id}`} className="btn-secondary btn-sm">
                        Back to Challenge
                    </Link>
                </div>

                {/* ── Participation summary ── */}
                <section className="challenge-detail-body">
                    <p className="field-label" style={{ marginBottom: "0.75rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Participation
                    </p>
                    <div className="challenge-detail-grid">
                        <StatCard label="Total Participants" value={total} />
                        <StatCard label="Active"             value={active} />
                        <StatCard label="Completed"          value={completed} />
                        <StatCard label="Left"               value={left} />
                        <StatCard label="Completion Rate"    value={`${completionRate}%`} />
                        <StatCard label="Retention Rate"     value={total > 0 ? `${retentionRate}%` : "—"} />
                    </div>
                </section>

                {/* ── Progress summary ── */}
                <section className="challenge-detail-body" style={{ marginTop: "1rem" }}>
                    <p className="field-label" style={{ marginBottom: "0.75rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Progress
                    </p>
                    <div className="challenge-detail-grid">
                        <StatCard label="Tasks"            value={taskCount} />
                        <StatCard label="Avg Progress"     value={progressParticipants.length > 0 ? `${avgProgress}%` : "—"} />
                        <StatCard label="First Joined"     value={firstJoin ? firstJoin.toLocaleDateString() : "—"} />
                        <StatCard label="Last Joined"      value={lastJoin  ? lastJoin.toLocaleDateString()  : "—"} />
                        {fastestCompletion && (
                            <StatCard
                                label="First to Complete"
                                value={`${fastestCompletion.user?.name || "Unknown"} (${new Date(fastestCompletion.completedAt).toLocaleDateString()})`}
                            />
                        )}
                    </div>

                    {/* Overall avg progress bar */}
                    {progressParticipants.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                            <p className="field-label" style={{ marginBottom: "0.4rem" }}>
                                Overall Average Progress
                            </p>
                            <ProgressBar progress={avgProgress} />
                        </div>
                    )}
                </section>

                {/* ── Proof submission stats (only when proofRequired) ── */}
                {challenge.proofRequired && (
                    <section className="challenge-detail-body" style={{ marginTop: "1rem" }}>
                        <p className="field-label" style={{ marginBottom: "0.75rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Proof Submissions
                        </p>
                        <div className="challenge-detail-grid">
                            <StatCard label="Total Submissions" value={totalSubs} />
                            <StatCard label="Pending"           value={pendingSubs} />
                            <StatCard label="Approved"          value={approvedSubs} />
                            <StatCard label="Rejected"          value={rejectedSubs} />
                            <StatCard label="Approval Rate"     value={totalSubs > 0 ? `${approvalRate}%` : "—"} />
                        </div>
                    </section>
                )}

                {/* ── Leaderboard (unchanged from Module 12.2) ── */}
                <section className="tasks-section">
                    <div className="tasks-section-header">
                        <h2 className="tasks-section-title">
                            Leaderboard {total > 0 && `(${total})`}
                        </h2>
                    </div>

                    {total === 0 ? (
                        <EmptyState
                            icon={<Trophy size={32} />}
                            title="No participants yet"
                            description="Nobody has joined this challenge yet."
                        />
                    ) : (
                        <div className="submissions-list">
                            {participants.map((p, idx) => {
                                const name     = p.user?.name || "Unknown";
                                const username = p.user?.username || "";
                                const userId   = p.user?._id;

                                return (
                                    <div key={p._id} className="submission-card">
                                        <div className="submission-card-header">
                                            <div className="submission-card-meta">
                                                <span className="submission-participant">
                                                    <span style={{ fontWeight: 700, marginRight: "0.4rem" }}>
                                                        #{idx + 1}
                                                    </span>
                                                    {userId ? (
                                                        <Link to={`/users/${userId}`}
                                                            style={{ color: "var(--text)", textDecoration: "none" }}>
                                                            {name}
                                                        </Link>
                                                    ) : name}
                                                    {username && (
                                                        <span className="text-muted" style={{ fontWeight: 400 }}>
                                                            {" "}(@{username})
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="submission-date">
                                                    Joined {new Date(p.joinedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span className={`challenge-status status-${
                                                p.status === "completed" ? "completed" :
                                                p.status === "left"      ? "archived"  : "published"
                                            }`}>
                                                {p.status === "completed" ? "🏆 Completed" :
                                                 p.status === "left"      ? "Left"        : "Active"}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: "0.6rem" }}>
                                            <ProgressBar progress={p.progress || 0} />
                                        </div>

                                        {p.status === "completed" && p.completedAt && (
                                            <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>
                                                Completed on {new Date(p.completedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}

export default ChallengeStats;
