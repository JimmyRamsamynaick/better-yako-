const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Configure the welcome system (enable/disable)')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable the welcome message')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the welcome message')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            // Restriction stricte: administrateurs uniquement
            if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
                const lang = 'fr';
                return interaction.reply({ content: LanguageManager.get(lang, 'commands.setwelcome.no_permission') || LanguageManager.get(lang, 'errors.no_permission') || '❌ Vous n\'avez pas la permission d\'utiliser cette commande.' });
            }

            // Déférer pour éviter les timeouts (réponse publique)
            try { await interaction.deferReply(); } catch (_) {}

            const guildId = interaction.guildId;
            const enabled = interaction.options.getBoolean('enabled', true);
            const channel = interaction.options.getChannel('channel');

            // Assainir les données anciennes: warnings stockés comme nombre au lieu de tableau
            try {
                await Guild.updateMany(
                    { guildId, "users.warnings": { $type: "number" } },
                    { $set: { "users.$[elem].warnings": [] } },
                    { arrayFilters: [{ "elem.warnings": { $type: "number" } }] }
                );
            } catch (_) {}

            let guild = await Guild.findOne({ guildId });
            if (!guild) {
                guild = new Guild({ guildId });
            }

            // Double assainissement in-memory au cas où
            if (guild.users && guild.users.length > 0) {
                guild.users.forEach(u => {
                    if (typeof u.warnings === 'number') {
                        u.warnings = [];
                    } else if (Array.isArray(u.warnings)) {
                        u.warnings = u.warnings.filter(w => w && typeof w === 'object');
                    } else if (!u.warnings) {
                        u.warnings = [];
                    }
                });
            }

            // Assurer l’objet welcome
            if (!guild.welcome) guild.welcome = { enabled: true };
            guild.welcome.enabled = !!enabled;
            if (channel) {
                guild.welcome.channelId = channel.id;
            }
            await guild.save();

            const lang = (guild && guild.language) ? guild.language : 'fr';
            const msgKey = enabled ? 'commands.setwelcome.enabled_success' : 'commands.setwelcome.disabled_success';
            const parts = [];
            parts.push(LanguageManager.get(lang, msgKey) || (enabled ? '✅ Welcome system enabled.' : '❌ Welcome system disabled.'));
            if (channel) {
                parts.push(LanguageManager.get(lang, 'commands.setwelcome.channel_set_success', { channel: channel.toString() }) || `✅ Welcome channel set to ${channel.toString()}.`);
            }

            await interaction.editReply({ content: parts.join('\n') });
        } catch (error) {
            console.error('Erreur setwelcome:', error);
            const lang = 'fr';
            if (interaction.deferred || interaction.replied) {
                try { await interaction.editReply({ content: LanguageManager.get(lang, 'commands.setwelcome.error') || '❌ Une erreur est survenue.' }); } catch (_) {}
            } else {
                try { await interaction.reply({ content: LanguageManager.get(lang, 'commands.setwelcome.error') || '❌ Une erreur est survenue.' }); } catch (_) {}
            }
        }
    }
};