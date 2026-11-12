import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

function UserProfile() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await api.get(`/users/${id}`);
                setProfile(data.user);
            } catch (err) {
                const status = err.response?.status;
                if (status === 404) setError("User not found.");
                else if (status === 400) setError("Invalid user ID.");
                else setError("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <main className="page-content">
                <div className="profile-container">
                    <p className="form-error">{error}</p>
                    <Link to="/challenges" className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Explore Challenges
                    </Link>
                </div>
            </main>
        );
    }

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
                </div>

                <section className="profile-details">
                    <div className="profile-field">
                        <span className="field-label">Bio</span>
                        <span className="field-value">
                            {profile.bio || <em className="text-muted">No bio yet.</em>}
                        </span>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default UserProfile;
