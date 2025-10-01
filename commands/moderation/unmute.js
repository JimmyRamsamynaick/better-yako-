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
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return await interaction.reply({
                ...botNoPermEmbed,
                ephemeral: true
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const noSetupEmbed = BotEmbeds.createGenericErrorEmbed('Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord', interaction.guild.id, lang);
            return await interaction.reply({
                ...noSetupEmbed,
                ephemeral: true
            });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const noRoleEmbed = BotEmbeds.createGenericErrorEmbed('Le rôle de mute n\'a pas été trouvé', interaction.guild.id, lang);
            return await interaction.reply({
                ...noRoleEmbed,
                ephemeral: true
            });
            }

            if (!member.roles.cache.has(muteRole.id)) {
                const notMutedEmbed = BotEmbeds.createGenericErrorEmbed('Cet utilisateur n\'est pas mute', interaction.guild.id, lang);
            return await interaction.reply({
                ...notMutedEmbed,
                ephemeral: true
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
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                'Une erreur est survenue lors du unmute',
                interaction.guild.id,
                lang
            );
            await interaction.reply({ ...errorEmbed, ephemeral: true });
        }
    }
};