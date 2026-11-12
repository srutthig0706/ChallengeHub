import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ProgressBar from "../components/ProgressBar";
import CompletionBadge from "../components/CompletionBadge";

function DetailField({ label, value }) {
    if (!value && value !== false) return null;
    return (
        <div className="profile-field">
            <span className="field-label">{label}</span>
            <span className="field-value">{String(value)}</span>
        </div>
    );
}

const ACCESS_LABELS = {
    public:    { label: "Public",    cls: "access-public" },
    private:   { label: "Private",   cls: "access-private" },
    community: { label: "Community", cls: "access-community" },
};

// ── Task form used for both create and edit ──────────────────────────────────
function TaskForm({ initial = {}, onSave, onCancel, saving }) {
    const [title, setTitle]                       = useState(initial.title || "");
    const [description, setDescription]           = useState(initial.description || "");
    const [order, setOrder]                       = useState(initial.order ?? "");
    const [milestone, setMilestone]               = useState(initial.milestone || "");
    const [deadline, setDeadline]                 = useState(
        initial.deadline ? initial.deadline.slice(0, 10) : ""
    );
    const [completionCriteria, setCompletionCriteria] = useState(initial.completionCriteria || "");
    const [err, setErr] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) { setErr("Title is required."); return; }
        setErr("");
        onSave({ title, description, order, milestone, deadline, completionCriteria });
    };

    return (
        <form className="task-form" onSubmit={handleSubmit}>
            {err && <p className="form-error">{err}</p>}
            <div className="form-group">
                <label>Title <span className="required">*</span></label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title" maxLength={200} disabled={saving} />
            </div>
            <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} placeholder="What does this task involve?" maxLength={1000} disabled={saving} />
            </div>
            <div className="task-form-row">
                <div className="form-group">
                    <label>Order</label>
                    <input type="number" value={order} onChange={(e) => setOrder(e.target.value)}
                        placeholder="1" min={0} disabled={saving} />
                </div>
                <div className="form-group">
                    <label>Milestone</label>
                    <input value={milestone} onChange={(e) => setMilestone(e.target.value)}
                        placeholder="e.g. Week 1" maxLength={100} disabled={saving} />
                </div>
                <div className="form-group">
                    <label>Deadline</label>
                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                        disabled={saving} />
                </div>
            </div>
            <div className="form-group">
                <label>Completion Criteria</label>
                <input value={completionCriteria}
                    onChange={(e) => setCompletionCriteria(e.target.value)}
                    placeholder="What counts as completing this task?" maxLength={500} disabled={saving} />
            </div>
            <div className="form-actions">
                <button type="submit" className="btn-primary btn-sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Task"}
                </button>
                <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
function ChallengeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [challenge, setChallenge]               = useState(null);
    const [loading, setLoading]                   = useState(true);
    const [error, setError]                       = useState("");

    // Delete challenge modal
    const [showDelete, setShowDelete]             = useState(false);
    const [deleting, setDeleting]                 = useState(false);
    const [deleteError, setDeleteError]           = useState("");

    // Participation
    const [participation, setParticipation]       = useState(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [partLoading, setPartLoading]           = useState(false);
    const [partError, setPartError]               = useState("");
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Tasks
    const [tasks, setTasks]                       = useState([]);
    const [tasksLoading, setTasksLoading]         = useState(true);
    const [showAddTask, setShowAddTask]           = useState(false);
    const [addingTask, setAddingTask]             = useState(false);
    const [addTaskError, setAddTaskError]         = useState("");
    const [editingTaskId, setEditingTaskId]       = useState(null);
    const [savingEdit, setSavingEdit]             = useState(false);
    const [deletingTaskId, setDeletingTaskId]     = useState(null);
    const [completingTaskId, setCompletingTaskId] = useState(null);
    const [taskActionError, setTaskActionError]   = useState("");

    // Proof submissions (participant)
    const [mySubmissions, setMySubmissions]       = useState({});  // taskId -> submission
    const [showProofForm, setShowProofForm]       = useState({});  // taskId -> bool
    const [proofText, setProofText]               = useState({});  // taskId -> string
    const [submittingTaskId, setSubmittingTaskId] = useState(null);
    const [proofMsg, setProofMsg]                 = useState({});  // taskId -> { type, text }

    // ── Loaders ──────────────────────────────────────────────────────────────
    const loadChallenge = useCallback(async () => {
        try {
            const { data } = await api.get(`/challenges/${id}`);
            setChallenge(data.challenge);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load challenge.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const loadTasks = useCallback(async () => {
        setTasksLoading(true);
        try {
            const { data } = await api.get(`/challenges/${id}/tasks`);
            setTasks(data.tasks);
        } catch {
            // Non-critical
        } finally {
            setTasksLoading(false);
        }
    }, [id]);

    const loadParticipationData = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const [partRes, participantsRes] = await Promise.all([
                api.get(`/challenges/${id}/participation`),
                api.get(`/challenges/${id}/participants`),
            ]);
            setParticipation(partRes.data.participation);
            setParticipantCount(
                participantsRes.data.participants.filter((p) => p.status === "active").length
            );
        } catch {
            // Non-critical
        }
    }, [id, isAuthenticated]);

    const loadParticipantCount = useCallback(async () => {
        try {
            const { data } = await api.get(`/challenges/${id}/participants`);
            setParticipantCount(data.participants.filter((p) => p.status === "active").length);
        } catch { /* non-critical */ }
    }, [id]);

    const loadMySubmissions = useCallback(async () => {
        try {
            const { data } = await api.get(`/challenges/${id}/submissions/my`);
            const map = {};
            data.submissions.forEach((s) => {
                const taskId = s.task?._id || s.task;
                // For each task keep: approved > pending > rejected (most recent)
                if (!map[taskId]) {
                    map[taskId] = s;
                } else {
                    const rank = { approved: 3, pending: 2, rejected: 1 };
                    if ((rank[s.status] || 0) > (rank[map[taskId].status] || 0)) {
                        map[taskId] = s;
                    }
                }
            });
            setMySubmissions(map);
        } catch { /* non-critical */ }
    }, [id]);

    useEffect(() => { loadChallenge(); }, [loadChallenge]);
    useEffect(() => { loadTasks(); }, [loadTasks]);
    useEffect(() => {
        if (isAuthenticated) loadParticipationData();
        else loadParticipantCount();
    }, [isAuthenticated, loadParticipationData, loadParticipantCount]);

    useEffect(() => {
        if (isAuthenticated && challenge?.proofRequired) loadMySubmissions();
    }, [isAuthenticated, challenge, loadMySubmissions]);

    // ── Join / Leave ─────────────────────────────────────────────────────────
    const handleJoin = async () => {
        setPartLoading(true); setPartError("");
        try {
            const { data } = await api.post(`/challenges/${id}/join`);
            setParticipation(data.participation);
            setParticipantCount((c) => c + 1);
        } catch (err) {
            const status = err.response?.status;
            if (status === 409) setPartError("You have already joined this challenge.");
            else if (status === 403) setPartError("You are not eligible to join this challenge.");
            else if (status === 401) setPartError("Please log in to join this challenge.");
            else setPartError(err.response?.data?.message || "Unable to join. Please try again.");
        } finally {
            setPartLoading(false);
        }
    };

    const handleLeave = async () => {
        setShowLeaveConfirm(false); setPartLoading(true); setPartError("");
        try {
            await api.delete(`/challenges/${id}/leave`);
            setParticipation((prev) => ({ ...prev, status: "left" }));
            setParticipantCount((c) => Math.max(0, c - 1));
        } catch (err) {
            setPartError(err.response?.data?.message || "Unable to leave. Please try again.");
        } finally {
            setPartLoading(false);
        }
    };

    // ── Task CRUD (creator) ──────────────────────────────────────────────────
    const handleAddTask = async (fields) => {
        setAddingTask(true); setAddTaskError("");
        try {
            await api.post(`/challenges/${id}/tasks`, fields);
            setShowAddTask(false);
            await loadTasks();
            // Refresh participation in case progress changed
            await loadParticipationData();
        } catch (err) {
            setAddTaskError(err.response?.data?.message || "Failed to add task.");
        } finally {
            setAddingTask(false);
        }
    };

    const handleEditTask = async (taskId, fields) => {
        setSavingEdit(true);
        try {
            const { data } = await api.put(`/tasks/${taskId}`, fields);
            setTasks((prev) => prev.map((t) => (t._id === taskId ? data.task : t)));
            setEditingTaskId(null);
        } catch (err) {
            setTaskActionError(err.response?.data?.message || "Failed to update task.");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        setDeletingTaskId(taskId);
        try {
            await api.delete(`/tasks/${taskId}`);
            setTasks((prev) => prev.filter((t) => t._id !== taskId));
            await loadParticipationData();
        } catch (err) {
            setTaskActionError(err.response?.data?.message || "Failed to delete task.");
        } finally {
            setDeletingTaskId(null);
        }
    };

    // ── Task completion (participant) ────────────────────────────────────────
    const handleCompleteTask = async (taskId) => {
        setCompletingTaskId(taskId); setTaskActionError("");
        try {
            const { data } = await api.patch(`/tasks/${taskId}/complete`);
            // Update participation state with fresh data from backend
            setParticipation((prev) => ({
                ...prev,
                status: data.participation.status,
                progress: data.participation.progress,
                completedTasks: data.participation.completedTasks,
                completedAt: data.participation.completedAt,
            }));
        } catch (err) {
            const status = err.response?.status;
            if (status === 409) setTaskActionError("You have already completed this task.");
            else setTaskActionError(err.response?.data?.message || "Failed to complete task.");
        } finally {
            setCompletingTaskId(null);
        }
    };

    // ── Proof submission (participant) ────────────────────────────────────────
    const handleSubmitProof = async (taskId) => {
        const text = (proofText[taskId] || "").trim();
        if (!text) {
            setProofMsg((prev) => ({ ...prev, [taskId]: { type: "error", text: "Please enter your proof before submitting." } }));
            return;
        }
        setSubmittingTaskId(taskId);
        setProofMsg((prev) => ({ ...prev, [taskId]: null }));
        try {
            await api.post(`/challenges/${id}/submissions`, { taskId, textProof: text });
            setProofText((prev) => ({ ...prev, [taskId]: "" }));
            setShowProofForm((prev) => ({ ...prev, [taskId]: false }));
            setProofMsg((prev) => ({ ...prev, [taskId]: { type: "success", text: "Proof submitted. Awaiting creator review." } }));
            await loadMySubmissions();
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to submit proof.";
            setProofMsg((prev) => ({ ...prev, [taskId]: { type: "error", text: msg } }));
        } finally {
            setSubmittingTaskId(null);
        }
    };

    // ── Delete challenge ─────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true); setDeleteError("");
        try {
            await api.delete(`/challenges/${id}`);
            navigate("/my-challenges");
        } catch (err) {
            setDeleteError(err.response?.data?.message || "Failed to delete.");
            setDeleting(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <main className="page-content">
                <div className="challenge-detail-container">
                    <p className="form-error">{error}</p>
                    <Link to="/challenges" className="btn-ghost"
                        style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to Challenges
                    </Link>
                </div>
            </main>
        );
    }

    const isCreator    = user && challenge.creator && challenge.creator._id === user._id;
    const accessInfo   = ACCESS_LABELS[challenge.accessType] || ACCESS_LABELS.public;
    const isPublished  = challenge.status === "published";
    const hasActive    = participation && participation.status === "active";
    const hasCompleted = participation && participation.status === "completed";
    const hasLeft      = participation && participation.status === "left";

    // Group tasks by milestone for display
    const milestoneGroups = tasks.reduce((acc, task) => {
        const key = task.milestone || "";
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {});
    const milestoneKeys = Object.keys(milestoneGroups).sort((a, b) => {
        // Empty milestone (no group) goes last
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b);
    });

    return (
        <main className="page-content">
            <div className="challenge-detail-container">

                {/* ── Header ── */}
                <div className="page-header">
                    <div>
                        <div className="challenge-detail-badges">
                            <span className="challenge-category">{challenge.category}</span>
                            <span className={`challenge-status status-${challenge.status}`}>
                                {challenge.status}
                            </span>
                            <span className={`access-badge-detail ${accessInfo.cls}`}>
                                {accessInfo.label}
                            </span>
                        </div>
                        <h1 className="challenge-detail-title">{challenge.title}</h1>
                        {challenge.creator && (
                            <p className="text-muted">
                                Created by{" "}
                                <Link
                                    to={`/users/${challenge.creator._id}`}
                                    style={{ color: "var(--primary)", textDecoration: "none" }}
                                >
                                    {challenge.creator.name} (@{challenge.creator.username})
                                </Link>
                            </p>
                        )}
                        <p className="text-muted" style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
                            {participantCount} active participant{participantCount !== 1 ? "s" : ""}
                            {tasks.length > 0 && ` · ${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
                        </p>
                    </div>
                    {isCreator && (
                        <div className="detail-actions">
                            <Link to={`/challenges/${id}/stats`} className="btn-secondary">Stats</Link>
                            <Link to={`/challenges/${id}/edit`} className="btn-secondary">Edit</Link>
                            <button className="btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
                        </div>
                    )}
                </div>

                {/* ── Challenge info ── */}
                <section className="challenge-detail-body">
                    <div className="profile-field">
                        <span className="field-label">Description</span>
                        <p className="field-value" style={{ whiteSpace: "pre-wrap" }}>
                            {challenge.description}
                        </p>
                    </div>

                    {challenge.rules && (
                        <div className="profile-field">
                            <span className="field-label">Rules</span>
                            <p className="field-value" style={{ whiteSpace: "pre-wrap" }}>
                                {challenge.rules}
                            </p>
                        </div>
                    )}

                    {challenge.completionCriteria && (
                        <DetailField label="Completion Criteria" value={challenge.completionCriteria} />
                    )}

                    <div className="challenge-detail-grid">
                        {challenge.startDate && (
                            <DetailField label="Start Date"
                                value={new Date(challenge.startDate).toLocaleDateString()} />
                        )}
                        {challenge.endDate && (
                            <DetailField label="End Date"
                                value={new Date(challenge.endDate).toLocaleDateString()} />
                        )}
                        <DetailField label="Proof Required"
                            value={challenge.proofRequired ? "Yes" : "No"} />
                    </div>

                    {challenge.accessType === "private" && challenge.allowedParticipants?.length > 0 && (
                        <div className="profile-field">
                            <span className="field-label">Allowed Participants</span>
                            <div className="participant-list">
                                {challenge.allowedParticipants.map((p) => (
                                    <span key={p._id} className="user-tag">@{p.username}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {challenge.accessType === "community" && challenge.community && (
                        <div className="profile-field">
                            <span className="field-label">Community</span>
                            <span className="field-value">{challenge.community.name}</span>
                            {challenge.community.description && (
                                <p className="text-muted"
                                    style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
                                    {challenge.community.description}
                                </p>
                            )}
                        </div>
                    )}
                </section>

                {/* ── Participation area ── */}
                <section className="challenge-join-area">
                    {partError && (
                        <p className="form-error" style={{ marginBottom: "0.75rem" }}>{partError}</p>
                    )}

                    {isCreator ? (
                        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                            You created this challenge.
                        </p>
                    ) : !isAuthenticated ? (
                        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                            <Link to="/login" style={{ color: "var(--primary)" }}>Log in</Link> to join this challenge.
                        </p>
                    ) : !isPublished ? (
                        <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                            This challenge is not open for participation yet.
                        </p>
                    ) : hasCompleted ? (
                        <CompletionBadge
                            challengeTitle={challenge.title}
                            category={challenge.category}
                            participantName={user?.name}
                            completedAt={participation.completedAt}
                            joinedAt={participation.joinedAt}
                        />
                    ) : hasActive ? (
                        <div className="join-status-row">
                            <span className="joined-badge">✓ Joined</span>
                            <button className="btn-leave"
                                onClick={() => setShowLeaveConfirm(true)}
                                disabled={partLoading}>
                                Leave Challenge
                            </button>
                        </div>
                    ) : hasLeft ? (
                        <div>
                            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                                You previously left this challenge.
                            </p>
                            <button className="btn-join" onClick={handleJoin} disabled={partLoading}>
                                {partLoading ? "Joining..." : "Join Challenge"}
                            </button>
                        </div>
                    ) : (
                        <button className="btn-join" onClick={handleJoin} disabled={partLoading}>
                            {partLoading ? "Joining..." : "Join Challenge"}
                        </button>
                    )}

                    {/* Progress bar — shown to active/completed participants */}
                    {(hasActive || hasCompleted) && (
                        <div style={{ marginTop: "1rem" }}>
                            <ProgressBar progress={participation.progress} />
                            <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>
                                {participation.completedTasks?.length || 0} / {tasks.length} task{tasks.length !== 1 ? "s" : ""} completed
                            </p>
                        </div>
                    )}
                </section>

                {/* ── Tasks section ── */}
                <section className="tasks-section">
                    <div className="tasks-section-header">
                        <h2 className="tasks-section-title">
                            Tasks {tasks.length > 0 && `(${tasks.length})`}
                        </h2>
                        {isCreator && (
                            <button className="btn-secondary btn-sm"
                                onClick={() => { setShowAddTask((v) => !v); setAddTaskError(""); }}>
                                {showAddTask ? "Cancel" : "+ Add Task"}
                            </button>
                        )}
                    </div>

                    {taskActionError && (
                        <p className="form-error" style={{ marginBottom: "0.75rem" }}>{taskActionError}</p>
                    )}

                    {/* Add task form */}
                    {isCreator && showAddTask && (
                        <div className="task-form-wrapper">
                            {addTaskError && <p className="form-error">{addTaskError}</p>}
                            <TaskForm
                                onSave={handleAddTask}
                                onCancel={() => { setShowAddTask(false); setAddTaskError(""); }}
                                saving={addingTask}
                            />
                        </div>
                    )}

                    {tasksLoading ? (
                        <p className="text-muted" style={{ padding: "1rem 0", fontSize: "0.9rem" }}>
                            Loading tasks...
                        </p>
                    ) : tasks.length === 0 ? (
                        <p className="text-muted" style={{ padding: "0.75rem 0", fontSize: "0.9rem" }}>
                            {isCreator
                                ? "No tasks yet. Add tasks to define what participants need to complete."
                                : "This challenge has no tasks yet."}
                        </p>
                    ) : (
                        milestoneKeys.map((milestoneKey) => (
                            <div key={milestoneKey || "__none__"} className="milestone-group">
                                {milestoneKey && (
                                    <h3 className="milestone-label">{milestoneKey}</h3>
                                )}
                                <div className="task-list">
                                    {milestoneGroups[milestoneKey].map((task, idx) => {
                                        const isCompleted = participation?.completedTasks?.some(
                                            (t) => t.toString() === task._id
                                        );
                                        const isEditingThis = editingTaskId === task._id;
                                        const isDeletingThis = deletingTaskId === task._id;
                                        const isCompletingThis = completingTaskId === task._id;

                                        return (
                                            <div key={task._id}
                                                className={`task-item ${isCompleted ? "task-completed" : ""}`}>
                                                {isEditingThis ? (
                                                    <TaskForm
                                                        initial={task}
                                                        onSave={(fields) => handleEditTask(task._id, fields)}
                                                        onCancel={() => setEditingTaskId(null)}
                                                        saving={savingEdit}
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="task-item-header">
                                                            <span className="task-order">
                                                                {task.order || idx + 1}
                                                            </span>
                                                            <div className="task-item-info">
                                                                <p className="task-title">{task.title}</p>
                                                                {task.description && (
                                                                    <p className="task-desc">{task.description}</p>
                                                                )}
                                                                <div className="task-meta">
                                                                    {task.deadline && (
                                                                        <span className="task-meta-item">
                                                                            Due: {new Date(task.deadline).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                    {task.completionCriteria && (
                                                                        <span className="task-meta-item">
                                                                            {task.completionCriteria}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="task-item-actions">
                                                                {/* Creator actions */}
                                                                {isCreator && (
                                                                    <>
                                                                        <button
                                                                            className="btn-ghost btn-sm"
                                                                            onClick={() => {
                                                                                setEditingTaskId(task._id);
                                                                                setTaskActionError("");
                                                                            }}>
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            className="btn-danger btn-sm"
                                                                            onClick={() => handleDeleteTask(task._id)}
                                                                            disabled={isDeletingThis}>
                                                                            {isDeletingThis ? "..." : "Delete"}
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {/* Participant actions — no proof required */}
                                                                {hasActive && !isCreator && !challenge.proofRequired && (
                                                                    isCompleted ? (
                                                                        <span className="task-done-badge">✓ Done</span>
                                                                    ) : (
                                                                        <button
                                                                            className="btn-complete-task"
                                                                            onClick={() => handleCompleteTask(task._id)}
                                                                            disabled={isCompletingThis}>
                                                                            {isCompletingThis ? "..." : "Complete"}
                                                                        </button>
                                                                    )
                                                                )}
                                                                {/* Participant actions — proof required */}
                                                                {hasActive && !isCreator && challenge.proofRequired && (
                                                                    isCompleted ? (
                                                                        <span className="task-done-badge">✓ Approved</span>
                                                                    ) : (() => {
                                                                        const sub = mySubmissions[task._id];
                                                                        const msg = proofMsg[task._id];
                                                                        const isSubmittingThis = submittingTaskId === task._id;
                                                                        const formOpen = showProofForm[task._id];
                                                                        return (
                                                                            <div className="proof-section">
                                                                                {sub?.status === "pending" && (
                                                                                    <span className="submission-badge submission-pending">⏳ Pending Review</span>
                                                                                )}
                                                                                {sub?.status === "rejected" && (
                                                                                    <div>
                                                                                        <span className="submission-badge submission-rejected">✗ Rejected</span>
                                                                                        {sub.creatorFeedback && (
                                                                                            <p className="submission-feedback">
                                                                                                <strong>Feedback:</strong> {sub.creatorFeedback}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                {msg && (
                                                                                    <p className={msg.type === "error" ? "form-error" : "form-success"}
                                                                                        style={{ margin: "0.4rem 0 0", fontSize: "0.82rem" }}>
                                                                                        {msg.text}
                                                                                    </p>
                                                                                )}
                                                                                {sub?.status !== "pending" && (
                                                                                    !formOpen ? (
                                                                                        <button
                                                                                            className="btn-complete-task"
                                                                                            onClick={() => setShowProofForm((prev) => ({ ...prev, [task._id]: true }))}>
                                                                                            {sub?.status === "rejected" ? "Resubmit Proof" : "Submit Proof"}
                                                                                        </button>
                                                                                    ) : (
                                                                                        <div className="proof-form">
                                                                                            <textarea
                                                                                                className="proof-textarea"
                                                                                                rows={3}
                                                                                                maxLength={3000}
                                                                                                placeholder="Describe your completed work, paste a link, or explain your proof..."
                                                                                                value={proofText[task._id] || ""}
                                                                                                onChange={(e) => setProofText((prev) => ({ ...prev, [task._id]: e.target.value }))}
                                                                                                disabled={isSubmittingThis}
                                                                                            />
                                                                                            <div className="proof-form-actions">
                                                                                                <button
                                                                                                    className="btn-complete-task"
                                                                                                    onClick={() => handleSubmitProof(task._id)}
                                                                                                    disabled={isSubmittingThis}>
                                                                                                    {isSubmittingThis ? "Submitting..." : "Submit"}
                                                                                                </button>
                                                                                                <button
                                                                                                    className="btn-ghost btn-sm"
                                                                                                    onClick={() => {
                                                                                                        setShowProofForm((prev) => ({ ...prev, [task._id]: false }));
                                                                                                        setProofMsg((prev) => ({ ...prev, [task._id]: null }));
                                                                                                    }}
                                                                                                    disabled={isSubmittingThis}>
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()
                                                                )}
                                                                {/* Completed participant — show done badges */}
                                                                {hasCompleted && !isCreator && (
                                                                    <span className="task-done-badge">✓ Done</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </div>

            {/* Leave confirmation */}
            {showLeaveConfirm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Leave Challenge</h2>
                        <p>Are you sure you want to leave <strong>{challenge.title}</strong>?</p>
                        <div className="modal-actions">
                            <button className="btn-danger" onClick={handleLeave} disabled={partLoading}>
                                {partLoading ? "Leaving..." : "Yes, Leave"}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowLeaveConfirm(false)}
                                disabled={partLoading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete challenge confirmation */}
            {showDelete && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Delete Challenge</h2>
                        <p>Are you sure you want to delete <strong>{challenge.title}</strong>?
                            This cannot be undone.</p>
                        {deleteError && (
                            <p className="form-error" style={{ marginTop: "0.75rem" }}>{deleteError}</p>
                        )}
                        <div className="modal-actions">
                            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowDelete(false)}
                                disabled={deleting}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default ChallengeDetails;
