import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const STATUS_LABELS = {
    draft:     { label: "Draft",     cls: "status-draft" },
    published: { label: "Published", cls: "status-published" },
    completed: { label: "Completed", cls: "status-completed" },
    archived:  { label: "Archived",  cls: "status-archived" },
};

function CommunityDetail() {
    const { id } = useParams();
    const { user } = useAuth();

    const [community, setCommunity]     = useState(null);
    const [challenges, setChallenges]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState("");

    // Add member
    const [memberQuery, setMemberQuery]     = useState("");
    const [memberResults, setMemberResults] = useState([]);
    const [memberSearching, setMemberSearching] = useState(false);
    const [addingMember, setAddingMember]   = useState(false);
    const [memberMsg, setMemberMsg]         = useState(null); // { type, text }
    const debounceRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [commRes, challRes] = await Promise.all([
                    api.get(`/communities/${id}`),
                    api.get(`/challenges?accessType=community&limit=50`),
                ]);
                setCommunity(commRes.data.community);
                const all = challRes.data.challenges || [];
                setChallenges(all.filter((c) => {
                    const cid = c.community?._id || c.community;
                    return cid === id || cid?.toString() === id;
                }));
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load community.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // Debounced user search for add-member
    useEffect(() => {
        if (!memberQuery.trim()) { setMemberResults([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setMemberSearching(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(memberQuery)}`);
                const memberIds = community?.members?.map((m) => m._id) || [];
                setMemberResults(data.users.filter((u) => !memberIds.includes(u._id)));
            } catch {
                setMemberResults([]);
            } finally {
                setMemberSearching(false);
            }
        }, 350);
    }, [memberQuery, community]);

    const handleAddMember = async (userId) => {
        setAddingMember(true);
        setMemberMsg(null);
        try {
            await api.post(`/communities/${id}/members`, { userId });
            // Re-populate members from updated community
            const refreshed = await api.get(`/communities/${id}`);
            setCommunity(refreshed.data.community);
            setMemberQuery("");
            setMemberResults([]);
            setMemberMsg({ type: "success", text: "Member added successfully." });
        } catch (err) {
            setMemberMsg({ type: "error", text: err.response?.data?.message || "Failed to add member." });
        } finally {
            setAddingMember(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <main className="page-content">
                <div className="challenge-detail-container">
                    <p className="form-error">{error}</p>
                    <Link to="/communities" className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to Communities
                    </Link>
                </div>
            </main>
        );
    }

    if (!community) {
        return (
            <main className="page-content">
                <div className="challenge-detail-container">
                    <p className="form-error">Community not found.</p>
                    <Link to="/communities" className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to Communities
                    </Link>
                </div>
            </main>
        );
    }

    const isCreator = user && community.creator?._id === user._id;
    const members   = community.members || [];

    return (
        <main className="page-content">
            <div className="challenge-detail-container">

                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.25rem" }}>
                            {community.name}
                        </h1>
                        <p className="text-muted">
                            Created by {community.creator?.name} (@{community.creator?.username})
                            {isCreator && (
                                <span className="access-badge-detail access-community"
                                    style={{ marginLeft: "0.6rem" }}>
                                    Community Creator
                                </span>
                            )}
                        </p>
                        <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
                            {members.length} member{members.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <Link to="/communities" className="btn-ghost btn-inline">
                        ← Back
                    </Link>
                </div>

                {/* Description */}
                {community.description && (
                    <section className="challenge-detail-body" style={{ marginTop: "1rem", paddingTop: "1rem" }}>
                        <div className="profile-field">
                            <span className="field-label">About</span>
                            <p className="field-value" style={{ whiteSpace: "pre-wrap" }}>
                                {community.description}
                            </p>
                        </div>
                    </section>
                )}

                {/* Members */}
                <section className="tasks-section">
                    <div className="tasks-section-header">
                        <h2 className="tasks-section-title">
                            Members ({members.length})
                        </h2>
                    </div>

                    {members.length === 0 ? (
                        <EmptyState
                            icon={<Users size={32} />}
                            title="No members yet"
                            description="Add members to this community."
                        />
                    ) : (
                        <div className="participant-list">
                            {members.map((m) => (
                                <span key={m._id} className="user-tag">
                                    {m.name} <span style={{ color: "var(--text-muted)" }}>@{m.username}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Add member — creator only */}
                    {isCreator && (
                        <div style={{ marginTop: "1.25rem" }}>
                            <p className="field-label" style={{ marginBottom: "0.5rem" }}>Add Member</p>
                            {memberMsg && (
                                <p className={memberMsg.type === "error" ? "form-error" : "form-success"}
                                    style={{ marginBottom: "0.5rem" }}>
                                    {memberMsg.text}
                                </p>
                            )}
                            <div className="user-search-input-wrap">
                                <input
                                    type="text"
                                    className="user-search-input"
                                    placeholder="Search by name, username or email..."
                                    value={memberQuery}
                                    onChange={(e) => { setMemberQuery(e.target.value); setMemberMsg(null); }}
                                    disabled={addingMember}
                                />
                                {memberSearching && (
                                    <span className="search-hint">Searching...</span>
                                )}
                                {!memberSearching && memberQuery.trim() && memberResults.length === 0 && (
                                    <span className="search-hint">No users found.</span>
                                )}
                                {memberResults.length > 0 && (
                                    <ul className="user-search-results">
                                        {memberResults.map((u) => (
                                            <li key={u._id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddMember(u._id)}
                                                    disabled={addingMember}>
                                                    <strong>{u.name}</strong> <span>@{u.username}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Community Challenges */}
                <section className="tasks-section">
                    <div className="tasks-section-header">
                        <h2 className="tasks-section-title">
                            Challenges {challenges.length > 0 && `(${challenges.length})`}
                        </h2>
                    </div>

                    {challenges.length === 0 ? (
                        <EmptyState
                            title="No challenges yet"
                            description="No challenges have been created for this community."
                        />
                    ) : (
                        <div className="communities-list" style={{ marginTop: "0.5rem" }}>
                            {challenges.map((c) => {
                                const status = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
                                return (
                                    <article key={c._id} className="community-card">
                                        <div className="community-card-header">
                                            <h3>{c.title}</h3>
                                            <span className={`challenge-status ${status.cls}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        {c.description && (
                                            <p className="community-card-desc">
                                                {c.description.length > 120
                                                    ? c.description.slice(0, 120) + "…"
                                                    : c.description}
                                            </p>
                                        )}
                                        {c.endDate && (
                                            <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                Ends: {new Date(c.endDate).toLocaleDateString()}
                                            </p>
                                        )}
                                        <Link to={`/challenges/${c._id}`} className="btn-card-view"
                                            style={{ marginTop: "0.25rem" }}>
                                            View Challenge
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}

export default CommunityDetail;
