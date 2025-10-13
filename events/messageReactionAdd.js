const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');
const WelcomeTracker = require('../utils/welcomeTracker');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user, client) {
        try {
            if (!user || user.bot) return;

            // Gérer les partials
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (_) {
                    return; // impossible de récupérer, on abandonne
                }
            }

            const message = reaction.message;
            if (message && message.partial) {
                try {
                    await message.fetch();
                } catch (_) {
                    return;
                }
            }
            if (!message || !message.id || !message.guild) return;

            const entry = WelcomeTracker.get(message.id);
            if (!entry) return;

            const guildDoc = await Guild.findOne({ guildId: message.guild.id });
            const lang = (guildDoc && guildDoc.language) ? guildDoc.language : 'fr';

            // Ajoute le réacteur courant et construit la ligne compacte (-# ...)
            WelcomeTracker.addReactor(message.id, user.id);
            const reactors = WelcomeTracker.getReactors(message.id);
            const listStr = reactors.map(id => `<@${id}>`).join(', ');
            const suffix = LanguageManager.get(
                lang,
                reactors.length > 1 ? 'events.welcome.react_appended_pl' : 'events.welcome.react_appended_sg'
            ) || (reactors.length > 1 ? 'also welcome you!' : 'also welcomes you!');
            const compactLine = `-# ${listStr} ${suffix}`;

            try {
                const content = message.content || '';
                const lines = content.split('\n');
                // Nettoyer les anciennes lignes d'accueil ajoutées (ancienne version) et toute ligne '-#' existante
                const cleaned = lines.filter(l => {
                    const t = l.trim();
                    if (t.startsWith('-# ')) return false; // on remplace par la version compacte actualisée
                    if (t.includes('souhaite également la bienvenue')) return false; // FR ancienne version
                    if (t.toLowerCase().includes('also welcome')) return false; // EN ancienne version
                    return true;
                });
                cleaned.push(compactLine);
                await message.edit({ content: cleaned.join('\n') });
            } catch (_) {
                // ignore failures
            }
        } catch (error) {
            console.error('Erreur dans messageReactionAdd:', error);
        }
    }
};