import { useNavigate, useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ChallengeForm from "../components/ChallengeForm";
import LoadingSpinner from "../components/LoadingSpinner";

function validate(fields, accessType, allowedParticipants, community) {
    if (!fields.title.trim()) return "Title is required.";
    if (fields.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (!fields.description.trim()) return "Description is required.";
    if (!fields.category) return "Please select a category.";
    if (fields.startDate && fields.endDate && fields.endDate < fields.startDate)
        return "End date cannot be before start date.";
    if (accessType === "private" && allowedParticipants.length === 0)
        return "Private challenges require at least one allowed participant.";
    if (accessType === "community" && !community)
        return "Please select a community for this challenge.";
    return null;
}

function EditChallenge() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [fetchError, setFetchError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get(`/challenges/${id}`);
                if (data.challenge.creator._id !== user._id) {
                    setFetchError("You are not authorized to edit this challenge.");
                } else {
                    setChallenge(data.challenge);
                }
            } catch (err) {
                setFetchError(err.response?.data?.message || "Failed to load challenge.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, user._id]);

    const handleSubmit = async (e, { accessType, allowedParticipants, community }) => {
        e.preventDefault();
        setError("");

        const form = e.target;
        const fields = {
            title: form.title.value,
            description: form.description.value,
            category: form.category.value,
            startDate: form.startDate.value,
            endDate: form.endDate.value,
            rules: form.rules.value,
            completionCriteria: form.completionCriteria.value,
            status: form.status.value,
            proofRequired: form.proofRequired.checked,
        };

        const validationError = validate(fields, accessType, allowedParticipants, community);
        if (validationError) return setError(validationError);

        setSubmitting(true);
        try {
            await api.put(`/challenges/${id}`, {
                ...fields,
                accessType,
                allowedParticipants: allowedParticipants.map((u) => u._id || u),
                community: community || null,
            });
            navigate(`/challenges/${id}`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update challenge.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (fetchError) {
        return (
            <main className="page-content">
                <div className="challenge-form-container">
                    <p className="form-error">{fetchError}</p>
                    <Link to="/my-challenges" className="btn-ghost" style={{ marginTop: "1rem", display: "inline-block" }}>
                        Back to My Challenges
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="page-content">
            <div className="challenge-form-container">
                <div className="page-header">
                    <div>
                        <h1>Edit Challenge</h1>
                        <p className="text-muted">Update your challenge details.</p>
                    </div>
                    <Link to={`/challenges/${id}`} className="btn-ghost">View Challenge</Link>
                </div>
                <ChallengeForm
                    initialValues={challenge}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    error={error}
                    submitLabel="Save Changes"
                />
            </div>
        </main>
    );
}

export default EditChallenge;
