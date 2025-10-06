// commands/moderation/kick.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription(LanguageManager.get('fr', 'commands.kick.description') || 'Expulser un membre du serveur')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.kick.description') || 'Kick a member from the server'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.kick.user_option') || 'Le membre à expulser')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.kick.user_option') || 'The member to kick'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.kick.reason_option') || 'Raison de l\'expulsion')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.kick.reason_option') || 'Reason for the kick'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';
        const finalReason = reason || BotEmbeds.getLanguageManager().get(lang, 'common.no_reason') || 'Aucune raison fournie';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        if (!user) {
            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_user_not_found');
            return interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
        }

        if (user.id === interaction.user.id) {
            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_self');
            return interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_hierarchy', { user: user.toString() });
                return interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            }

            if (!member.kickable) {
                const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_kickable', { user: user.toString() });
                return interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            }

            await member.kick(reason);

            const successMessage = LanguageManager.get(lang, 'commands.kick.success', {
                executor: interaction.user.toString(),
                user: user.toString(),
                reason: reason
            });
            
            const successEmbed = await ComponentsV3.successEmbed(interaction.guild.id, 'commands.kick.success_title', successMessage);
            await interaction.reply(successEmbed);

        } catch (error) {
            if (error.code === 10007) {
                const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_user_not_found');
                await interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            } else {
                const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_generic');
                await interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            }
        }
    }
};