import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import ChallengeForm from "../components/ChallengeForm";

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

function CreateChallenge() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

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
            const { data } = await api.post("/challenges", {
                ...fields,
                accessType,
                allowedParticipants: allowedParticipants.map((u) => u._id),
                community: community || null,
            });
            navigate(`/challenges/${data.challenge._id}`);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create challenge.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="page-content">
            <div className="challenge-form-container">
                <div className="page-header">
                    <div>
                        <h1>Create Challenge</h1>
                        <p className="text-muted">Define your challenge and publish it for others to join.</p>
                    </div>
                    <Link to="/my-challenges" className="btn-ghost">My Challenges</Link>
                </div>
                <ChallengeForm
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    error={error}
                    submitLabel="Create Challenge"
                />
            </div>
        </main>
    );
}

export default CreateChallenge;
