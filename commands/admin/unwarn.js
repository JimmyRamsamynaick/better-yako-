const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Retirer un avertissement d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur dont retirer l\'avertissement')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('id_avertissement')
                .setDescription('ID de l\'avertissement à retirer (optionnel, retire le plus récent si non spécifié)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du retrait de l\'avertissement')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const { getTranslation } = require('../../index');
        const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
        const lang = guildConfig?.language || 'fr';
        const t = (key, ...args) => getTranslation(lang, key, ...args);

        try {
            // Vérification des permissions
            const member = interaction.member;
            const isModerator = await PermissionManager.isModerator(member, guildConfig);
            
            if (!isModerator) {
                const embed = new EmbedBuilder()
                    .setTitle(t('errors.no_permission'))
                    .setDescription(t('admin.unwarn.no_permission_desc'))
                    .setColor(0xFF0000)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('utilisateur');
            const warningId = interaction.options.getString('id_avertissement');
            const reason = interaction.options.getString('raison') || t('admin.unwarn.default_reason');

            await interaction.deferReply();

            try {
                // Récupération des avertissements de l'utilisateur
                const userWarnings = await DatabaseManager.getUserWarnings(targetUser.id, interaction.guild.id);
                
                if (userWarnings.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('admin.unwarn.no_warnings'))
                        .setDescription(t('admin.unwarn.no_warnings_desc', targetUser.tag))
                        .setColor(0xFFA500)
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                let warningToRemove;
                
                if (warningId) {
                    // Recherche de l'avertissement spécifique
                    warningToRemove = userWarnings.find(w => w._id.toString() === warningId);
                    
                    if (!warningToRemove) {
                        const embed = new EmbedBuilder()
                            .setTitle(t('admin.unwarn.warning_not_found'))
                            .setDescription(t('admin.unwarn.warning_not_found_desc', warningId))
                            .setColor(0xFF0000)
                            .setTimestamp();
                        return await interaction.editReply({ embeds: [embed] });
                    }
                } else {
                    // Prendre le plus récent avertissement
                    warningToRemove = userWarnings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                }

                // Suppression de l'avertissement
                const removed = await DatabaseManager.removeWarning(warningToRemove._id);
                
                if (!removed) {
                    const embed = new EmbedBuilder()
                        .setTitle(t('errors.database_error'))
                        .setDescription(t('admin.unwarn.database_error_desc'))
                        .setColor(0xFF0000)
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Récupération du nouveau nombre d'avertissements
                const remainingWarnings = await DatabaseManager.getUserWarnings(targetUser.id, interaction.guild.id);
                const remainingCount = remainingWarnings.length;

                // Tentative d'envoi d'un message privé à l'utilisateur
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle(t('admin.unwarn.dm_title'))
                        .setDescription(t('admin.unwarn.dm_description', interaction.guild.name, reason, remainingCount))
                        .setColor(0x00FF00)
                        .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // Impossible d'envoyer le MP, on continue
                }

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle(t('admin.unwarn.success'))
                    .setDescription(t('admin.unwarn.success_desc', targetUser.tag))
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .addFields(
                        { name: '👤 ' + t('admin.unwarn.user'), value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: '👮 ' + t('admin.unwarn.moderator'), value: interaction.user.tag, inline: true },
                        { name: '📝 ' + t('admin.unwarn.reason'), value: reason, inline: false },
                        { name: '🗑️ ' + t('admin.unwarn.removed_warning'), value: warningToRemove.reason, inline: false },
                        { name: '📅 ' + t('admin.unwarn.warning_date'), value: `<t:${Math.floor(new Date(warningToRemove.createdAt).getTime() / 1000)}:F>`, inline: true },
                        { name: '⚠️ ' + t('admin.unwarn.remaining_warnings'), value: remainingCount.toString(), inline: true }
                    );

                const embeds = [successEmbed];

                // Affichage des avertissements restants si il y en a
                if (remainingCount > 0) {
                    const warningsList = remainingWarnings
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                        .slice(0, 5) // Limiter à 5 pour éviter un message trop long
                        .map((w, index) => {
                            const date = new Date(w.createdAt);
                            return `${index + 1}. **${w.reason}** - <t:${Math.floor(date.getTime() / 1000)}:R> (ID: ${w._id})`;
                        })
                        .join('\n');

                    const remainingEmbed = new EmbedBuilder()
                        .setTitle(`📋 ${t('admin.unwarn.remaining_warnings_title')}`)
                        .setDescription(warningsList + (remainingCount > 5 ? `\n\n*${t('admin.unwarn.and_more', remainingCount - 5)}*` : ''))
                        .setColor(0x0099FF)
                        .setTimestamp();
                    
                    embeds.push(remainingEmbed);
                } else {
                    const cleanSlateEmbed = new EmbedBuilder()
                        .setTitle(`✨ ${t('admin.unwarn.clean_slate')}`)
                        .setDescription(t('admin.unwarn.clean_slate_desc', targetUser.tag))
                        .setColor(0x00FF00)
                        .setTimestamp();
                    embeds.push(cleanSlateEmbed);
                }

                await interaction.editReply({ embeds });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🗑️ ${t('admin.unwarn.log_title')}`)
                            .setDescription(
                                `**${t('admin.unwarn.user')}:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**${t('admin.unwarn.moderator')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${t('admin.unwarn.reason')}:** ${reason}\n` +
                                `**${t('admin.unwarn.removed_warning')}:** ${warningToRemove.reason}\n` +
                                `**${t('admin.unwarn.warning_id')}:** ${warningToRemove._id}\n` +
                                `**${t('admin.unwarn.remaining_warnings')}:** ${remainingCount}\n` +
                                `**${t('admin.unwarn.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor(0x0099FF)
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du retrait de l\'avertissement:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle(t('errors.command_failed'))
                    .setDescription(t('admin.unwarn.error_desc', error.message))
                    .setColor(0xFF0000)
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unwarn:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(t('errors.unexpected'))
                .setDescription(t('errors.try_again'))
                .setColor(0xFF0000)
                .setTimestamp();
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};