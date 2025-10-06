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
        // Répondre immédiatement pour validations rapides; différer seulement avant actions

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || require('../../utils/languageManager').get(lang, 'common.no_reason');

        // deferReply déjà effectué plus haut

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.no_permission',
                {},
                false
            );
            return interaction.reply(payload);
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            const payload = await ComponentsV3.errorEmbed(
                interaction.guild.id,
                'errors.bot_no_permission',
                {},
                false
            );
            return interaction.reply(payload);
        }

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!guildData?.muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error_no_setup',
                    {},
                    false
                );
                return interaction.reply(payload);
            }

            const muteRole = interaction.guild.roles.cache.get(guildData.muteRole);
            if (!muteRole) {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error_role_not_found',
                    {},
                    false
                );
                return interaction.reply(payload);
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
                    false
                );
                return interaction.reply(payload);
            }

            // À partir d'ici, différer pour actions (remove role + DB)
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ ephemeral: false });
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
                false
            );
            await interaction.editReply(successPayload);

        } catch (error) {
            console.error(error);
            try {
                const payload = await ComponentsV3.errorEmbed(
                    interaction.guild.id,
                    'commands.unmute.error',
                    {},
                    false
                );
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(payload);
                } else {
                    await interaction.reply(payload);
                }
            } catch (_) {}
        }
    }
};