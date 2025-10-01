// commands/moderation/unmute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription(LanguageManager.get('fr', 'commands.unmute.description') || 'Rendre la parole à un membre')
        .setDescriptionLocalizations({
            'EnglishUS': LanguageManager.get('en', 'commands.unmute.description') || 'Unmute a member'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.unmute.user_option') || 'Le membre à qui rendre la parole')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.unmute.user_option') || 'The member to unmute'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.unmute.reason_option') || 'Raison du unmute')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.unmute.reason_option') || 'Reason for the unmute'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return await interaction.reply({
                ...noPermEmbed,
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return await interaction.reply({
                ...botNoPermEmbed,
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const noSetupMessage = LanguageManager.get(lang, 'commands.unmute.error_no_setup') || 'Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord';
                const noSetupEmbed = BotEmbeds.createGenericErrorEmbed(noSetupMessage, interaction.guild.id, lang);
                return await interaction.reply({
                    ...noSetupEmbed,
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const noRoleMessage = LanguageManager.get(lang, 'commands.unmute.error_role_not_found') || 'Le rôle de mute n\'a pas été trouvé';
                const noRoleEmbed = BotEmbeds.createGenericErrorEmbed(noRoleMessage, interaction.guild.id, lang);
                return await interaction.reply({
                    ...noRoleEmbed,
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            if (!member.roles.cache.has(muteRole.id)) {
                const notMutedMessage = LanguageManager.get(lang, 'commands.unmute.error_not_muted') || 'Cet utilisateur n\'est pas mute';
                const notMutedEmbed = BotEmbeds.createGenericErrorEmbed(notMutedMessage, interaction.guild.id, lang);
                return await interaction.reply({
                    ...notMutedEmbed,
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            await member.roles.remove(muteRole, reason);

            // Mettre à jour la base dans Guild.users
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild.id, 'users.userId': user.id },
                { 
                    $set: {
                        'users.$.muted': false,
                        'users.$.mutedUntil': null
                    }
                }
            );

            const successEmbed = BotEmbeds.createUnmuteSuccessEmbed(
                user,
                reason,
                interaction.guild.id,
                interaction.user,
                lang
            );
            
            await interaction.reply({ ...successEmbed });

        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                const errorMessage = LanguageManager.get(lang, 'commands.unmute.error') || 'Une erreur est survenue lors du unmute';
                const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                    errorMessage,
                    interaction.guild.id,
                    lang
                );
                await interaction.reply({ ...errorEmbed, flags: 64 }); // MessageFlags.Ephemeral
            }
        }
    }
};