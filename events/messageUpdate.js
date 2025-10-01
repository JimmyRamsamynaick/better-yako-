const { EmbedBuilder } = require('discord.js');
const Guild = require('../models/Guild');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Ignorer les messages de bots et les messages partiels
        if (newMessage.author.bot || newMessage.partial || oldMessage.partial) return;
        
        // Ignorer si le contenu n'a pas changé
        if (oldMessage.content === newMessage.content) return;

        try {
            const guild = await Guild.findOne({ guildId: newMessage.guild.id });
            if (!guild || !guild.logs.enabled || !guild.logs.types.message) return;

            // Vérifier s'il y a un canal configuré pour les logs de messages
            let logChannel = null;
            if (guild.logs.channels && guild.logs.channels.length > 0) {
                const messageLogChannel = guild.logs.channels.find(ch => ch.types.message);
                if (messageLogChannel) {
                    logChannel = newMessage.guild.channels.cache.get(messageLogChannel.channelId);
                }
            } else if (guild.logs.channelId) {
                logChannel = newMessage.guild.channels.cache.get(guild.logs.channelId);
            }

            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle('📝 Message modifié')
                .setColor(0xFFA500)
                .addFields(
                    { name: '👤 Utilisateur', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
                    { name: '📍 Salon', value: `${newMessage.channel}`, inline: true },
                    { name: '🔗 Lien', value: `[Aller au message](${newMessage.url})`, inline: true },
                    { name: '📜 Ancien contenu', value: oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content || '*Contenu vide*' },
                    { name: '📝 Nouveau contenu', value: newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content || '*Contenu vide*' }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${newMessage.id}` });

            if (newMessage.author.displayAvatarURL()) {
                embed.setThumbnail(newMessage.author.displayAvatarURL());
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors du log de modification de message:', error);
        }
    }
};