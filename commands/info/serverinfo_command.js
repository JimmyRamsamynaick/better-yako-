// commands/info/serverinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Affiche les informations du serveur'),

    async execute(interaction, client, getTranslation) {
        const guild = interaction.guild;

        // Récupérer le propriétaire
        const owner = await guild.fetchOwner();

        // Compter les différents types de salons
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === 0).size;
        const voiceChannels = channels.filter(c => c.type === 2).size;
        const categories = channels.filter(c => c.type === 4).size;

        // Statistiques des membres
        const members = guild.members.cache;
        const humans = members.filter(m => !m.user.bot).size;
        const bots = members.filter(m => m.user.bot).size;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                {
                    name: '🆔 ID du serveur',
                    value: guild.id,
                    inline: true
                },
                {
                    name: '👑 Propriétaire',
                    value: owner.user.username,
                    inline: true
                },
                {
                    name: '📅 Créé le',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '👥 Membres',
                    value: `**Total:** ${guild.memberCount}\n**Humains:** ${humans}\n**Bots:** ${bots}`,
                    inline: true
                },
                {
                    name: '📝 Salons',
                    value: `**Total:** ${channels.size}\n**Texte:** ${textChannels}\n**Vocal:** ${voiceChannels}\n**Catégories:** ${categories}`,
                    inline: true
                },
                {
                    name: '🎭 Rôles',
                    value: guild.roles.cache.size.toString(),
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        // Ajouter le boost du serveur si applicable
        if (guild.premiumSubscriptionCount > 0) {
            embed.addFields({
                name: '💎 Boosts',
                value: `**Niveau:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount}`,
                inline: true
            });
        }

        // Ajouter la bannière si elle existe
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 512 }));
        }

        interaction.reply({ embeds: [embed] });
    },

    category: 'Informations'
};
