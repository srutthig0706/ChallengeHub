const Community = require("../models/Community");

/**
 * Determines whether a user can access a given challenge.
 * @param {object|null} user - The authenticated user (req.user), or null if unauthenticated.
 * @param {object} challenge - The Mongoose challenge document.
 * @returns {Promise<boolean>}
 */
async function canAccessChallenge(user, challenge) {
    if (challenge.accessType === "public") return true;

    if (!user) return false;

    const userId = user._id.toString();

    if ((challenge.creator?._id || challenge.creator).toString() === userId) return true;

    if (challenge.accessType === "private") {
        return challenge.allowedParticipants.some((p) => (p?._id || p).toString() === userId);
    }

    if (challenge.accessType === "community") {
        if (!challenge.community) return false;
        const community = await Community.findById(challenge.community).select("members creator");
        if (!community) return false;
        if (community.creator.toString() === userId) return true;
        return community.members.some((m) => m.toString() === userId);
    }

    return false;
}

module.exports = { canAccessChallenge };
