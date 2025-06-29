const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Donne un avertissement à un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à avertir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'avertissement')
                .setRequired(true)),
    category: 'moderation',

    async execute(interaction, client, getTranslation) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_permissions'), ephemeral: true });
        }

        const userToWarn = interaction.options.getUser('utilisateur');
        const memberToWarn = interaction.guild.members.cache.get(userToWarn.id);

        if (!memberToWarn) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_user_not_found'), ephemeral: true });
        }

        if (memberToWarn.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ Vous ne pouvez pas avertir cet utilisateur.', ephemeral: true });
        }

        const reason = interaction.options.getString('raison');

        try {
            if (!client.warnings) client.warnings = new Map();

            const guildWarnings = client.warnings.get(interaction.guild.id) || new Map();
            const userWarnings = guildWarnings.get(memberToWarn.id) || [];

            const warning = {
                id: Date.now(),
                reason: reason,
                moderator: interaction.user.id,
                date: new Date(),
                guildId: interaction.guild.id
            };

            userWarnings.push(warning);
            guildWarnings.set(memberToWarn.id, userWarnings);
            client.warnings.set(interaction.guild.id, guildWarnings);

            const embed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Avertissement donné')
                .setDescription(getTranslation(interaction.guild.id, 'warn_success', memberToWarn.user.tag))
                .addFields(
                    { name: 'Utilisateur', value: memberToWarn.user.tag, inline: true },
                    { name: 'Modérateur', value: interaction.user.tag, inline: true },
                    { name: 'Total d\'avertissements', value: userWarnings.length.toString(), inline: true },
                    { name: 'Raison', value: reason, inline: false }
                )
                .setThumbnail(memberToWarn.user.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Message privé à l'utilisateur
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ffaa00')
                    .setTitle(`⚠️ Avertissement - ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Raison', value: reason, inline: false },
                        { name: 'Modérateur', value: interaction.user.tag, inline: true },
                        { name: 'Serveur', value: interaction.guild.name, inline: true }
                    )
                    .setTimestamp();

                await memberToWarn.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Impossible d'envoyer un MP à ${memberToWarn.user.tag}`);
            }

            // Log dans un canal de modération si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
            if (logChannel) {
                logChannel.send({ embeds: [embed] });
            }

            // Action automatique si 3 avertissements ou plus
            if (userWarnings.length >= 3) {
                const autoEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('🚨 Action automatique')
                    .setDescription(`${memberToWarn.user.tag} a atteint ${userWarnings.length} avertissements !`)
                    .addFields({ name: 'Suggestion', value: 'Considérez un kick ou un ban temporaire.', inline: false })
                    .setTimestamp();

                interaction.channel.send({ embeds: [autoEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors de l\'avertissement:', error);
            interaction.reply({ content: '❌ Une erreur s\'est produite lors de l\'avertissement.', ephemeral: true });
        }
    }
};