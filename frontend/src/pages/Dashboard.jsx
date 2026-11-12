import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { User, Trophy, Target, Plus } from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import api from "../services/api";
import EmptyState from "../components/EmptyState";
import ProgressBar from "../components/ProgressBar";

const PIE_COLORS = {
    Active:    "#6c47ff",
    Completed: "#16a34a",
    Left:      "#e5e7eb",
};

function DashboardCard({ title, children }) {
    return (
        <article className="dashboard-card">
            <h2 className="dashboard-card-title">{title}</h2>
            {children}
        </article>
    );
}

function Dashboard() {
    const { user } = useAuth();
    const [challenges, setChallenges]               = useState([]);
    const [challengesLoading, setChallengesLoading] = useState(true);
    const [participations, setParticipations]       = useState([]);

    const profileComplete = [user.name, user.username, user.email, user.bio, user.profileImage].filter(Boolean).length;
    const profilePct = Math.round((profileComplete / 5) * 100);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [mineRes, joinedRes] = await Promise.all([
                    api.get("/challenges/mine"),
                    api.get("/users/me/challenges"),
                ]);
                setChallenges(mineRes.data.challenges);
                setParticipations(joinedRes.data.participations);
            } catch {
                // silently fail — dashboard still loads
            } finally {
                setChallengesLoading(false);
            }
        };
        fetch();
    }, []);

    // ── Analytics derived from existing participations state ─────────────────
    const activeCount    = participations.filter((p) => p.status === "active").length;
    const completedCount = participations.filter((p) => p.status === "completed").length;
    const leftCount      = participations.filter((p) => p.status === "left").length;

    const pieData = [
        { name: "Active",    value: activeCount },
        { name: "Completed", value: completedCount },
        { name: "Left",      value: leftCount },
    ].filter((d) => d.value > 0);

    const progressParticipations = participations.filter(
        (p) => p.status !== "left" && p.challenge
    );

    const barData = progressParticipations.map((p) => ({
        name: p.challenge.title.length > 18
            ? p.challenge.title.slice(0, 16) + "…"
            : p.challenge.title,
        progress: p.progress || 0,
    }));

    const avgProgress = progressParticipations.length > 0
        ? Math.round(
            progressParticipations.reduce((sum, p) => sum + (p.progress || 0), 0) /
            progressParticipations.length
          )
        : null;

    const completionRate = participations.length > 0
        ? Math.round((completedCount / participations.length) * 100)
        : null;

    return (
        <main className="page-content">
            <div className="dashboard-container">

                <section className="dashboard-welcome">
                    <div>
                        <h1>Welcome back, {user.name.split(" ")[0]} 👋</h1>
                        <p className="text-muted">@{user.username} · Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                    </div>
                </section>

                <div className="dashboard-grid">

                    {/* ── Profile Summary ── */}
                    <DashboardCard title="Profile Summary">
                        <div className="profile-summary">
                            <div className="profile-summary-avatar">
                                {user.profileImage ? (
                                    <img src={user.profileImage} alt={user.name} />
                                ) : (
                                    <span>{user.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <p className="profile-summary-name">{user.name}</p>
                                <p className="text-muted">@{user.username}</p>
                                <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{user.email}</p>
                            </div>
                        </div>
                        {user.bio && <p className="profile-summary-bio">{user.bio}</p>}
                        <div className="profile-completion">
                            <div className="completion-header">
                                <span className="field-label">Profile completion</span>
                                <span className="field-label">{profilePct}%</span>
                            </div>
                            <div className="completion-bar">
                                <div className="completion-fill" style={{ width: `${profilePct}%` }} />
                            </div>
                            {profilePct < 100 && (
                                <p className="completion-hint">
                                    {!user.bio && "Add a bio "}
                                    {!user.profileImage && "· Add a profile image "}
                                    to complete your profile.
                                </p>
                            )}
                        </div>
                    </DashboardCard>

                    {/* ── Quick Actions ── */}
                    <DashboardCard title="Quick Actions">
                        <nav className="quick-actions">
                            <Link to="/profile" className="quick-action-item">
                                <User size={20} />
                                <span>Edit Profile</span>
                            </Link>
                            <Link to="/create-challenge" className="quick-action-item">
                                <Plus size={20} />
                                <span>Create Challenge</span>
                            </Link>
                            <Link to="/my-challenges" className="quick-action-item">
                                <Trophy size={20} />
                                <span>My Challenges</span>
                            </Link>
                            <Link to="/challenges" className="quick-action-item">
                                <Target size={20} />
                                <span>Explore Challenges</span>
                            </Link>
                            <Link to="/joined-challenges" className="quick-action-item">
                                <Trophy size={20} />
                                <span>Joined Challenges</span>
                            </Link>
                        </nav>
                    </DashboardCard>

                    {/* ── Created Challenges ── */}
                    <DashboardCard title={`Created Challenges (${challenges.length})`}>
                        {challengesLoading ? (
                            <p className="text-muted" style={{ padding: "1rem 0", fontSize: "0.9rem" }}>Loading...</p>
                        ) : challenges.length === 0 ? (
                            <EmptyState
                                icon={<Trophy size={32} />}
                                title="No challenges created yet"
                                description="Create your first challenge to get started."
                            />
                        ) : (
                            <ul className="dashboard-challenge-list">
                                {challenges.slice(0, 3).map((c) => (
                                    <li key={c._id} className="dashboard-challenge-item">
                                        <Link to={`/challenges/${c._id}`} className="dashboard-challenge-link">
                                            <span className="dashboard-challenge-title">{c.title}</span>
                                            <span className={`challenge-status status-${c.status}`}>{c.status}</span>
                                        </Link>
                                    </li>
                                ))}
                                {challenges.length > 3 && (
                                    <li>
                                        <Link to="/my-challenges" className="text-muted" style={{ fontSize: "0.85rem" }}>
                                            View all {challenges.length} challenges →
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        )}
                    </DashboardCard>

                    {/* ── My Participation ── */}
                    <DashboardCard title="My Participation">
                        {challengesLoading ? (
                            <p className="text-muted" style={{ padding: "1rem 0", fontSize: "0.9rem" }}>Loading...</p>
                        ) : participations.length === 0 ? (
                            <EmptyState
                                icon={<Target size={32} />}
                                title="No joined challenges"
                                description="Join challenges to track your progress here."
                            />
                        ) : (
                            <>
                                <div className="participation-stats">
                                    <div className="stat-item">
                                        <span className="stat-value">{activeCount}</span>
                                        <span className="stat-label">Active</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value">{completedCount}</span>
                                        <span className="stat-label">Completed</span>
                                    </div>
                                    {avgProgress !== null && (
                                        <div className="stat-item">
                                            <span className="stat-value">{avgProgress}%</span>
                                            <span className="stat-label">Avg Progress</span>
                                        </div>
                                    )}
                                    {completionRate !== null && (
                                        <div className="stat-item">
                                            <span className="stat-value">{completionRate}%</span>
                                            <span className="stat-label">Completion</span>
                                        </div>
                                    )}
                                </div>
                                <ul className="dashboard-challenge-list" style={{ marginTop: "0.75rem" }}>
                                    {participations.slice(0, 3).map((p) => (
                                        p.challenge && (
                                            <li key={p._id} className="dashboard-challenge-item">
                                                <Link to={`/challenges/${p.challenge._id}`}
                                                    className="dashboard-challenge-link" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.3rem" }}>
                                                    <span className="dashboard-challenge-title">{p.challenge.title}</span>
                                                    <ProgressBar progress={p.progress || 0} showLabel={false} />
                                                    <span className="text-muted" style={{ fontSize: "0.78rem" }}>{p.progress || 0}% complete</span>
                                                </Link>
                                            </li>
                                        )
                                    ))}
                                    {participations.length > 3 && (
                                        <li>
                                            <Link to="/joined-challenges" className="text-muted"
                                                style={{ fontSize: "0.85rem" }}>
                                                View all {participations.length} →
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            </>
                        )}
                    </DashboardCard>

                    {/* ── Participation Status Chart ── */}
                    {!challengesLoading && pieData.length > 0 && (
                        <DashboardCard title="Participation Breakdown">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={PIE_COLORS[entry.name] || "#6b7280"}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => [value, name]}
                                            contentStyle={{
                                                fontSize: "0.82rem",
                                                borderRadius: "6px",
                                                border: "1px solid var(--border)",
                                                background: "var(--bg)",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="chart-legend">
                                    {pieData.map((entry) => (
                                        <span key={entry.name} className="chart-legend-item">
                                            <span
                                                className="chart-legend-dot"
                                                style={{ background: PIE_COLORS[entry.name] || "#6b7280" }}
                                            />
                                            {entry.name} ({entry.value})
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </DashboardCard>
                    )}

                    {/* ── Progress Overview Chart ── */}
                    {!challengesLoading && barData.length > 0 && (
                        <DashboardCard title="Progress Overview">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                        data={barData}
                                        margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
                                        barSize={barData.length > 6 ? 14 : 22}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="var(--border)"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, "Progress"]}
                                            contentStyle={{
                                                fontSize: "0.82rem",
                                                borderRadius: "6px",
                                                border: "1px solid var(--border)",
                                                background: "var(--bg)",
                                            }}
                                            cursor={{ fill: "var(--bg-subtle)" }}
                                        />
                                        <Bar
                                            dataKey="progress"
                                            fill="var(--primary)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </DashboardCard>
                    )}

                </div>
            </div>
        </main>
    );
}

export default Dashboard;
