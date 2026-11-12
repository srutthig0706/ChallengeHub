import { useState, useEffect, useRef } from "react";
import api from "../services/api";

const CATEGORIES = [
    "Coding", "Learning", "Reading", "Fitness", "Creativity",
    "Photography", "Quiz", "Skill Development", "Personal Development",
    "Competition", "Community", "Other",
];

const ACCESS_DESCRIPTIONS = {
    public: "Anyone can discover and participate when eligible.",
    private: "Only selected users can access this challenge.",
    community: "Only members of the selected community can access this challenge.",
};

function UserSearchSelector({ selected, onChange, disabled }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                setResults(data.users.filter((u) => !selected.some((s) => s._id === u._id)));
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    }, [query, selected]);

    const add = (user) => {
        onChange([...selected, user]);
        setQuery("");
        setResults([]);
    };

    const remove = (id) => onChange(selected.filter((u) => u._id !== id));

    return (
        <div className="user-selector">
            <div className="selected-users">
                {selected.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.85rem" }}>No users selected yet.</p>
                )}
                {selected.map((u) => (
                    <span key={u._id} className="user-tag">
                        @{u.username}
                        {!disabled && (
                            <button type="button" className="user-tag-remove" onClick={() => remove(u._id)}>×</button>
                        )}
                    </span>
                ))}
            </div>
            {!disabled && (
                <div className="user-search-input-wrap">
                    <input
                        type="text"
                        placeholder="Search by name, username or email..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="user-search-input"
                    />
                    {searching && <span className="search-hint">Searching...</span>}
                    {!searching && query.trim() && results.length === 0 && (
                        <span className="search-hint">No users found.</span>
                    )}
                    {results.length > 0 && (
                        <ul className="user-search-results">
                            {results.map((u) => (
                                <li key={u._id}>
                                    <button type="button" onClick={() => add(u)}>
                                        <strong>{u.name}</strong> <span>@{u.username}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function CommunitySelector({ value, onChange, disabled }) {
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/communities")
            .then(({ data }) => setCommunities(data.communities))
            .catch(() => setCommunities([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="form-group">
            <label htmlFor="community">Community <span className="required">*</span></label>
            {loading ? (
                <p className="text-muted" style={{ fontSize: "0.85rem" }}>Loading communities...</p>
            ) : communities.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                    No communities available. Create one first via the Communities page.
                </p>
            ) : (
                <select
                    id="community"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                >
                    <option value="">Select a community</option>
                    {communities.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
            )}
        </div>
    );
}

function ChallengeForm({ initialValues, onSubmit, submitting, error, submitLabel }) {
    const [accessType, setAccessType] = useState(initialValues?.accessType || "public");
    const [allowedParticipants, setAllowedParticipants] = useState(
        initialValues?.allowedParticipants || []
    );
    const [community, setCommunity] = useState(
        initialValues?.community?._id || initialValues?.community || ""
    );

    // Expose access data to parent via a hidden mechanism — parent reads from state via props callback
    // We use a controlled submit approach: parent calls onSubmit(e, accessData)
    const handleSubmit = (e) => {
        onSubmit(e, { accessType, allowedParticipants, community });
    };

    return (
        <form className="challenge-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="form-error">{error}</p>}

            <div className="form-group">
                <label htmlFor="title">Title <span className="required">*</span></label>
                <input
                    id="title" name="title" type="text"
                    defaultValue={initialValues?.title || ""}
                    placeholder="Give your challenge a clear title"
                    disabled={submitting} maxLength={120}
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description <span className="required">*</span></label>
                <textarea
                    id="description" name="description" rows={4}
                    defaultValue={initialValues?.description || ""}
                    placeholder="Describe what this challenge is about"
                    disabled={submitting} maxLength={2000}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="category">Category <span className="required">*</span></label>
                    <select id="category" name="category"
                        defaultValue={initialValues?.category || ""}
                        disabled={submitting}>
                        <option value="">Select a category</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="accessType">Access Type</label>
                    <select
                        id="accessType" name="accessType"
                        value={accessType}
                        onChange={(e) => setAccessType(e.target.value)}
                        disabled={submitting}
                    >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="community">Community</option>
                    </select>
                    <p className="access-hint">{ACCESS_DESCRIPTIONS[accessType]}</p>
                </div>
            </div>

            {/* Private: user search */}
            {accessType === "private" && (
                <div className="form-group">
                    <label>Allowed Participants <span className="required">*</span></label>
                    <UserSearchSelector
                        selected={allowedParticipants}
                        onChange={setAllowedParticipants}
                        disabled={submitting}
                    />
                </div>
            )}

            {/* Community: community selector */}
            {accessType === "community" && (
                <CommunitySelector
                    value={community}
                    onChange={setCommunity}
                    disabled={submitting}
                />
            )}

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="startDate">Start Date</label>
                    <input id="startDate" name="startDate" type="date"
                        defaultValue={initialValues?.startDate ? initialValues.startDate.slice(0, 10) : ""}
                        disabled={submitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="endDate">End Date</label>
                    <input id="endDate" name="endDate" type="date"
                        defaultValue={initialValues?.endDate ? initialValues.endDate.slice(0, 10) : ""}
                        disabled={submitting} />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="rules">Rules</label>
                <textarea id="rules" name="rules" rows={3}
                    defaultValue={initialValues?.rules || ""}
                    placeholder="Define the rules participants must follow"
                    disabled={submitting} maxLength={1000} />
            </div>

            <div className="form-group">
                <label htmlFor="completionCriteria">Completion Criteria</label>
                <textarea id="completionCriteria" name="completionCriteria" rows={2}
                    defaultValue={initialValues?.completionCriteria || ""}
                    placeholder="How is this challenge considered complete?"
                    disabled={submitting} maxLength={500} />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status"
                        defaultValue={initialValues?.status || "draft"}
                        disabled={submitting}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div className="form-group form-group-checkbox">
                    <label className="checkbox-label">
                        <input type="checkbox" name="proofRequired"
                            defaultChecked={initialValues?.proofRequired || false}
                            disabled={submitting} />
                        Proof of completion required
                    </label>
                </div>
            </div>

            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? "Saving..." : submitLabel || "Save"}
                </button>
            </div>
        </form>
    );
}

export default ChallengeForm;
