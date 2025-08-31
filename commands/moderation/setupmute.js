// commands/moderation/setupmute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupmute')
        .setDescription('Configurer le système de mute')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'setupmute.no_permission');
            return interaction.reply({ ...errorResponse, ephemeral: true });
        }

        await interaction.deferReply();

        try {
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
                    if (channel.isTextBased()) {
                        await channel.permissionOverwrites.edit(muteRole, {
                            SendMessages: false,
                            AddReactions: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false,
                            SendMessagesInThreads: false
                        });
                    } else if (channel.isVoiceBased()) {
                        await channel.permissionOverwrites.edit(muteRole, {
                            Speak: false,
                            Stream: false
                        });
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

            const successResponse = ComponentsV3.successEmbed(
                interaction.guild.id,
                'setupmute.success',
                {
                    role: muteRole.toString(),
                    channels: channelCount
                }
            );
            
            await interaction.editReply(successResponse);

        } catch (error) {
            console.error(error);
            const errorResponse = ComponentsV3.errorEmbed(interaction.guild.id, 'setupmute.error');
            await interaction.editReply(errorResponse);
        }
    }
};