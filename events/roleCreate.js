const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');
const LanguageManager = require('../utils/languageManager');

module.exports = {
    name: 'roleCreate',
    async execute(role) {
        try {
            const guild = await Guild.findOne({ guildId: role.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.roles) return;

            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const roleLogChannel = guild.logs.channels.find(ch => ch.types.roles);
                if (roleLogChannel) {
                    logChannel = role.guild.channels.cache.get(roleLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = role.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const lang = guild.language || 'fr';
            const embed = new EmbedBuilder()
                .setTitle(LanguageManager.get(lang, 'events.roles.created.title'))
                .setColor(0x00FF00)
                .addFields(
                    { name: LanguageManager.get(lang, 'events.roles.created.fields.role'), value: `<@&${role.id}> (\`${role.name}\`)`, inline: false },
                    { name: LanguageManager.get(lang, 'events.roles.created.fields.color'), value: role.hexColor || '#000000', inline: true },
                    { name: LanguageManager.get(lang, 'events.roles.created.fields.position'), value: `${role.position}`, inline: true },
                    { name: LanguageManager.get(lang, 'events.roles.created.fields.mentionable'), value: role.mentionable ? LanguageManager.get(lang, 'common.yes') : LanguageManager.get(lang, 'common.no'), inline: true },
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${role.id}` });

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du log de création de rôle:', error);
        }
    }
};