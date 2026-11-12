import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, X, SlidersHorizontal } from "lucide-react";
import api from "../services/api";
import ChallengeCard from "../components/ChallengeCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const CATEGORIES = [
    "Coding", "Learning", "Reading", "Fitness", "Creativity",
    "Photography", "Quiz", "Skill Development", "Personal Development",
    "Competition", "Community", "Other",
];

const SORT_OPTIONS = [
    { value: "newest",    label: "Newest" },
    { value: "oldest",    label: "Oldest" },
    { value: "titleAsc",  label: "Title A–Z" },
    { value: "titleDesc", label: "Title Z–A" },
    { value: "startDate", label: "Start Date" },
    { value: "endDate",   label: "End Date" },
];

const LIMIT = 12;

function Challenges() {
    const [searchParams, setSearchParams] = useSearchParams();

    // Read initial state from URL
    const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
    const [filters, setFilters] = useState({
        q:          searchParams.get("q")          || "",
        category:   searchParams.get("category")   || "",
        accessType: searchParams.get("accessType") || "",
        status:     searchParams.get("status")     || "",
        sort:       searchParams.get("sort")        || "newest",
        page:       parseInt(searchParams.get("page")) || 1,
    });

    const [challenges, setChallenges] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: LIMIT, total: 0, pages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const hasActiveFilters = filters.q || filters.category || filters.accessType || filters.status;

    const fetchChallenges = useCallback(async (f) => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (f.q)          params.set("q",          f.q);
            if (f.category)   params.set("category",   f.category);
            if (f.accessType) params.set("accessType", f.accessType);
            if (f.status)     params.set("status",     f.status);
            params.set("sort",  f.sort  || "newest");
            params.set("page",  f.page  || 1);
            params.set("limit", LIMIT);

            const { data } = await api.get(`/challenges?${params.toString()}`);
            setChallenges(data.challenges);
            setPagination(data.pagination);
        } catch {
            setError("Unable to load challenges. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Sync URL params and fetch when filters change
    useEffect(() => {
        const params = {};
        if (filters.q)          params.q          = filters.q;
        if (filters.category)   params.category   = filters.category;
        if (filters.accessType) params.accessType = filters.accessType;
        if (filters.status)     params.status     = filters.status;
        if (filters.sort !== "newest") params.sort = filters.sort;
        if (filters.page > 1)   params.page       = filters.page;
        setSearchParams(params, { replace: true });

        fetchChallenges(filters);
    }, [filters, fetchChallenges, setSearchParams]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setFilters((f) => ({ ...f, q: searchInput.trim(), page: 1 }));
    };

    const handleFilterChange = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    };

    const clearFilters = () => {
        setSearchInput("");
        setFilters({ q: "", category: "", accessType: "", status: "", sort: "newest", page: 1 });
    };

    const goToPage = (p) => setFilters((f) => ({ ...f, page: p }));

    return (
        <main className="page-content">
            <div className="discover-container">

                {/* Header */}
                <div className="discover-header">
                    <div>
                        <h1>Explore Challenges</h1>
                        <p className="text-muted">Discover challenges created by the ChallengeHub community.</p>
                    </div>
                    <Link to="/create-challenge" className="btn-primary btn-inline">+ Create Challenge</Link>
                </div>

                {/* Search + Filters */}
                <div className="discover-filters">
                    <form className="search-bar" onSubmit={handleSearchSubmit}>
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search challenges..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="search-input"
                        />
                        {searchInput && (
                            <button type="button" className="search-clear" onClick={() => { setSearchInput(""); setFilters((f) => ({ ...f, q: "", page: 1 })); }}>
                                <X size={14} />
                            </button>
                        )}
                        <button type="submit" className="btn-primary btn-search">Search</button>
                    </form>

                    <div className="filter-row">
                        <SlidersHorizontal size={15} className="filter-icon" />

                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange("category", e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                            value={filters.accessType}
                            onChange={(e) => handleFilterChange("accessType", e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Access Types</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="community">Community</option>
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange("status", e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="completed">Completed</option>
                        </select>

                        <select
                            value={filters.sort}
                            onChange={(e) => handleFilterChange("sort", e.target.value)}
                            className="filter-select"
                        >
                            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        {hasActiveFilters && (
                            <button className="btn-clear-filters" onClick={clearFilters}>
                                <X size={13} /> Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Results count */}
                {!loading && !error && (
                    <p className="results-count">
                        {pagination.total === 0
                            ? "No challenges found"
                            : `${pagination.total} challenge${pagination.total !== 1 ? "s" : ""} found`}
                        {filters.q && <span> for &ldquo;{filters.q}&rdquo;</span>}
                    </p>
                )}

                {/* Content */}
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <div className="discover-error">
                        <p className="form-error">{error}</p>
                        <button className="btn-ghost" onClick={() => fetchChallenges(filters)}>Try Again</button>
                    </div>
                ) : challenges.length === 0 ? (
                    <EmptyState
                        icon={<Search size={40} />}
                        title={hasActiveFilters ? "No challenges match your filters" : "No challenges yet"}
                        description={hasActiveFilters ? "Try adjusting or clearing your filters." : "Be the first to create a challenge!"}
                    />
                ) : (
                    <div className="challenges-grid">
                        {challenges.map((c) => <ChallengeCard key={c._id} challenge={c} />)}
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && pagination.pages > 1 && (
                    <div className="pagination">
                        <button
                            className="btn-ghost btn-sm"
                            onClick={() => goToPage(filters.page - 1)}
                            disabled={filters.page <= 1}
                        >
                            ← Previous
                        </button>
                        <div className="pagination-pages">
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    className={`pagination-btn ${p === filters.page ? "active" : ""}`}
                                    onClick={() => goToPage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <button
                            className="btn-ghost btn-sm"
                            onClick={() => goToPage(filters.page + 1)}
                            disabled={filters.page >= pagination.pages}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default Challenges;
