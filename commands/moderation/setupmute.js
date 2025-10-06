// commands/moderation/setupmute.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupmute')
        .setDescription(LanguageManager.get('fr', 'commands.setupmute.description') || 'Configurer le système de mute')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.setupmute.description') || 'Configure the mute system'
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorResponse = await ComponentsV3.errorEmbed(interaction.guild.id, 'setupmute.no_permission', {}, true);
            return interaction.reply(errorResponse);
        }

        await interaction.deferReply({ ephemeral: false });

        try {
            // Vérifier permissions du bot pour éditer les salons
            const me = interaction.guild.members.me;
            if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorResponse = await ComponentsV3.errorEmbed(interaction.guild.id, 'errors.bot_no_permission', {}, false);
                return await interaction.editReply(errorResponse);
            }

            let muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            
            if (!muteRole) {
                muteRole = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#808080',
                    permissions: [],
                    reason: 'Rôle de mute automatique'
                });
            }

            // Configurer les permissions pour tous les channels
            const channels = interaction.guild.channels.cache;
            let channelCount = 0;

            for (const channel of channels.values()) {
                try {
                    switch (channel.type) {
                        case ChannelType.GuildText:
                        case ChannelType.GuildAnnouncement:
                        case ChannelType.GuildForum:
                            await channel.permissionOverwrites.edit(muteRole, {
                                SendMessages: false,
                                AddReactions: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false
                            });
                            break;
                        case ChannelType.GuildVoice:
                        case ChannelType.GuildStageVoice:
                            await channel.permissionOverwrites.edit(muteRole, {
                                Speak: false,
                                Stream: false
                            });
                            break;
                        case ChannelType.GuildCategory:
                            // Propager via la catégorie
                            await channel.permissionOverwrites.edit(muteRole, {
                                SendMessages: false,
                                AddReactions: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false,
                                Speak: false,
                                Stream: false
                            });
                            break;
                        default:
                            // threads héritent du parent; ignorer explicitement
                            break;
                    }
                    channelCount++;
                } catch (error) {
                    console.error(`Erreur sur le channel ${channel.name}:`, error);
                }
            }

            // Sauvegarder en base
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { muteRole: muteRole.id },
                { upsert: true }
            );

            // Récupérer la langue du serveur
            const guildData = await Guild.findOne({ guildId: interaction.guild.id });
            const lang = guildData?.language || 'fr';
            
            // Récupérer le message sans placeholders
            const successMessage = LanguageManager.get(lang, 'commands.setupmute.success');
            
            const successResponse = await ComponentsV3.successEmbed(
                interaction.guild.id,
                'commands.setupmute.success',
                successMessage,
                false
            );
            await interaction.editReply(successResponse);

        } catch (error) {
            console.error(error);
            const errorResponse = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.setupmute.error');
            await interaction.editReply(errorResponse);
        }
    }
};