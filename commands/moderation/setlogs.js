// commands/moderation/setlogs.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription(LanguageManager.get('fr', 'commands.setlogs.description') || 'Configure les logs du serveur')
        .setDescriptionLocalizations({
            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.description') || 'Configure server logs'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.enable_description') || 'Active les logs dans un salon')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.enable_description') || 'Enable logs in a channel'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.channel_option') || 'Salon pour les logs')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.channel_option') || 'Channel for logs'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.disable_description') || 'Désactive les logs')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.disable_description') || 'Disable logs'
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.config_description') || 'Configure les types de logs')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.config_description') || 'Configure log types'
                })
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.type_option') || 'Type de log à configurer')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.type_option') || 'Log type to configure'
                        })
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
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.enabled_option') || 'Activer ou désactiver ce type de log')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.enabled_option') || 'Enable or disable this log type'
                        })
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.setchannel_description') || 'Configure un canal spécifique pour un type de log')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.setchannel_description') || 'Configure a specific channel for a log type'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.setchannel_channel_option') || 'Canal pour ce type de log')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.setchannel_channel_option') || 'Channel for this log type'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('types')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.types_option') || 'Types de logs pour ce canal (séparés par des virgules)')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.types_option') || 'Log types for this channel (comma separated)'
                        })
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('removechannel')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.removechannel_description') || 'Supprime un canal de log spécifique')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.removechannel_description') || 'Remove a specific log channel'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.removechannel_channel_option') || 'Canal à supprimer des logs')
                        .setDescriptionLocalizations({
                            'EnglishUS': LanguageManager.get('en', 'commands.setlogs.removechannel_channel_option') || 'Channel to remove from logs'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.status_description') || 'Affiche la configuration actuelle des logs')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.setlogs.status_description') || 'Show current logs configuration'
                })
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const lang = (await Guild.findOne({ guildId: interaction.guild.id }))?.language || 'fr';
            return interaction.reply({
                content: LanguageManager.get(lang, 'commands.setlogs.no_permission'),
                ephemeral: true
            });
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
            const lang = guild?.language || 'fr';
            await interaction.reply({
                content: LanguageManager.get(lang, 'commands.setlogs.error'),
                ephemeral: true
            });
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

        await interaction.reply({
            content: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.enabled_success', {
                channel: channel.toString(),
                voice: guild.logs.types.voice ? '✅' : '❌',
                message: guild.logs.types.message ? '✅' : '❌',
                channels: guild.logs.types.channels ? '✅' : '❌',
                roles: guild.logs.types.roles ? '✅' : '❌',
                server: guild.logs.types.server ? '✅' : '❌'
            }),
            ephemeral: true
        });
    },

    async handleSetChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');
        const typesString = interaction.options.getString('types');
        
        const lang = guild.language || 'en';
        
        // Valider les types fournis
        const validTypes = ['voice', 'message', 'channels', 'roles', 'server'];
        const requestedTypes = typesString.split(',').map(t => t.trim().toLowerCase());
        const invalidTypes = requestedTypes.filter(type => !validTypes.includes(type));
        
        if (invalidTypes.length > 0) {
            const typeNames = {
                voice: LanguageManager.get(lang, 'commands.setlogs.types.voice'),
                message: LanguageManager.get(lang, 'commands.setlogs.types.message'),
                channels: LanguageManager.get(lang, 'commands.setlogs.types.channels'),
                roles: LanguageManager.get(lang, 'commands.setlogs.types.roles'),
                server: LanguageManager.get(lang, 'commands.setlogs.types.server')
            };
            
            const validTypesTranslated = validTypes.map(type => typeNames[type]).join(', ');
            
            return interaction.reply({
                content: LanguageManager.get(lang, 'commands.setlogs.invalid_types', {
                    types: invalidTypes.join(', '),
                    validTypes: validTypesTranslated
                }),
                ephemeral: true
            });
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
            voice: LanguageManager.get(lang, 'commands.setlogs.types.voice'),
            message: LanguageManager.get(lang, 'commands.setlogs.types.message'),
            channels: LanguageManager.get(lang, 'commands.setlogs.types.channels'),
            roles: LanguageManager.get(lang, 'commands.setlogs.types.roles'),
            server: LanguageManager.get(lang, 'commands.setlogs.types.server')
        };

        const enabledTypes = requestedTypes.map(type => typeNames[type]).join(', ');

        await interaction.reply({
            content: LanguageManager.get(lang, 'commands.setlogs.channel_configured', {
                channel: channel.toString(),
                types: enabledTypes
            }),
            ephemeral: true
        });
    },

    async handleRemoveChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');

        if (!guild.logs.channels || guild.logs.channels.length === 0) {
            const lang = guild.language || 'fr';
            return interaction.reply({
                content: LanguageManager.get(lang, 'commands.setlogs.no_channels_configured'),
                ephemeral: true
            });
        }

        const channelIndex = guild.logs.channels.findIndex(ch => ch.channelId === channel.id);
        
        if (channelIndex === -1) {
            const lang = guild.language || 'fr';
            return interaction.reply({
                content: LanguageManager.get(lang, 'commands.setlogs.channel_not_found', { channel: channel.toString() }),
                ephemeral: true
            });
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

        const lang = guild.language || 'fr';
        await interaction.reply({
            content: LanguageManager.get(lang, 'commands.setlogs.channel_removed', { channel: channel.toString() }),
            ephemeral: true
        });
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

        await interaction.reply({
            content: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.disabled_success'),
            ephemeral: true
        });
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
            voice: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.types.voice'),
            message: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.types.message'),
            channels: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.types.channels'),
            roles: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.types.roles'),
            server: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.types.server')
        };

        await interaction.reply({
            content: LanguageManager.get(guild.language || 'fr', 'commands.setlogs.config_success', {
                type: typeNames[type],
                status: enabled ? '✅' : '❌'
            }),
            ephemeral: true
        });
    },

    async handleStatus(interaction, guild) {
        const lang = guild.language || 'fr';
        
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
            .setTitle(LanguageManager.get(lang, 'commands.setlogs.status_title'))
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

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};