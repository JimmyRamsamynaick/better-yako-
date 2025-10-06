// commands/moderation/setlogs.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription(LanguageManager.get('fr', 'commands.setlogs.description') || 'Configure les logs du serveur')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.setlogs.description') || 'Configure server logs'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.disable_description') || 'Désactive les logs')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.setlogs.disable_description') || 'Disable logs'
                })
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.config_description') || 'Configure les types de logs')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.setlogs.config_description') || 'Configure log types'
                })
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.type_option') || 'Type de log à configurer')
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.setlogs.type_option') || 'Log type to configure'
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
                            'en-US': LanguageManager.get('en', 'commands.setlogs.enabled_option') || 'Enable or disable this log type'
                        })
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.setchannel_description') || 'Configure un canal spécifique pour un type de log')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.setlogs.setchannel_description') || 'Configure a specific channel for a log type'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.setchannel_channel_option') || 'Canal pour ce type de log')
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.setlogs.setchannel_channel_option') || 'Channel for this log type'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('types')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.types_option') || 'Types de logs pour ce canal (séparés par des virgules)')
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.setlogs.types_option') || 'Log types for this channel (comma separated)'
                        })
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('removechannel')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.removechannel_description') || 'Supprime un canal de log spécifique')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.setlogs.removechannel_description') || 'Remove a specific log channel'
                })
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription(LanguageManager.get('fr', 'commands.setlogs.removechannel_channel_option') || 'Canal à supprimer des logs')
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.setlogs.removechannel_channel_option') || 'Channel to remove from logs'
                        })
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription(LanguageManager.get('fr', 'commands.setlogs.status_description') || 'Affiche la configuration actuelle des logs')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.setlogs.status_description') || 'Show current logs configuration'
                })
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            const noPermEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.no_permission');
            return interaction.reply(noPermEmbed);
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            // Déférer la réponse pour éviter l'expiration et répondre ensuite via editReply
            try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            } catch (_) {}
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
            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.error');
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply(errorEmbed);
            } else {
                try { await interaction.editReply(errorEmbed); } catch (_) {}
            }
        }
    },

    

    async handleSetChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');
        const typesString = interaction.options.getString('types');
        
        const lang = guild.language || 'fr';
        
        // Valider les types fournis (support des alias FR/EN et accents)
        const validTypes = ['voice', 'message', 'channels', 'roles', 'server'];
        const normalize = (s) => s
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // retirer les accents

        const aliasMap = {
            // EN (canonique)
            voice: 'voice',
            message: 'message',
            channel: 'channels',
            channels: 'channels',
            role: 'roles',
            roles: 'roles',
            server: 'server',
            // FR
            vocal: 'voice',
            voix: 'voice',
            messages: 'message',
            salon: 'channels',
            salons: 'channels',
            role: 'roles', // déjà ci-dessus, conservé
            roles: 'roles', // déjà ci-dessus, conservé
            // avec accents normalisés
            "role": 'roles', // role (sans accent)
            "roles": 'roles',
            "role": 'roles',
            "serveur": 'server'
        };

        const rawTokens = typesString.split(',').map(normalize).filter(t => t.length > 0);
        const requestedTypes = rawTokens.map(t => aliasMap[t] || t);
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
            
            const errEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.invalid_types', {
                types: invalidTypes.join(', '),
                validTypes: validTypesTranslated
            });
            return interaction.editReply(errEmbed);
        }

        // Initialiser le tableau channels s'il n'existe pas
        if (!guild.logs.channels) {
            guild.logs.channels = [];
        }

        // Avant d'activer sur ce canal, désactiver ces types sur tous les autres canaux
        guild.logs.channels.forEach(ch => {
            if (ch.channelId !== channel.id) {
                requestedTypes.forEach(type => {
                    if (typeof ch.types[type] !== 'undefined') ch.types[type] = false;
                });
            }
        });

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

        // Activer le système de logs et activer les types globaux correspondants
        guild.logs.enabled = true;
        requestedTypes.forEach(type => {
            if (guild.logs.types && typeof guild.logs.types[type] !== 'undefined') {
                guild.logs.types[type] = true;
            }
        });

        await guild.save();

        const typeNames = {
            voice: LanguageManager.get(lang, 'commands.setlogs.types.voice'),
            message: LanguageManager.get(lang, 'commands.setlogs.types.message'),
            channels: LanguageManager.get(lang, 'commands.setlogs.types.channels'),
            roles: LanguageManager.get(lang, 'commands.setlogs.types.roles'),
            server: LanguageManager.get(lang, 'commands.setlogs.types.server')
        };

        const enabledTypes = requestedTypes.map(type => typeNames[type]).join(', ');

        const configuredMsg = LanguageManager.get(lang, 'commands.setlogs.channel_configured', {
            channel: channel.toString(),
            types: enabledTypes
        });
        const configuredEmbed = await ComponentsV3.successEmbed(interaction.guild.id, 'common.success', configuredMsg);
        await interaction.editReply(configuredEmbed);
    },

    async handleRemoveChannel(interaction, guild) {
        const channel = interaction.options.getChannel('channel');

        if (!guild.logs.channels || guild.logs.channels.length === 0) {
            const lang = guild.language || 'fr';
            const errEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.no_channels_configured');
            return interaction.editReply(errEmbed);
        }

        const channelIndex = guild.logs.channels.findIndex(ch => ch.channelId === channel.id);
        
        if (channelIndex === -1) {
            const lang = guild.language || 'fr';
            const errEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setlogs.channel_not_found', { channel: channel.toString() });
            return interaction.editReply(errEmbed);
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
        const removedMsg = LanguageManager.get(lang, 'commands.setlogs.channel_removed', { channel: channel.toString() });
        const removedEmbed = await ComponentsV3.successEmbed(interaction.guild.id, 'common.success', removedMsg);
        await interaction.editReply(removedEmbed);
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

        const disabledMsg = LanguageManager.get(guild.language || 'fr', 'commands.setlogs.disabled_success');
        const disabledEmbed = await ComponentsV3.successEmbed(interaction.guild.id, 'common.success', disabledMsg);
        await interaction.editReply(disabledEmbed);
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

        const configMsg = LanguageManager.get(guild.language || 'fr', 'commands.setlogs.config_success', {
            type: typeNames[type],
            status: enabled ? '✅' : '❌'
        });
        const configEmbed = await ComponentsV3.successEmbed(interaction.guild.id, 'common.success', configMsg);
        await interaction.editReply(configEmbed);
    },

    async handleStatus(interaction, guild) {
        const lang = guild.language || 'fr';

        // Sécuriser la structure des logs pour éviter les erreurs
        if (!guild.logs) {
            guild.logs = {
                enabled: false,
                channelId: null,
                types: { voice: false, message: false, channels: false, roles: false, server: false },
                channels: []
            };
        }
        if (!guild.logs.types) {
            guild.logs.types = { voice: false, message: false, channels: false, roles: false, server: false };
        }
        if (!Array.isArray(guild.logs.channels)) {
            guild.logs.channels = [];
        }
        
        // S'assurer que tous les utilisateurs ont des warnings comme tableau et non comme nombre
        // Note: Ne pas enregistrer ici; la commande status ne doit pas modifier la base.
        if (guild.users && guild.users.length > 0) {
            guild.users.forEach(user => {
                if (typeof user.warnings === 'number') {
                    user.warnings = [];
                }
            });
        }
        
        const header = `**${guild.logs.enabled 
            ? LanguageManager.get(lang, 'commands.setlogs.status.enabled_label') 
            : LanguageManager.get(lang, 'commands.setlogs.status.disabled_label')}**`;

        const parts = [];
        parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.global_state')}** ${header}`);

        if (guild.logs.channelId) {
            parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.main_channel')}** <#${guild.logs.channelId}>`);
        }

        parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.global_types')}**`);
        parts.push(`${LanguageManager.get(lang, 'commands.setlogs.types.voice')}: ${guild.logs.types.voice ? '✅' : '❌'}`);
        parts.push(`${LanguageManager.get(lang, 'commands.setlogs.types.message')}: ${guild.logs.types.message ? '✅' : '❌'}`);
        parts.push(`${LanguageManager.get(lang, 'commands.setlogs.types.channels')}: ${guild.logs.types.channels ? '✅' : '❌'}`);
        parts.push(`${LanguageManager.get(lang, 'commands.setlogs.types.roles')}: ${guild.logs.types.roles ? '✅' : '❌'}`);
        parts.push(`${LanguageManager.get(lang, 'commands.setlogs.types.server')}: ${guild.logs.types.server ? '✅' : '❌'}`);

        parts.push('');
        if (guild.logs.channels && guild.logs.channels.length > 0) {
            parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.configured_channels')}**`);
            guild.logs.channels.forEach((logChannel, index) => {
                const channel = interaction.guild.channels.cache.get(logChannel.channelId);
                const channelName = channel 
                    ? `<#${logChannel.channelId}>` 
                    : `${LanguageManager.get(lang, 'commands.setlogs.status.deleted_channel', { id: logChannel.channelId })}`;
                parts.push(`\n**${index + 1}.** ${channelName}`);
                parts.push(`   ${LanguageManager.get(lang, 'commands.setlogs.types.voice')}: ${logChannel.types.voice ? '✅' : '❌'}  ${LanguageManager.get(lang, 'commands.setlogs.types.message')}: ${logChannel.types.message ? '✅' : '❌'}  ${LanguageManager.get(lang, 'commands.setlogs.types.channels')}: ${logChannel.types.channels ? '✅' : '❌'}`);
                parts.push(`   ${LanguageManager.get(lang, 'commands.setlogs.types.roles')}: ${logChannel.types.roles ? '✅' : '❌'}  ${LanguageManager.get(lang, 'commands.setlogs.types.server')}: ${logChannel.types.server ? '✅' : '❌'}`);
            });
        } else {
            parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.no_specific_channels')}**`);
        }

        parts.push('');
        parts.push(`**${LanguageManager.get(lang, 'commands.setlogs.status.useful_commands')}**`);
        parts.push(LanguageManager.get(lang, 'commands.setlogs.status.cmd_setchannel'));
        parts.push(LanguageManager.get(lang, 'commands.setlogs.status.cmd_config'));
        parts.push(LanguageManager.get(lang, 'commands.setlogs.status.cmd_removechannel'));

        const content = parts.join('\n');
        const titleKey = 'commands.setlogs.status_title';

        // Répondre avec Components V3 (message public, sans composants interactifs)
        const statusPayload = await ComponentsV3.createEmbed({
            guildId: interaction.guild.id,
            titleKey,
            additionalContent: [
                { type: 'text', content }
            ],
            addDividers: true,
            // L'éphémère est géré via deferReply(flags: Ephemeral)
        });

        await interaction.editReply({
            ...statusPayload,
            flags: MessageFlags.IsComponentsV2
        });
    }
};