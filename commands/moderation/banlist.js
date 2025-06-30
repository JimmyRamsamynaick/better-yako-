// commands/moderation/banlist.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Affiche la liste des utilisateurs bannis du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Numéro de page à afficher')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction, client, getTranslation) {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de voir la liste des bannis.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply();

            // Récupérer la liste des bans
            const bans = await interaction.guild.bans.fetch();

            if (bans.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📋 Liste des bannis')
                    .setDescription('Aucun utilisateur n\'est actuellement banni de ce serveur.')
                    .setTimestamp()
                    .setFooter({
                        text: 'Yako Bot',
                        iconURL: client.user.displayAvatarURL()
                    });

                return interaction.editReply({ embeds: [embed] });
            }

            // Pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(bans.size / itemsPerPage);
            const page = Math.min(interaction.options.getInteger('page') || 1, totalPages);
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;

            // Convertir en array et trier par date
            const banArray = Array.from(bans.values())
                .sort((a, b) => b.user.id - a.user.id)
                .slice(startIndex, endIndex);

            // Créer l'embed
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('📋 Liste des utilisateurs bannis')
                .setDescription(`**Total :** ${bans.size} utilisateur(s) banni(s)`)
                .setTimestamp()
                .setFooter({
                    text: `Page ${page}/${totalPages} • Yako Bot`,
                    iconURL: client.user.displayAvatarURL()
                });

            // Ajouter les utilisateurs bannis
            let banList = '';
            banArray.forEach((ban, index) => {
                const globalIndex = startIndex + index + 1;
                const reason = ban.reason ?
                    (ban.reason.length > 50 ? ban.reason.substring(0, 50) + '...' : ban.reason)
                    : 'Aucune raison';

                banList += `**${globalIndex}.** ${ban.user.tag} \`(${ban.user.id})\`\n`;
                banList += `└ **Raison:** ${reason}\n\n`;
            });

            embed.addFields([{
                name: `Utilisateurs bannis (${startIndex + 1}-${Math.min(endIndex, bans.size)})`,
                value: banList || 'Aucun utilisateur sur cette page',
                inline: false
            }]);

            // Ajouter des boutons de navigation si nécessaire
            if (totalPages > 1) {
                embed.addFields([{
                    name: 'Navigation',
                    value: `Utilisez \`/banlist page:${page - 1}\` pour la page précédente\n` +
                        `Utilisez \`/banlist page:${page + 1}\` pour la page suivante`,
                    inline: false
                }]);
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur lors de la récupération de la banlist:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur s\'est produite lors de la récupération de la liste des bannis.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    category: 'Modération'
};