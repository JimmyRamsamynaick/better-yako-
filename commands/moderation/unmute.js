// commands/moderation/unmute.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription(LanguageManager.get('fr', 'commands.unmute.description') || 'Rendre la parole à un membre')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.unmute.description') || 'Unmute a member'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.unmute.user_option') || 'Le membre à qui rendre la parole')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unmute.user_option') || 'The member to unmute'
                })
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription(LanguageManager.get('fr', 'commands.unmute.reason_option') || 'Raison du unmute')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.unmute.reason_option') || 'Reason for the unmute'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Différer immédiatement pour éviter le timeout de 3 secondes
        await interaction.deferReply({ ephemeral: false });

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.no_permission',
                {},
                false,
                lang
            );
            return interaction.editReply(payload);
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.bot_no_permission',
                {},
                false,
                lang
            );
            return interaction.editReply(payload);
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error_no_setup',
                    {},
                    false,
                    lang
                );
                return interaction.editReply(payload);
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error_role_not_found',
                    {},
                    false,
                    lang
                );
                return interaction.editReply(payload);
            }

            // Vérifier état role + DB pour éviter contradictions
            const memberHasMutedRole = member.roles.cache.has(muteRole.id);
            const userDoc = guildData?.users?.find?.(u => u.userId === user.id);
            const dbMuted = Boolean(userDoc?.muted);
            console.log('[Unmute Diagnostic]', { userId: user.id, muteRoleId: muteRole.id, memberHasMutedRole, dbMuted });

            if (!memberHasMutedRole && !dbMuted) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error_not_muted',
                    {},
                    false,
                    lang
                );
                return interaction.editReply(payload);
            }

            // Lever le timeout s'il existe et retirer le rôle s'il est présent
            try {
                await member.timeout(null, reason || 'Unmute via commande');
            } catch (_) {}
            if (memberHasMutedRole) {
                await member.roles.remove(muteRole, reason);
            }

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

            const successMessage = LanguageManager.get(lang, 'commands.unmute.success', {
                executor: `<@${interaction.user.id}>`,
                user: user.username || user.tag,
                reason: reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie'
            }) || `<@${interaction.user.id}> a démute ${user.username || user.tag} pour ${reason || 'Aucune raison fournie'}`;
            
            const successPayload = await ComponentsV3.successEmbed(
                interaction.guild.id,
                'commands.unmute.success_title',
                successMessage,
                false,
                lang
            );
            await interaction.editReply(successPayload);

        } catch (error) {
            console.error(error);
            try {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error',
                    {},
                    false,
                    lang
                );
                await interaction.editReply(payload);
            } catch (_) {}
        }
    }
};