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
                            { name: '📁 Channel (Salon)', value: 'channels' },
                            { name: '🎭 Role (Rôle)', value: 'roles' },
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
                .setName('setchannel')
                .setDescription('Configure un canal spécifique pour un type de log')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal pour ce type de log')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('types')
                        .setDescription('Types de logs pour ce canal (séparés par des virgules)')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('removechannel')
                .setDescription('Supprime un canal de log spécifique')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal à supprimer des logs')
                        .addChannelTypes(ChannelType.GuildText)
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
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.no_permission');
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            // Correction: Utiliser updateMany pour corriger les warnings avant de récupérer les données
            await Guild.updateMany(
                { guildId: interaction.guild.id, "users.warnings": { $type: "number" } },
                { $set: { "users.$[elem].warnings": [] } },
                { arrayFilters: [{ "elem.warnings": { $type: "number" } }] }
            );
            
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
                case 'setchannel':
                    await this.handleSetChannel(interaction, guild);
                    break;
                case 'removechannel':
                    await this.handleRemoveChannel(interaction, guild);
                    break;
                case 'status':
                    await this.handleStatus(interaction, guild);
                    break;
            }
        } catch (error) {
            console.error('Erreur setlogs:', error);
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.error');
            await interaction.reply({ ...errorResponse, ephemeral: true });
        }
    },

    async handleEnable(interaction, guild) {
        const channel = interaction.options.getChannel('channel');
        
        guild.logs.enabled = true;
        guild.logs.channelId = channel.id;
        
        // S'assurer que tous les utilisateurs ont des warnings comme tableau et non comme nombre
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
        }
        
        await guild.save();

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id, 
            'commands.setlogs.enabled_success',
            {
                channel: channel.toString(),
                voice: guild.logs.types.voice ? '✅' : '❌',
                message: guild.logs.types.message ? '✅' : '❌',
                channels: guild.logs.types.channels ? '✅' : '❌',
                roles: guild.logs.types.roles ? '✅' : '❌',
                server: guild.logs.types.server ? '✅' : '❌'
            },
            guild.language
        );
        
        await interaction.reply(successResponse);
    },

    async handleSetChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');
        const typesString = interaction.options.getString('types');
        
        // Valider les types fournis
        const validTypes = ['voice', 'message', 'channels', 'roles', 'server'];
        const requestedTypes = typesString.split(',').map(t => t.trim().toLowerCase());
        const invalidTypes = requestedTypes.filter(type => !validTypes.includes(type));
        
        if (invalidTypes.length > 0) {
            const errorResponse = ComponentsV3.errorEmbed(
                interaction.guild.id, 
                'commands.setlogs.invalid_types',
                { types: invalidTypes.join(', '), validTypes: validTypes.join(', ') }
            );
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        // Initialiser le tableau channels s'il n'existe pas
        if (!guild.logs.channels) {
            guild.logs.channels = [];
        }

        // Vérifier si le canal existe déjà
        const existingChannelIndex = guild.logs.channels.findIndex(ch => ch.channelId === channel.id);
        
        if (existingChannelIndex !== -1) {
            // Mettre à jour le canal existant
            const existingChannel = guild.logs.channels[existingChannelIndex];
            requestedTypes.forEach(type => {
                existingChannel.types[type] = true;
            });
        } else {
            // Créer un nouveau canal de log
            const newLogChannel = {
                channelId: channel.id,
                types: {
                    voice: false,
                    message: false,
                    channels: false,
                    roles: false,
                    server: false
                }
            };
            
            requestedTypes.forEach(type => {
                newLogChannel.types[type] = true;
            });
            
            guild.logs.channels.push(newLogChannel);
        }

        // S'assurer que tous les utilisateurs ont des warnings comme tableau
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
        }

        await guild.save();

        const typeNames = {
            voice: '🔊 Voice',
            message: '💬 Message',
            channels: '📁 Channels',
            roles: '🎭 Roles',
            server: '⚙️ Server'
        };

        const enabledTypes = requestedTypes.map(type => typeNames[type]).join(', ');

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id,
            'commands.setlogs.channel_configured',
            {
                channel: channel.toString(),
                types: enabledTypes
            }
        );

        await interaction.reply(successResponse);
    },

    async handleRemoveChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');

        if (!guild.logs.channels || guild.logs.channels.length === 0) {
            const errorResponse = ComponentsV3.errorEmbed(
                interaction.guild.id,
                'commands.setlogs.no_channels_configured'
            );
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        const channelIndex = guild.logs.channels.findIndex(ch => ch.channelId === channel.id);
        
        if (channelIndex === -1) {
            const errorResponse = ComponentsV3.errorEmbed(
                interaction.guild.id,
                'commands.setlogs.channel_not_found',
                { channel: channel.toString() }
            );
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        guild.logs.channels.splice(channelIndex, 1);

        // S'assurer que tous les utilisateurs ont des warnings comme tableau
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
        }

        await guild.save();

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id,
            'commands.setlogs.channel_removed',
            { channel: channel.toString() }
        );

        await interaction.reply(successResponse);
    },

    async handleDisable(interaction, guild) {
        guild.logs.enabled = false;
        guild.logs.channelId = null;
        
        // S'assurer que tous les utilisateurs ont des warnings comme tableau et non comme nombre
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
        }
        
        await guild.save();

        const successResponse = ComponentsV3.successEmbed(interaction.guild.id, 'commands.setlogs.disabled_success', {}, guild.language);
        await interaction.reply(successResponse);
    },

    async handleConfig(interaction, guild) {
        const type = interaction.options.getString('type');
        const enabled = interaction.options.getBoolean('enabled');

        // Correction du bug: s'assurer que le type est valide avant de l'assigner
        if (guild.logs.types.hasOwnProperty(type)) {
            guild.logs.types[type] = enabled;
            
            // S'assurer que tous les utilisateurs ont des warnings comme tableau et non comme nombre
            if (guild.users && guild.users.length > 0) {
                guild.users.forEach(user => {
                    if (typeof user.warnings === 'number') {
                        user.warnings = [];
                    }
                });
            }
            
            await guild.save();
        } else {
            throw new Error(`Type de log invalide: ${type}`);
        }

        const typeNames = {
            voice: '🔊 Voice (Vocal)',
            message: '💬 Message',
            channels: '📁 Channel (Salon)',
            roles: '🎭 Role (Rôle)',
            server: '⚙️ Server (Serveur)'
        };

        const successResponse = ComponentsV3.successEmbed(
            interaction.guild.id, 
            'commands.setlogs.config_success',
            {
                type: typeNames[type],
                status: enabled ? '✅' : '❌'
            },
            guild.language
        );
        
        await interaction.reply(successResponse);
    },

    async handleStatus(interaction, guild) {
        const { EmbedBuilder } = require('discord.js');
        const LanguageManager = require('../../utils/languageManager');
        
        // S'assurer que tous les utilisateurs ont des warnings comme tableau et non comme nombre
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
            await guild.save();
        }
        
        const embed = new EmbedBuilder()
            .setTitle(LanguageManager.get(guild.language || 'fr', 'commands.setlogs.status_title'))
            .setColor(guild.logs.enabled ? 0x00ff00 : 0xff0000)
            .setTimestamp();

        let description = `**État général:** ${guild.logs.enabled ? '✅ Activé' : '❌ Désactivé'}\n\n`;

        // Canal principal (legacy)
        if (guild.logs.channelId) {
            description += `**Canal principal:** <#${guild.logs.channelId}>\n\n`;
        }

        // Types de logs globaux
        description += `**Types de logs globaux:**\n`;
        description += `🔊 Voice: ${guild.logs.types.voice ? '✅' : '❌'}\n`;
        description += `💬 Message: ${guild.logs.types.message ? '✅' : '❌'}\n`;
        description += `📁 Channels: ${guild.logs.types.channels ? '✅' : '❌'}\n`;
        description += `🎭 Roles: ${guild.logs.types.roles ? '✅' : '❌'}\n`;
        description += `⚙️ Server: ${guild.logs.types.server ? '✅' : '❌'}\n\n`;

        // Canaux spécifiques
        if (guild.logs.channels && guild.logs.channels.length > 0) {
            description += `**Canaux spécifiques configurés:**\n`;
            guild.logs.channels.forEach((logChannel, index) => {
                const channel = interaction.guild.channels.cache.get(logChannel.channelId);
                const channelName = channel ? `<#${logChannel.channelId}>` : `Canal supprimé (${logChannel.channelId})`;
                
                description += `\n**${index + 1}.** ${channelName}\n`;
                description += `   🔊 Voice: ${logChannel.types.voice ? '✅' : '❌'} `;
                description += `💬 Message: ${logChannel.types.message ? '✅' : '❌'} `;
                description += `📁 Channels: ${logChannel.types.channels ? '✅' : '❌'}\n`;
                description += `   🎭 Roles: ${logChannel.types.roles ? '✅' : '❌'} `;
                description += `⚙️ Server: ${logChannel.types.server ? '✅' : '❌'}\n`;
            });
        } else {
            description += `**Canaux spécifiques:** Aucun configuré\n`;
        }

        description += `\n**Commandes utiles:**\n`;
        description += `• \`/setlogs setchannel\` - Configurer un canal spécifique\n`;
        description += `• \`/setlogs config\` - Modifier les types de logs globaux\n`;
        description += `• \`/setlogs removechannel\` - Supprimer un canal spécifique`;

        embed.setDescription(description);
            
        if (interaction.guild.iconURL()) {
            embed.setFooter({ 
                text: `Serveur: ${interaction.guild.name}`, 
                iconURL: interaction.guild.iconURL() 
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};