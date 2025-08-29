// commands/moderation/kick.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulser un membre du serveur')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Le membre à expulser')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison de l\'expulsion')
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

        if (user.id === interaction.user.id) {
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                BotEmbeds.getLanguageManager().get(lang, 'commands.kick.error_self') || 'Vous ne pouvez pas vous expulser vous-même',
                interaction.guild.id
            );
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        if (user.id === interaction.client.user.id) {
            const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                BotEmbeds.getLanguageManager().get(lang, 'commands.kick.error_bot') || 'Je ne peux pas m\'expulser moi-même',
                interaction.guild.id
            );
            return interaction.reply({ ...errorEmbed, ephemeral: true });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                    BotEmbeds.getLanguageManager().get(lang, 'commands.kick.error_hierarchy') || 'Vous ne pouvez pas expulser ce membre (rôle supérieur ou égal)',
                    interaction.guild.id
                );
                return interaction.reply({ ...errorEmbed, ephemeral: true });
            }

            if (!member.kickable) {
                const errorEmbed = BotEmbeds.createKickUserNotKickableEmbed(user, interaction.guild.id, lang);
                return interaction.reply({ ...errorEmbed, ephemeral: true });
            }

            await member.kick(finalReason);

            const successEmbed = BotEmbeds.createKickSuccessEmbed(
                user,
                finalReason,
                interaction.guild.id,
                interaction.user,
                lang
            );
            
            await interaction.reply(successEmbed);

        } catch (error) {
            console.error(error);
            if (error.code === 10007) {
                const errorEmbed = BotEmbeds.createKickUserNotFoundEmbed(interaction.guild.id, lang);
                await interaction.reply({ ...errorEmbed, ephemeral: true });
            } else {
                const errorEmbed = BotEmbeds.createGenericErrorEmbed(
                    BotEmbeds.getLanguageManager().get(lang, 'commands.kick.error') || 'Une erreur est survenue lors de l\'expulsion',
                    interaction.guild.id
                );
                await interaction.reply({ ...errorEmbed, ephemeral: true });
            }
        }
    }
};