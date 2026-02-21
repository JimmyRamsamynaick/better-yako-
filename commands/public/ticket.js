const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { setTicketMeta, get } = require('../../utils/ticketsRegistry');

function safeLang(key, fallback, lang = 'fr', replacements = {}) {
    const translation = LanguageManager.get(lang, key, replacements);
    return translation && !translation.startsWith('[MISSING:') ? translation : fallback;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription(safeLang('commands.ticket.description', 'Gérer un ticket', 'fr'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.ticket.description') || 'Manage a ticket'
        })
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription(safeLang('commands.ticket.add_description', 'Ajouter un membre au ticket', 'fr'))
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.ticket.add_description') || 'Add a member to the ticket'
                })
                .addUserOption(option =>
                    option
                        .setName('membre')
                        .setDescription(safeLang('commands.ticket.add_member_option', 'Membre à ajouter au ticket', 'fr'))
                        .setDescriptionLocalizations({
                            'en-US': LanguageManager.get('en', 'commands.ticket.add_member_option') || 'Member to add to the ticket'
                        })
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('claim')
                .setDescription(safeLang('commands.ticket.claim_description', 'Prendre en charge le ticket (claim)', 'fr'))
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.ticket.claim_description') || 'Claim the ticket'
                })
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        if (!interaction.channel || !guildData?.tickets?.categoryId) {
            return interaction.reply({
                embeds: [{
                    title: '❌',
                    description: safeLang('tickets.errors.no_category_setup', 'Catégorie des tickets non configurée. Utilisez /settickets.', lang)
                }],
                ephemeral: true
            });
        }

        if (interaction.channel.parentId !== guildData.tickets.categoryId) {
            return interaction.reply({
                embeds: [{
                    title: '❌',
                    description: safeLang('commands.ticket.errors.not_in_ticket', 'Cette commande doit être utilisée dans un salon de ticket.', lang)
                }],
                ephemeral: true
            });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const member = interaction.options.getMember('membre');
            if (!member) {
                return interaction.reply({
                    embeds: [{
                        title: '❌',
                        description: safeLang('commands.ticket.errors.member_not_found', 'Membre introuvable sur ce serveur.', lang)
                    }],
                    ephemeral: true
                });
            }

            try {
                await interaction.channel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });

                const existing = get(interaction.channel.id);
                const existingExtra = Array.isArray(existing?.meta?.extraMemberIds) ? existing.meta.extraMemberIds : [];
                const updatedExtra = Array.from(new Set([...existingExtra, member.id]));

                setTicketMeta(interaction.channel.id, {
                    extraMemberIds: updatedExtra
                });

                return interaction.reply({
                    embeds: [{
                        title: '✅',
                        description: safeLang('commands.ticket.add_success', '{member} a été ajouté au ticket.', lang, { member: member.toString() })
                    }],
                    ephemeral: true
                });
            } catch (e) {
                return interaction.reply({
                    embeds: [{
                        title: '❌',
                        description: safeLang('commands.ticket.errors.add_failed', 'Impossible d’ajouter ce membre au ticket.', lang)
                    }],
                    ephemeral: true
                });
            }
        }

        if (sub === 'claim') {
            const member = interaction.member;

            const staffRoleId = guildData?.tickets?.staffRoleId || null;
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            const hasStaffRole = staffRoleId ? member.roles.cache.has(staffRoleId) : false;

            if (!isAdmin && !hasStaffRole) {
                return interaction.reply({
                    embeds: [{
                        title: '❌',
                        description: safeLang('commands.ticket.errors.not_staff', 'Seul un membre du staff peut claim ce ticket.', lang)
                    }],
                    ephemeral: true
                });
            }

            const existing = get(interaction.channel.id);
            if (existing?.meta?.claimedById && existing.meta.claimedById !== member.id) {
                return interaction.reply({
                    embeds: [{
                        title: '❌',
                        description: safeLang('commands.ticket.errors.already_claimed', 'Ce ticket est déjà claim par un autre membre du staff.', lang)
                    }],
                    ephemeral: true
                });
            }

            const openerId = existing?.meta?.openerUserId || existing?.meta?.openerId;
            const extraMemberIds = Array.isArray(existing?.meta?.extraMemberIds) ? existing.meta.extraMemberIds : [];

            const everyoneRoleId = interaction.guild.roles.everyone.id;
            const botId = interaction.client.user.id;

            const overwrites = [];

            overwrites.push({
                id: everyoneRoleId,
                deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            });

            overwrites.push({
                id: botId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'ManageChannels']
            });

            if (openerId) {
                overwrites.push({
                    id: openerId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks']
                });
            }

            overwrites.push({
                id: member.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'ManageChannels']
            });

            for (const id of extraMemberIds) {
                if (id === openerId || id === member.id) continue;
                overwrites.push({
                    id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks']
                });
            }

            try {
                await interaction.channel.permissionOverwrites.set(overwrites);

                setTicketMeta(interaction.channel.id, {
                    claimedById: member.id,
                    claimedByTag: member.user.tag
                });

                return interaction.reply({
                    embeds: [{
                        title: '✅',
                        description: safeLang('commands.ticket.claim_success', 'Ce ticket a été claim par {member}.', lang, { member: member.toString() })
                    }],
                    ephemeral: true
                });
            } catch (e) {
                return interaction.reply({
                    embeds: [{
                        title: '❌',
                        description: safeLang('commands.ticket.errors.claim_failed', 'Impossible de claim ce ticket.', lang)
                    }],
                    ephemeral: true
                });
            }
        }
    }
};

