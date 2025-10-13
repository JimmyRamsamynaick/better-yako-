const { EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');
const WelcomeTracker = require('../utils/welcomeTracker');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const guild = await Guild.findOne({ guildId: member.guild.id });

            // ===== Logs de jointure (si activés) =====
            const enableServerLogs = !!(guild && guild.logs && guild.logs.enabled && guild.logs.types && guild.logs.types.server);

            // Vérifier s'il y a un canal configuré pour les logs de serveur
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const serverLogChannel = guild.logs.channels.find(ch => ch.types.server);
                if (serverLogChannel) {
                    logChannel = member.guild.channels.cache.get(serverLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = member.guild.channels.cache.get(guild.logs.channelId);
            }

            if (enableServerLogs && !logChannel) {
                // pas de canal de logs trouvé, mais on continue pour le message de bienvenue
            }

            if (enableServerLogs && logChannel) {
                const embed = new EmbedBuilder()
                .setTitle('📥 Membre rejoint')
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 Utilisateur', value: `${member.user} (${member.user.tag})`, inline: true },
                    { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '👥 Nombre de membres', value: `${member.guild.memberCount}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${member.user.id}` });
                if (member.user.displayAvatarURL()) {
                    embed.setThumbnail(member.user.displayAvatarURL());
                }
                await logChannel.send({ embeds: [embed] });
            }

            // ===== Message de bienvenue public avec réaction =====
            const lang = (guild && guild.language) ? guild.language : 'fr';
            // Respecter l’option welcome.enabled (par défaut true si non défini)
            const welcomeEnabled = !guild || !guild.welcome || guild.welcome.enabled !== false;
            if (!welcomeEnabled) return;
            const welcomeText = LanguageManager.get(lang, 'events.welcome.message', {
                user: `<@${member.id}>`
            }) || `Bienvenue <@${member.id}> ! 🎉`;

            // Choisir le canal pour envoyer le message public
            // Priorité: canal configuré via /setwelcome, sinon systemChannel, sinon premier texte avec permission
            let targetChannel = null;
            if (guild && guild.welcome && guild.welcome.channelId) {
                const configured = member.guild.channels.cache.get(guild.welcome.channelId);
                if (configured && configured.type === ChannelType.GuildText && configured.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
                    targetChannel = configured;
                }
            }
            if (!targetChannel) {
                targetChannel = member.guild.systemChannel || null;
            }
            if (!targetChannel) {
                // Fallback: premier salon texte où le bot peut envoyer
                targetChannel = member.guild.channels.cache
                    .filter(c => c.type === ChannelType.GuildText && c.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.SendMessages))
                    .first() || null;
            }

            if (targetChannel) {
                const sent = await targetChannel.send({ content: welcomeText });
                const emoji = LanguageManager.get(lang, 'events.welcome.reaction_emoji') || '🎉';
                try {
                    await sent.react(emoji);
                } catch (_) {
                    // ignorer erreur de réaction
                }
                WelcomeTracker.register(sent.id, member.guild.id, member.id);
            }

        } catch (error) {
            console.error('Erreur dans guildMemberAdd:', error);
        }
    }
};