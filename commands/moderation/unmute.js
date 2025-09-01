// commands/moderation/unmute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Rendre la parole à un membre')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Le membre à qui rendre la parole')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Raison du unmute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Aucune raison fournie';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                components: [BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                components: [BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang)],
                ephemeral: true
            });
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                return interaction.reply({
                    components: [BotEmbeds.createGenericErrorEmbed('Le système de mute n\'est pas configuré. Utilisez `/setupmute` d\'abord', interaction.guild.id, lang)],
                    ephemeral: true
                });
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                return interaction.reply({
                    components: [BotEmbeds.createGenericErrorEmbed('Le rôle de mute n\'a pas été trouvé', interaction.guild.id, lang)],
                    ephemeral: true
                });
            }

            if (!member.roles.cache.has(muteRole.id)) {
                return interaction.reply({
                    components: [BotEmbeds.createGenericErrorEmbed('Cet utilisateur n\'est pas mute', interaction.guild.id, lang)],
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