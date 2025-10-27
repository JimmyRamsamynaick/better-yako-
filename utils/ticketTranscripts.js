const fs = require('fs');
const path = require('path');

// Dossier où stocker les transcripts des tickets
const TRANSCRIPTS_DIR = path.join(__dirname, '..', 'transcripts');

function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (_) {}
}

function sanitizeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function getTranscriptFilePath(channelName) {
  ensureDir(TRANSCRIPTS_DIR);
  const fileName = `${sanitizeFileName(channelName)}.txt`;
  return path.join(TRANSCRIPTS_DIR, fileName);
}

function appendLine(filePath, line) {
  try {
    fs.appendFileSync(filePath, line + '\n', { encoding: 'utf8' });
  } catch (err) {
    console.error('[Tickets] Failed to append to transcript:', err);
  }
}

function initTranscript(channel, categoryKey, openerTag) {
  try {
    const filePath = getTranscriptFilePath(channel.name);
    const now = new Date();
    const header = [
      '=== TICKET TRANSCRIPT ===',
      `Channel: ${channel.name} (${channel.id})`,
      `Category: ${categoryKey}`,
      `Opened by: ${openerTag}`,
      `Created at: ${now.toISOString()}`,
      '-------------------------'
    ].join('\n');
    // Création du fichier avec en-tête
    fs.writeFileSync(filePath, header + '\n', { encoding: 'utf8' });
  } catch (err) {
    console.error('[Tickets] Failed to initialize transcript:', err);
  }
}

function appendSystemLine(channel, message) {
  try {
    const filePath = getTranscriptFilePath(channel.name);
    const line = `[SYSTEM] ${new Date().toISOString()} - ${message}`;
    appendLine(filePath, line);
  } catch (err) {
    console.error('[Tickets] Failed to write system line:', err);
  }
}

module.exports = {
  initTranscript,
  appendSystemLine,
  getTranscriptFilePath,
};