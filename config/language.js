const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('Change la langue du bot pour ce serveur / Change bot language for this server')
        .addStringOption(option =>
            option.setName('langue')
                .setDescription('Choisir la langue / Choose language')
                .setRequired(false)
                .addChoices(
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇬🇧 English', value: 'en' },
                    { name: '🇪🇸 Español', value: 'es' }
                )
        ),

    async execute(interaction, client, getTranslation) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({
                content: getTranslation(interaction.guild.id, 'error_permissions'),
                ephemeral: true
            });
        }

        const newLanguage = interaction.options.getString('langue');
        const availableLanguages = ['fr', 'en', 'es'];

        // Si aucune langue n'est fournie, afficher la langue actuelle
        if (!newLanguage) {
            const currentLang = this.getCurrentLanguage(interaction.guild.id);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🌍 Configuration de la langue / Language Configuration')
                .setDescription(`**Langue actuelle / Current language:** ${this.getLanguageName(currentLang)} ${this.getLanguageFlag(currentLang)}`)
                .addFields({
                    name: 'Langues disponibles / Available languages',
                    value: '🇫🇷 `fr` - Français\n🇬🇧 `en` - English\n🇪🇸 `es` - Español',
                    inline: false
                })
                .addFields({
                    name: 'Utilisation / Usage',
                    value: '`/language langue:<code_langue>`',
                    inline: false
                })
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Vérifier si la langue est supportée
        if (!availableLanguages.includes(newLanguage)) {
            return interaction.reply({
                content: '❌ Langue non supportée. Utilisez `fr`, `en` ou `es` / Unsupported language. Use `fr`, `en` or `es`.',
                ephemeral: true
            });
        }

        // Sauvegarder la nouvelle langue
        this.saveLanguage(interaction.guild.id, newLanguage);

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Langue modifiée / Language Changed')
            .setDescription(getTranslation(interaction.guild.id, 'language_changed'))
            .addFields({
                name: 'Nouvelle langue / New language',
                value: `${this.getLanguageFlag(newLanguage)} ${this.getLanguageName(newLanguage)}`,
                inline: true
            })
            .addFields({
                name: 'Modifié par / Changed by',
                value: `<@${interaction.user.id}>`,
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: 'Yako Bot',
                iconURL: client.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });

        // Log dans un canal de modération si configuré
        const logChannels = ['mod-logs', 'logs', 'moderation', 'admin-logs'];
        const logChannel = interaction.guild.channels.cache.find(ch =>
            logChannels.includes(ch.name.toLowerCase()) && ch.isTextBased()
        );

        if (logChannel && logChannel.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages)) {
            const logEmbed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('🌍 Changement de langue / Language Change')
                .setDescription(`La langue du serveur a été changée / Server language has been changed`)
                .addFields({
                    name: 'Serveur / Server',
                    value: interaction.guild.name,
                    inline: true
                })
                .addFields({
                    name: 'Nouvelle langue / New language',
                    value: `${this.getLanguageFlag(newLanguage)} ${this.getLanguageName(newLanguage)}`,
                    inline: true
                })
                .addFields({
                    name: 'Modérateur / Moderator',
                    value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
                    inline: true
                })
                .setTimestamp()
                .setFooter({
                    text: 'Yako Bot - Language Log',
                    iconURL: client.user.displayAvatarURL()
                });

            try {
                await logChannel.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Erreur lors de l\'envoi du log de changement de langue:', error);
            }
        }
    },

    // Fonction pour obtenir la langue actuelle du serveur
    getCurrentLanguage(guildId) {
        const guildLangPath = path.join(__dirname, '..', 'data', 'guildLang.json');

        if (fs.existsSync(guildLangPath)) {
            try {
                const guildLangData = JSON.parse(fs.readFileSync(guildLangPath, 'utf8'));
                return guildLangData[guildId] || 'fr';
            } catch (error) {
                console.error('Erreur lors de la lecture du fichier de langues:', error);
                return 'fr';
            }
        }

        return 'fr'; // Langue par défaut
    },

    // Fonction pour sauvegarder la langue
    saveLanguage(guildId, language) {
        const dataPath = path.join(__dirname, '..', 'data');
        const guildLangPath = path.join(dataPath, 'guildLang.json');

        // Créer le dossier data s'il n'existe pas
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }

        let guildLangData = {};

        // Charger les données existantes
        if (fs.existsSync(guildLangPath)) {
            try {
                guildLangData = JSON.parse(fs.readFileSync(guildLangPath, 'utf8'));
            } catch (error) {
                console.error('Erreur lors de la lecture du fichier de langues:', error);
                guildLangData = {};
            }
        }

        // Mettre à jour la langue du serveur
        guildLangData[guildId] = language;

        // Sauvegarder
        try {
            fs.writeFileSync(guildLangPath, JSON.stringify(guildLangData, null, 2));
            console.log(`✅ Langue sauvegardée pour le serveur ${guildId}: ${language}`);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la langue:', error);
        }
    },

    // Fonction pour obtenir le nom de la langue
    getLanguageName(code) {
        const names = {
            'fr': 'Français',
            'en': 'English',
            'es': 'Español'
        };
        return names[code] || code;
    },

    // Fonction pour obtenir le drapeau de la langue
    getLanguageFlag(code) {
        const flags = {
            'fr': '🇫🇷',
            'en': '🇬🇧',
            'es': '🇪🇸'
        };
        return flags[code] || '🏳️';
    }
};