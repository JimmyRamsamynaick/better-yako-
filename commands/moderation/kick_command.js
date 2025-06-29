// commands/moderation/kick.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulse un utilisateur du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à expulser')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction, client, getTranslation) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission d\'expulser des membres.',
                ephemeral: true
            });
        }

        const memberToKick = interaction.guild.members.cache.get(interaction.options.getUser('utilisateur').id);
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        if (!memberToKick) {
            return interaction.reply({
                content: '❌ Utilisateur introuvable sur ce serveur.',
                ephemeral: true
            });
        }

        // Vérifier si l'utilisateur peut être expulsé
        if (memberToKick.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                content: '❌ Vous ne pouvez pas expulser cet utilisateur.',
                ephemeral: true
            });
        }

        if (!memberToKick.kickable) {
            return interaction.reply({
                content: '❌ Je ne peux pas expulser cet utilisateur.',
                ephemeral: true
            });
        }

        try {
            // Expulser l'utilisateur
            await memberToKick.kick(`${interaction.user.username}: ${reason}`);

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('👢 Utilisateur expulsé')
                .setDescription(`**${memberToKick.user.username}** a été expulsé du serveur.`)
                .addFields(
                    { name: 'Raison', value: reason, inline: false },
                    { name: 'Modérateur', value: interaction.user.username, inline: true }
                )
                .setThumbnail(memberToKick.user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log dans un canal de modération si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
            if (logChannel) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du kick:', error);
            interaction.reply({
                content: '❌ Une erreur s\'est produite lors de l\'expulsion.',
                ephemeral: true
            });
        }
    },

    category: 'Modération'
};