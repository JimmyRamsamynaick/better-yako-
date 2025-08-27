const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
        const { getTranslationSync, loadLanguages } = require('../../index');
        const t = async (key, ...args) => await getTranslationSync(interaction.guild.id, key, ...args);
        
        try {
            // Récupération de la configuration actuelle
            const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
            const currentLang = guildConfig?.language || 'fr';

            // Vérification des permissions
            const member = interaction.member;
            const isAdmin = await PermissionManager.isAdmin(member, guildConfig);
            
            if (!isAdmin) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('errors.no_permission'))
                    .setDescription(await t('admin.setlang.no_permission_desc'))
                    .setColor(0xFF0000)
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const newLang = interaction.options.getString('langue');

            // Vérification si la langue est déjà définie
            if (currentLang === newLang) {
                const embed = new EmbedBuilder()
                    .setTitle(await t('admin.setlang.already_set'))
                    .setDescription(await t('admin.setlang.already_set_desc', newLang))
                    .setColor(0xFFA500)
                    .setTimestamp();
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
                    const embed = new EmbedBuilder()
                        .setTitle(await t('errors.database_error'))
                        .setDescription(await t('admin.setlang.database_error_desc'))
                        .setColor(0xFF0000)
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Rechargement des langues pour s'assurer que la nouvelle langue est disponible
                await loadLanguages();

                // Utilisation de la nouvelle langue pour les messages de confirmation
                const { getTranslationSync } = require('../../index');
                const newT = async (key, ...args) => await getTranslationSync(interaction.guild.id, key, ...args);

                // Mapping des langues pour l'affichage
                const languageNames = {
                    'fr': '🇫🇷 Français',
                    'en': '🇺🇸 English',
                    'es': '🇪🇸 Español'
                };

                const oldLanguageName = languageNames[currentLang] || currentLang;
                const newLanguageName = languageNames[newLang] || newLang;

                // Message de confirmation dans la nouvelle langue
                const successEmbed = new EmbedBuilder()
                    .setTitle(await newT('admin.setlang.success'))
                    .setDescription(await newT('admin.setlang.success_desc', newLanguageName))
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .addFields(
                        { name: '🌐 ' + await newT('admin.setlang.previous_language'), value: oldLanguageName, inline: true },
                        { name: '🌐 ' + await newT('admin.setlang.new_language'), value: newLanguageName, inline: true },
                        { name: '👮 ' + await newT('admin.setlang.changed_by'), value: interaction.user.tag, inline: true },
                        { name: '🏠 ' + await newT('admin.setlang.server'), value: interaction.guild.name, inline: false },
                        { name: '📅 ' + await newT('admin.setlang.timestamp'), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                    );

                const embeds = [successEmbed];

                // Informations sur les fonctionnalités multilingues
                const infoEmbed = new EmbedBuilder()
                    .setTitle(`ℹ️ ${await newT('admin.setlang.info_title')}`)
                    .setDescription(await newT('admin.setlang.info_desc'))
                    .setColor(0x0099FF)
                    .setTimestamp();
                embeds.push(infoEmbed);

                // Exemples de commandes dans la nouvelle langue
                const examplesEmbed = new EmbedBuilder()
                    .setTitle(`📚 ${await newT('admin.setlang.examples_title')}`)
                    .setDescription(
                        `• \`/help\` - ${await newT('admin.setlang.help_example')}\n` +
                        `• \`/ban\` - ${await newT('admin.setlang.ban_example')}\n` +
                        `• \`/warn\` - ${await newT('admin.setlang.warn_example')}\n` +
                        `• \`/setlang\` - ${await newT('admin.setlang.setlang_example')}`
                    )
                    .setColor(0x0099FF)
                    .setTimestamp();
                embeds.push(examplesEmbed);

                await interaction.editReply({ embeds });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`🌐 ${await newT('admin.setlang.log_title')}`)
                            .setDescription(
                                `**${await newT('admin.setlang.server')}:** ${interaction.guild.name} (${interaction.guild.id})\n` +
                                `**${await newT('admin.setlang.changed_by')}:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**${await newT('admin.setlang.previous_language')}:** ${oldLanguageName}\n` +
                                `**${await newT('admin.setlang.new_language')}:** ${newLanguageName}\n` +
                                `**${await newT('admin.setlang.timestamp')}:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor(0x0099FF)
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                // Message d'annonce publique (optionnel)
                try {
                    const announcementEmbed = new EmbedBuilder()
                        .setTitle(`🌐 ${await newT('admin.setlang.announcement_title')}`)
                        .setDescription(await newT('admin.setlang.announcement_desc', newLanguageName, interaction.user.tag))
                        .setColor(0x0099FF)
                        .setTimestamp();

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
                const errorEmbed = new EmbedBuilder()
                    .setTitle(await t('errors.command_failed'))
                    .setDescription(await t('admin.setlang.error_desc', error.message))
                    .setColor(0xFF0000)
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande setlang:', error);
            
            // Utilisation de la langue par défaut en cas d'erreur
            const { getTranslationSync } = require('../../index');
            const defaultT = async (key, ...args) => await getTranslationSync(interaction.guild.id, key, ...args);
            const errorEmbed = new EmbedBuilder()
                .setTitle(await defaultT('errors.unexpected'))
                .setDescription(await defaultT('errors.try_again'))
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