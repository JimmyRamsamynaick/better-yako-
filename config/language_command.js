javascript
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'language',
    description: 'Change la langue du bot pour ce serveur',
    category: 'config',
    permissions: ['MANAGE_GUILD'],
    options: [
        {
            name: 'langue',
            description: 'Code de la langue (fr, en, es)',
            type: 3, // STRING
            required: false,
            choices: [
                { name: '🇫🇷 Français', value: 'fr' },
                { name: '🇬🇧 English', value: 'en' },
                { name: '🇪🇸 Español', value: 'es' }
            ]
        }
    ],

    async execute(interaction, client, getTranslation) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: getTranslation(interaction.guild.id, 'error_permissions'), ephemeral: true });
        }

        const newLanguage = interaction.options.getString('langue');
        const availableLanguages = ['fr', 'en', 'es'];

        // Si aucune langue n'est fournie, afficher la langue actuelle
        if (!newLanguage) {
            const currentLang = client.guildLanguages.get(interaction.guild.id) || 'fr';

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🌍 Configuration de la langue')
                .setDescription(`**Langue actuelle:** ${this.getLanguageName(currentLang)}`)
                .addFields({
                    name: 'Langues disponibles',
                    value: '🇫🇷 `fr` - Français\n🇬🇧 `en` - English\n🇪🇸 `es` - Español',
                    inline: false
                })
                .addFields({
                    name: 'Utilisation',
                    value: '`/language langue:<code_langue>`',
                    inline: false
                })
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: client.user.displayAvatarURL()
                });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!availableLanguages.includes(newLanguage)) {
            return interaction.reply({ content: '❌ Langue non supportée. Utilisez `fr`, `en` ou `es`.', ephemeral: true });
        }

        client.guildLanguages.set(interaction.guild.id, newLanguage);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Langue modifiée')
            .setDescription(getTranslation(interaction.guild.id, 'language_changed'))
            .addFields({
                name: 'Nouvelle langue',
                value: `${this.getLanguageFlag(newLanguage)} ${this.getLanguageName(newLanguage)}`,
                inline: true
            })
            .addFields({
                name: 'Modifié par',
                value: interaction.user.tag,
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: 'Yako Bot',
                iconURL: client.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });

        // Log dans un canal de modération si configuré
        const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'mod-logs');
        if (logChannel) {
            logChannel.send({ embeds: [embed] });
        }
    },

    getLanguageName(code) {
        const names = {
            'fr': 'Français',
            'en': 'English',
            'es': 'Español'
        };
        return names[code] || code;
    },

    getLanguageFlag(code) {
        const flags = {
            'fr': '🇫🇷',
            'en': '🇬🇧',
            'es': '🇪🇸'
        };
        return flags[code] || '🏳️';
    }
};