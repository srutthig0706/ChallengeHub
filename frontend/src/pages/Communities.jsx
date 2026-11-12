import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

function Communities() {
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    useEffect(() => {
        api.get("/communities")
            .then(({ data }) => setCommunities(data.communities))
            .catch(() => setError("Failed to load communities."))
            .finally(() => setLoading(false));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError("");
        if (!name.trim()) return setCreateError("Community name is required.");

        setCreating(true);
        try {
            const { data } = await api.post("/communities", { name: name.trim(), description: description.trim() });
            setCommunities((prev) => [data.community, ...prev]);
            setName("");
            setDescription("");
            setShowForm(false);
        } catch (err) {
            setCreateError(err.response?.data?.message || "Failed to create community.");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <main className="page-content">
            <div className="my-challenges-container">
                <div className="page-header">
                    <div>
                        <h1>Communities</h1>
                        <p className="text-muted">Communities are used to restrict challenge access to specific groups.</p>
                    </div>
                    <button className="btn-primary btn-inline" onClick={() => setShowForm((v) => !v)}>
                        {showForm ? "Cancel" : "+ New Community"}
                    </button>
                </div>

                {showForm && (
                    <form className="community-create-form" onSubmit={handleCreate} noValidate>
                        {createError && <p className="form-error">{createError}</p>}
                        <div className="form-group">
                            <label htmlFor="comm-name">Name <span className="required">*</span></label>
                            <input
                                id="comm-name" type="text" value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. AI Club" maxLength={80} disabled={creating}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="comm-desc">Description</label>
                            <textarea
                                id="comm-desc" rows={2} value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this community about?" maxLength={500} disabled={creating}
                            />
                        </div>
                        <button type="submit" className="btn-primary btn-inline" disabled={creating}>
                            {creating ? "Creating..." : "Create Community"}
                        </button>
                    </form>
                )}

                {error && <p className="form-error">{error}</p>}

                {communities.length === 0 ? (
                    <EmptyState
                        icon={<Users size={40} />}
                        title="No communities yet"
                        description="Create a community to use with community challenges."
                    />
                ) : (
                    <div className="communities-list">
                        {communities.map((c) => (
                            <article key={c._id} className="community-card">
                                <div className="community-card-header">
                                    <h3>{c.name}</h3>
                                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                                        {c.members?.length || 1} member{(c.members?.length || 1) !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                {c.description && <p className="community-card-desc">{c.description}</p>}
                                <p className="text-muted" style={{ fontSize: "0.8rem" }}>
                                    Created by {c.creator?.name} (@{c.creator?.username})
                                </p>
                                <Link to={`/communities/${c._id}`} className="btn-card-view"
                                    style={{ marginTop: "0.25rem" }}>
                                    View
                                </Link>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default Communities;
