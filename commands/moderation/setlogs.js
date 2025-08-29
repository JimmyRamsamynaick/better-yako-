// commands/moderation/setlogs.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Configure les logs du serveur')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Active les logs dans un salon')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Salon pour les logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Désactive les logs')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure les types de logs')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type de log à configurer')
                        .addChoices(
                            { name: '🔊 Voice (Vocal)', value: 'voice' },
                            { name: '💬 Message', value: 'message' },
                            { name: '📁 Channel (Salon)', value: 'channel' },
                            { name: '🎭 Role (Rôle)', value: 'role' },
                            { name: '⚙️ Server (Serveur)', value: 'server' }
                        )
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Activer ou désactiver ce type de log')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Affiche la configuration actuelle des logs')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'setlogs.no_permission');
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            let guild = await Guild.findOne({ guildId: interaction.guild.id });
            if (!guild) {
                guild = new Guild({ guildId: interaction.guild.id });
                await guild.save();
            }

            switch (subcommand) {
                case 'enable':
                    await this.handleEnable(interaction, guild);
                    break;
                case 'disable':
                    await this.handleDisable(interaction, guild);
                    break;
                case 'config':
                    await this.handleConfig(interaction, guild);
                    break;
                case 'status':
                    await this.handleStatus(interaction, guild);
                    break;
            }
        } catch (error) {
            console.error('Erreur setlogs:', error);
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'setlogs.error');
            await interaction.reply({ ...errorResponse, ephemeral: true });
        }
    },

    async handleEnable(interaction, guild) {
        const channel = interaction.options.getChannel('channel');
        
        guild.logs.enabled = true;
        guild.logs.channelId = channel.id;
        await guild.save();

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id, 
            'setlogs.enabled_success',
            {
                channel: channel.toString(),
                voice: guild.logs.types.voice ? '✅' : '❌',
                message: guild.logs.types.message ? '✅' : '❌',
                channels: guild.logs.types.channels ? '✅' : '❌',
                roles: guild.logs.types.roles ? '✅' : '❌',
                server: guild.logs.types.server ? '✅' : '❌'
            }
        );
        
        await interaction.reply(successResponse);
    },

    async handleDisable(interaction, guild) {
        guild.logs.enabled = false;
        guild.logs.channelId = null;
        await guild.save();

        const successResponse = ComponentsV3.successEmbed(interaction.guild.id, 'setlogs.disabled_success');
        await interaction.reply(successResponse);
    },

    async handleConfig(interaction, guild) {
        const type = interaction.options.getString('type');
        const enabled = interaction.options.getBoolean('enabled');

        guild.logs.types[type] = enabled;
        await guild.save();

        const typeNames = {
            voice: '🔊 Voice (Vocal)',
            message: '💬 Message',
            channel: '📁 Channel (Salon)',
            role: '🎭 Role (Rôle)',
            server: '⚙️ Server (Serveur)'
        };

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id, 
            'setlogs.config_success',
            {
                type: typeNames[type],
                status: enabled ? '✅' : '❌'
            }
        );
        
        await interaction.reply(successResponse);
    },

    async handleStatus(interaction, guild) {
        const { EmbedBuilder } = require('discord.js');
        const LanguageManager = require('../../utils/languageManager');
        
        const title = LanguageManager.get('fr', 'setlogs.status_title');
        const description = LanguageManager.get('fr', 'setlogs.status_description', {
            status: guild.logs.enabled ? '✅' : '❌',
            channel: guild.logs.channelId ? `<#${guild.logs.channelId}>` : 'N/A',
            voice: guild.logs.types.voice ? '✅' : '❌',
            message: guild.logs.types.message ? '✅' : '❌',
            channels: guild.logs.types.channels ? '✅' : '❌',
            roles: guild.logs.types.roles ? '✅' : '❌',
            server: guild.logs.types.server ? '✅' : '❌',
            guild_name: interaction.guild.name
        });
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(guild.logs.enabled ? 0x00ff00 : 0xff0000)
            .setTimestamp();
            
        if (interaction.guild.iconURL()) {
            embed.setFooter({ 
                text: `Serveur: ${interaction.guild.name}`, 
                iconURL: interaction.guild.iconURL() 
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};