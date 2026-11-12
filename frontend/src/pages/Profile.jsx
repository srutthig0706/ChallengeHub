import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

function Profile() {
    const { user: authUser, refreshUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({ name: "", username: "", bio: "" });

    const [achievements, setAchievements]           = useState([]);
    const [achievementsError, setAchievementsError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await api.get(`/users/${authUser._id}`);
                setProfile(data.user);
                setForm({
                    name: data.user.name,
                    username: data.user.username,
                    bio: data.user.bio || "",
                });
            } catch {
                setError("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };
        if (authUser) fetchProfile();
    }, [authUser]);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError("");
        setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name.trim()) return setError("Name cannot be empty.");
        if (form.username.trim().length < 3) return setError("Username must be at least 3 characters.");
        if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) return setError("Username can only contain letters, numbers, and underscores.");
        if (form.bio.length > 300) return setError("Bio cannot exceed 300 characters.");

        setSaving(true);
        try {
            const { data } = await api.put(`/users/${authUser._id}`, {
                name: form.name.trim(),
                username: form.username.trim(),
                bio: form.bio,
            });
            setProfile(data.user);
            setSuccess("Profile updated successfully.");
            setEditing(false);
            await refreshUser();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({ name: profile.name, username: profile.username, bio: profile.bio || "" });
        setError("");
        setSuccess("");
        setEditing(false);
    };

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const { data } = await api.get("/users/me/challenges");
                const completed = data.participations.filter((p) => p.status === "completed");
                setAchievements(completed);
            } catch {
                setAchievementsError("Could not load achievements.");
            }
        };
        if (authUser) fetchAchievements();
    }, [authUser]);

    if (loading) return <LoadingSpinner />;

    return (
        <main className="page-content">
            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {profile.profileImage ? (
                            <img src={profile.profileImage} alt={profile.name} />
                        ) : (
                            <span>{profile.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="profile-header-info">
                        <h1>{profile.name}</h1>
                        <p className="profile-username">@{profile.username}</p>
                        <p className="profile-joined">
                            Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </p>
                    </div>
                    {!editing && (
                        <button className="btn-secondary" onClick={() => setEditing(true)}>
                            Edit Profile
                        </button>
                    )}
                </div>

                {error && <p className="form-error">{error}</p>}
                {success && <p className="form-success">{success}</p>}

                {editing ? (
                    <form className="profile-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={form.name}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={form.username}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bio">Bio <span className="char-count">{form.bio.length}/300</span></label>
                            <textarea
                                id="bio"
                                name="bio"
                                rows={3}
                                value={form.bio}
                                onChange={handleChange}
                                placeholder="Tell others about yourself..."
                                disabled={saving}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button type="button" className="btn-ghost" onClick={handleCancel} disabled={saving}>
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <section className="profile-details">
                        <div className="profile-field">
                            <span className="field-label">Email</span>
                            <span className="field-value">{profile.email}</span>
                        </div>
                        <div className="profile-field">
                            <span className="field-label">Bio</span>
                            <span className="field-value">{profile.bio || <em className="text-muted">No bio yet.</em>}</span>
                        </div>
                    </section>
                )}

                <section className="achievements-section">
                    <span className="field-label">Achievements</span>

                    {achievementsError ? (
                        <p className="text-muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                            {achievementsError}
                        </p>
                    ) : achievements.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                            No completed challenges yet.
                        </p>
                    ) : (
                        <div className="achievements-grid">
                            {achievements.map(({ _id, challenge, completedAt, joinedAt }) => {
                                if (!challenge) return null;
                                const duration = calcDuration(joinedAt, completedAt);
                                return (
                                    <div key={_id} className="achievement-card">
                                        <div className="achievement-card-icon">
                                            <Trophy size={18} />
                                        </div>
                                        <div className="achievement-card-body">
                                            <p className="achievement-card-title">{challenge.title}</p>
                                            {challenge.category && (
                                                <span className="challenge-category">{challenge.category}</span>
                                            )}
                                            <div className="achievement-card-meta">
                                                {completedAt && (
                                                    <span className="meta-item">
                                                        Completed {new Date(completedAt).toLocaleDateString("en-US", {
                                                            year: "numeric", month: "short", day: "numeric",
                                                        })}
                                                    </span>
                                                )}
                                                {duration && (
                                                    <span className="meta-item">{duration}</span>
                                                )}
                                            </div>
                                            <Link
                                                to={`/challenges/${challenge._id}`}
                                                className="btn-card-view achievement-card-link"
                                            >
                                                View Challenge
                                            </Link>
                                        </div>
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

function calcDuration(joinedAt, completedAt) {
    if (!joinedAt || !completedAt) return null;
    const start = new Date(joinedAt);
    const end   = new Date(completedAt);
    if (isNaN(start) || isNaN(end) || end < start) return null;
    const ms   = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
    const days = Math.floor(ms / 86_400_000);
    return days === 0 ? "Same day" : `${days} day${days !== 1 ? "s" : ""}`;
}

export default Profile;
