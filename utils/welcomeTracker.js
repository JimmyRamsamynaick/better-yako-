const tracker = new Map(); // messageId -> { guildId, newMemberId, reactors: [], updated: false }

module.exports = {
    register(messageId, guildId, newMemberId) {
        tracker.set(messageId, { guildId, newMemberId, reactors: [], updated: false });
    },
    get(messageId) {
        return tracker.get(messageId);
    },
    addReactor(messageId, userId) {
        const entry = tracker.get(messageId);
        if (!entry) return null;
        if (!entry.reactors.includes(userId)) {
            entry.reactors.push(userId);
            tracker.set(messageId, entry);
        }
        return entry;
    },
    getReactors(messageId) {
        const entry = tracker.get(messageId);
        return entry ? entry.reactors : [];
    },
    markUpdated(messageId) {
        const entry = tracker.get(messageId);
        if (entry) {
            entry.updated = true;
            tracker.set(messageId, entry);
        }
    }
};