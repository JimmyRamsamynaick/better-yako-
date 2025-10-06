// commands/moderation/kick.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

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
        // Assurer un acquittement unique pour cette interaction
        let acknowledgedExternally = false;
        try {
            // Réponse initiale non éphémère
            await interaction.deferReply();
            console.log('[KICK] deferReply ok');
        } catch (e) {
            console.log('[KICK] deferReply failed:', e?.message);
            if (String(e?.message || '').includes('already been acknowledged')) {
                acknowledgedExternally = true;
            }
        }
        console.log('[KICK] State after defer:', { deferred: interaction.deferred, replied: interaction.replied, repliable: interaction.isRepliable?.() });
        // Si pour une raison quelconque ce n'est pas acquitté, basculer sur une réponse directe
        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.reply({ content: '⏳' });
                console.log('[KICK] Fallback reply ok');
            } catch (e) {
                console.log('[KICK] Fallback reply failed:', e?.message);
                if (String(e?.message || '').includes('already been acknowledged')) {
                    acknowledgedExternally = true;
                }
            }
            console.log('[KICK] State after fallback:', { deferred: interaction.deferred, replied: interaction.replied, repliable: interaction.isRepliable?.() });
        }
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        // Helper pour répondre correctement selon l'état d'acquittement
        const respond = async (payload) => {
            try {
                if (acknowledgedExternally) {
                    console.log('[KICK] respond: externally acked -> followUp');
                    return await interaction.followUp(payload);
                }
                if (interaction.deferred) {
                    const isComponentsV3 = Array.isArray(payload?.components) && payload.components[0]?.type === 17;
                    const isEphemeral = payload?.flags === 32768;
                    if (isEphemeral || isComponentsV3) {
                        console.log('[KICK] respond: deferred -> followUp (ephemeral or components v3)');
                        return await interaction.followUp(payload);
                    }
                    console.log('[KICK] respond: deferred -> editReply');
                    return await interaction.editReply(payload);
                }
                if (interaction.replied) {
                    console.log('[KICK] respond: replied -> followUp');
                    return await interaction.followUp(payload);
                }
                console.log('[KICK] respond: fresh -> reply');
                return await interaction.reply(payload);
            } catch (e) {
                if (String(e?.message || '').includes('already been acknowledged')) {
                    try {
                        console.log('[KICK] respond: error ack -> followUp');
                        return await interaction.followUp(payload);
                    } catch (eFollow) {
                        try {
                            console.log('[KICK] respond: error ack -> channel.send');
                            return await interaction.channel?.send(payload);
                        } catch (_) { throw eFollow; }
                    }
                }
                // Generic fallback rotation
                try {
                    console.log('[KICK] respond: generic fallback -> reply');
                    return await interaction.reply(payload);
                } catch (_) {
                    try {
                        console.log('[KICK] respond: generic fallback -> editReply');
                        return await interaction.editReply(payload);
                    } catch (e2) {
                        console.log('[KICK] respond: generic fallback -> channel.send');
                        try { return await interaction.channel?.send(payload); } catch (_) { throw e2; }
                    }
                }
            }
        };

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            console.log('[KICK] No permission, sending error embed...');
            return respond(errorEmbed);
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
            const errorEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            console.log('[KICK] Bot lacks permissions, sending error embed...');
            return respond(errorEmbed);
        }

        if (!user) {
            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_found', {}, true, lang);
            console.log('[KICK] No user provided, sending error embed...');
            return respond(errorEmbed);
        }

        if (user.id === interaction.user.id) {
            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_self', {}, true, lang);
            console.log('[KICK] Self-kick prevented, sending error embed...');
            return respond(errorEmbed);
        }

        try {
            // Tenter le kick directement par ID pour éviter les fetch instables
            await interaction.guild.members.kick(user.id, reason);

            // Si le kick échoue, on catch plus bas et ajuste le message

            // Publier un unique message public (non-éphémère) au même format que l’éphémère
            try {
                const publicPayload = {
                    embeds: [{
                        title: LanguageManager.get(lang, 'commands.kick.success_title') || '✅ User kicked',
                        description: LanguageManager.get(lang, 'commands.kick.success', {
                            executor: interaction.user.toString(),
                            user: user.toString(),
                            reason: finalReason
                        }) || `${interaction.user.toString()} kicked ${user.toString()} for ${finalReason}`,
                        color: 0x57F287
                    }]
                };
                // Publier directement sans éditer le message initial
                await interaction.followUp(publicPayload);
                console.log('[KICK] Public announcement sent via followUp (non-ephemeral, components v3)');
                // Finaliser la réponse différée en message vide (pas d'emoji en haut)
                try {
                    await interaction.editReply({ content: '\u200b' });
                } catch (finalizeErr) {
                    console.warn('[KICK] Failed to finalize deferred reply:', finalizeErr?.message || finalizeErr);
                }
            } catch (announceErr) {
                console.error('[KICK] Failed to send public announcement:', announceErr);
            }

        } catch (error) {
            console.error('[KICK] Error during kick:', error);
            // 10007: cible non membre du serveur
            if (error?.code === 10007) {
                const notFoundEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_found', {}, true, lang);
                try { await respond(notFoundEmbed); } catch (e) { console.error('[KICK] respond failed (not_found):', e); }
                return;
            }

            // Permissions/hierarchy: essayer d’affiner le message si on a le membre en cache
            const cached = interaction.guild.members.resolve(user.id);
            if (String(error?.message || '').includes('Missing Permissions')) {
                if (cached && cached.roles?.highest?.position >= interaction.member.roles.highest.position) {
                    const hierEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_hierarchy', { user: user.toString() }, true, lang);
                    try { await respond(hierEmbed); } catch (e) { console.error('[KICK] respond failed (hierarchy):', e); }
                    return;
                }
                const notKickableEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error_not_kickable', { user: user.toString() }, true, lang);
                try { await respond(notKickableEmbed); } catch (e) { console.error('[KICK] respond failed (not_kickable):', e); }
                return;
            }

            const errorEmbed = await ComponentsV3.errorEmbed(interaction.guild.id, 'commands.kick.error', {}, true, lang);
            try { await respond(errorEmbed); } catch (e) { console.error('[KICK] respond failed (generic):', e); }
        }
    }
};