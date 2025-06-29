// commands/moderation/ban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannit un utilisateur du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à bannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du bannissement')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('suppression')
                .setDescription('Nombre de jours de messages à supprimer (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client, getTranslation) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de bannir des membres.',
                ephemeral: true
            });
        }

        const userToBan = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
        const deleteMessageDays = interaction.options.getInteger('suppression') || 0;

        // Vérifier si l'utilisateur est sur le serveur
        const memberToBan = interaction.guild.members.cache.get(userToBan.id);

        if (memberToBan) {
            // Vérifier si l'utilisateur peut être banni
            if (memberToBan.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ Vous ne pouvez pas bannir cet utilisateur.',
                    ephemeral: true
                });
            }
            if (!memberToBan.bannable) {
                return interaction.reply({
                    content: '❌ Je ne peux pas bannir cet utilisateur.',
                    ephemeral: true
                });
            }
        }

        try {
            // Bannir l'utilisateur
            await interaction.guild.members.ban(userToBan, {
                reason: `${interaction.user.username}: ${reason}`,
                deleteMessageDays: deleteMessageDays
            });

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔨 Utilisateur banni')
                .setDescription(`**${userToBan.username}** a été banni du serveur.`)
                .addFields(
                    { name: 'Raison', value: reason, inline: false },
                    { name: 'Modérateur', value: interaction.user.username, inline: true },
                    { name: 'Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true }
                )
                .setThumbnail(userToBan.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log dans un canal de modération si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
            if (logChannel) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du ban:', error);
            interaction.reply({
                content: '❌ Une erreur s\'est produite lors du bannissement.',
                ephemeral: true
            });
        }
    },

    category: 'Modération'
};