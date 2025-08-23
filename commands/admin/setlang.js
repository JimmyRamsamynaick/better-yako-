const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ModernComponents } = require('../../utils/modernComponents');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription('Changer la langue du serveur')
        .addStringOption(option =>
            option.setName('langue')
                .setDescription('Langue à définir pour le serveur')
                .setRequired(true)
                .addChoices(
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇺🇸 English', value: 'en' },
                    { name: '🇪🇸 Español', value: 'es' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const { getTranslation, loadLanguages } = require('../../index');
        
        try {
            // Récupération de la configuration actuelle
            const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
            const currentLang = guildConfig?.language || 'fr';
            const t = (key, ...args) => getTranslation(currentLang, key, ...args);

            // Vérification des permissions
            const member = interaction.member;
            const isAdmin = await PermissionManager.isAdmin(member, guildConfig);
            
            if (!isAdmin) {
                const embed = ModernComponents.createErrorMessage({
                    title: t('errors.no_permission'),
                    description: t('admin.setlang.no_permission_desc')
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const newLang = interaction.options.getString('langue');

            // Vérification si la langue est déjà définie
            if (currentLang === newLang) {
                const embed = ModernComponents.createWarningMessage({
                    title: t('admin.setlang.already_set'),
                    description: t('admin.setlang.already_set_desc', newLang)
                });
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Defer la réponse seulement si on arrive ici
            await interaction.deferReply();

            try {
                // Mise à jour de la configuration du serveur
                const updatedConfig = await DatabaseManager.updateGuildConfig(interaction.guild.id, {
                    language: newLang
                });

                if (!updatedConfig) {
                    const embed = ModernComponents.createErrorMessage({
                        title: t('errors.database_error'),
                        description: t('admin.setlang.database_error_desc')
                    });
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Rechargement des langues pour s'assurer que la nouvelle langue est disponible
                await loadLanguages();

                // Utilisation de la nouvelle langue pour les messages de confirmation
                const newT = (key, ...args) => getTranslation(newLang, key, ...args);

                // Mapping des langues pour l'affichage
                const languageNames = {
                    'fr': '🇫🇷 Français',
                    'en': '🇺🇸 English',
                    'es': '🇪🇸 Español'
                };

                const oldLanguageName = languageNames[currentLang] || currentLang;
                const newLanguageName = languageNames[newLang] || newLang;

                // Message de confirmation dans la nouvelle langue
                const successEmbed = ModernComponents.createSuccessMessage(
                    newT('admin.setlang.success'),
                    newT('admin.setlang.success_desc', newLanguageName)
                );

                const container = ModernComponents.createContainer()
                    .addComponent(successEmbed)
                    .addComponent(ModernComponents.createSeparator())
                    .addComponent(ModernComponents.createTextDisplay(
                        `**${newT('admin.setlang.details')}**\n` +
                        `🌐 **${newT('admin.setlang.previous_language')}:** ${oldLanguageName}\n` +
                        `🌐 **${newT('admin.setlang.new_language')}:** ${newLanguageName}\n` +
                        `👮 **${newT('admin.setlang.changed_by')}:** ${interaction.user.tag}\n` +
                        `🏠 **${newT('admin.setlang.server')}:** ${interaction.guild.name}\n` +
                        `📅 **${newT('admin.setlang.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ));

                // Informations sur les fonctionnalités multilingues
                const infoEmbed = ModernComponents.createInfoMessage(
                    `ℹ️ ${newT('admin.setlang.info_title')}`,
                    newT('admin.setlang.info_desc')
                );
                container.addComponent(infoEmbed);

                // Exemples de commandes dans la nouvelle langue
                const examplesEmbed = ModernComponents.createInfoMessage(
                    `📚 ${newT('admin.setlang.examples_title')}`,
                    `• \`/help\` - ${newT('admin.setlang.help_example')}\n` +
                    `• \`/ban\` - ${newT('admin.setlang.ban_example')}\n` +
                    `• \`/warn\` - ${newT('admin.setlang.warn_example')}\n` +
                    `• \`/setlang\` - ${newT('admin.setlang.setlang_example')}`
                );
                container.addComponent(examplesEmbed);

                await interaction.editReply(container.toMessage());

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = ModernComponents.createInfoMessage(
                            `🌐 ${newT('admin.setlang.log_title')}`,
                            `**${newT('admin.setlang.server')}:** ${interaction.guild.name} (${interaction.guild.id})\n` +
                            `**${newT('admin.setlang.changed_by')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                            `**${newT('admin.setlang.previous_language')}:** ${oldLanguageName}\n` +
                            `**${newT('admin.setlang.new_language')}:** ${newLanguageName}\n` +
                            `**${newT('admin.setlang.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        );
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Message d'annonce publique (optionnel)
                try {
                    const announcementEmbed = ModernComponents.createInfoMessage(
                        `🌐 ${newT('admin.setlang.announcement_title')}`,
                        newT('admin.setlang.announcement_desc', newLanguageName, interaction.user.tag)
                    );

                    // Envoyer l'annonce dans le canal système ou le canal général
                    let announcementChannel = interaction.guild.systemChannel;
                    if (!announcementChannel) {
                        // Chercher un canal général
                        announcementChannel = interaction.guild.channels.cache.find(channel => 
                            channel.isTextBased() && 
                            (channel.name.includes('general') || channel.name.includes('général') || 
                             channel.name.includes('main') || channel.name.includes('principal'))
                        );
                    }
                    
                    if (announcementChannel && announcementChannel.id !== interaction.channel.id) {
                        await announcementChannel.send({ embeds: [announcementEmbed] });
                    }
                } catch (error) {
                    // Erreur lors de l'envoi de l'annonce, on continue sans bloquer
                    console.log('Impossible d\'envoyer l\'annonce de changement de langue:', error.message);
                }

            } catch (error) {
                console.error('Erreur lors du changement de langue:', error);
                const errorEmbed = ModernComponents.createErrorMessage({
                    title: t('errors.command_failed'),
                    description: t('admin.setlang.error_desc', error.message)
                });
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande setlang:', error);
            
            // Utilisation de la langue par défaut en cas d'erreur
            const { ModernComponents: MC } = require('../../utils/modernComponents');
            const t = (key, ...args) => getTranslation('fr', key, ...args);
            const errorEmbed = MC.createErrorMessage({
                title: t('errors.unexpected'),
                description: t('errors.try_again')
            });
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};