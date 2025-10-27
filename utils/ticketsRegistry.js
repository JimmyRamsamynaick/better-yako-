// Simple registre en mémoire pour stocker des métadonnées de tickets
// Ceci permet d'enregistrer des infos utiles au moment de la fermeture/suppression

const registry = new Map();

function ensureEntry(channelId) {
  if (!registry.has(channelId)) {
    registry.set(channelId, { meta: {}, closedBy: null, onClose: {} });
  }
  return registry.get(channelId);
}

function setTicketMeta(channelId, meta) {
  const entry = ensureEntry(channelId);
  entry.meta = { ...entry.meta, ...meta };
}

function setClosedBy(channelId, user) {
  const entry = ensureEntry(channelId);
  // Stocker infos minimales pour usage ultérieur
  const safeUser = user && typeof user === 'object' ? { id: user.id, tag: user.tag } : user;
  entry.closedBy = safeUser;
}

function updateOnClose(channelId, data) {
  const entry = ensureEntry(channelId);
  entry.onClose = { ...entry.onClose, ...data };
}

function get(channelId) {
  return registry.get(channelId);
}

function remove(channelId) {
  registry.delete(channelId);
}

module.exports = {
  setTicketMeta,
  setClosedBy,
  updateOnClose,
  get,
  remove,
};