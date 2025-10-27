const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const { appendSystemLine, initTranscript, getTranscriptFilePath } = require('../../utils/ticketTranscripts');
const { setClosedBy, setTicketMeta, updateOnClose } = require('../../utils/ticketsRegistry');
const path = require('path');

const CATEGORIES = [
    { key: 'recrutement', emoji: { name: '📝' } },
    { key: 'report', emoji: { name: '🚨' } },
    { key: 'partenariat', emoji: { name: '🤝' } },
    { key: 'owners', emoji: { name: '👑' } }
];

function safeLang(key, fallback, lang = 'fr') {
    const translation = LanguageManager.get(lang, key);
    return translation && !translation.startsWith('[MISSING:') ? translation : fallback;
}

async function createTicketChannel(interaction, categoryKey) {
    const guildData = await Guild.findOne({ guildId: interaction.guild.id });
    const lang = guildData?.language || 'fr';
    const respond = interaction.deferred ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction);

    if (!guildData?.tickets?.categoryId) {
        return respond({
            embeds: [{ title: '❌ Erreur', description: safeLang('tickets.errors.no_category_setup', 'Catégorie des tickets non configurée. Utilisez /settickets.', lang) }],
            ephemeral: false
        });
    }

    const category = interaction.guild.channels.cache.get(guildData.tickets.categoryId);
    if (!category) {
        return respond({
            embeds: [{ title: '❌ Erreur', description: safeLang('tickets.errors.invalid_category', 'La catégorie configurée est introuvable.', lang) }],
            ephemeral: false
        });
    }

    const userTag = interaction.user.tag.replace(/[^a-zA-Z0-9-_]/g, '');
    const channelName = `ticket-${categoryKey}-${userTag}`.toLowerCase();

    try {
        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            reason: `Ticket ${categoryKey} ouvert par ${interaction.user.tag}`
        });

        // Enregistrer les métadonnées du ticket pour les logs de suppression
        setTicketMeta(channel.id, {
            openerUserId: interaction.user.id,
            openerTag: interaction.user.tag,
            categoryKey,
            createdAt: channel.createdTimestamp
        });

        const categoryLabel = safeLang(`tickets.categories.${categoryKey}.label`, categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), lang);

        const locale = lang === 'en' ? 'en-US' : 'fr-FR';
        const footerDate = new Date(channel.createdTimestamp).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

        const openEmbed = {
            color: 0x5865F2,
            title: LanguageManager.get(lang, 'tickets.open_title_template', { category: categoryLabel }) || `Ticket ${categoryLabel}`,
            description: LanguageManager.get(lang, 'tickets.open_description', { user: interaction.user.toString() }) || `Bonjour ${interaction.user.toString()}, bienvenue dans votre ticket !\nUn membre du staff va vous prendre en charge dans les plus brefs délais.`,
            fields: [
                { name: LanguageManager.get(lang, 'tickets.open_fields.category') || 'Catégorie', value: categoryLabel, inline: true },
                { name: LanguageManager.get(lang, 'tickets.open_fields.created') || 'Créé le', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`, inline: true },
                { name: LanguageManager.get(lang, 'tickets.open_reminders_label') || 'Rappels', value: LanguageManager.get(lang, 'tickets.open_reminders_content') || '→ Soyez précis dans votre demande\n→ Restez poli et respectueux\n→ Patientez, nous répondons rapidement\n→ Ne spammez pas le ticket' }
            ],
            footer: { text: LanguageManager.get(lang, 'tickets.open_footer', { date: footerDate }) || `Ticket créé le ${footerDate}` }
        };

        const closeButton = {
            type: 1,
            components: [{
                type: 2,
                label: safeLang('tickets.close_button_label', 'Fermer le ticket', lang),
                style: 4,
                custom_id: `ticket_close:${channel.id}`,
                emoji: { name: '🗑️' }
            }]
        };

        await channel.send({ embeds: [openEmbed], components: [closeButton] });

        const pingMsg = await channel.send({
            content: interaction.user.toString(),
            allowedMentions: { users: [interaction.user.id], roles: [] }
        });
        setTimeout(() => {
            pingMsg.delete().catch(e => console.error('[Tickets] Failed to delete ping message:', e));
        }, 1500);

        if (guildData.tickets && guildData.tickets.staffRoleId) {
            const staffRole = interaction.guild.roles.cache.get(guildData.tickets.staffRoleId);
            if (staffRole) {
                await channel.send(`${staffRole} Nouveau ticket ${categoryLabel} !`);
            }
        }

        const createdMsg = safeLang('tickets.created_confirmation', lang === 'en' ? `Ticket created: #${channel.name}` : `Ticket créé: #${channel.name}`, lang);
        await respond({
            embeds: [{
                title: `✅ ${createdMsg}`,
                description: lang === 'en' ? 'Your ticket has been created.' : 'Votre ticket a été créé.'
            }],
            ephemeral: true
        });

        initTranscript(channel, categoryKey, interaction.user.tag);


    } catch (e) {
        console.error('[Tickets] Channel creation failed:', e);
        return respond({
            embeds: [{ title: `❌ ${LanguageManager.get(lang, 'common.error')}`, description: e.message }],
            ephemeral: false
        });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription(safeLang('commands.ticketpanel.description', 'Envoyer un panneau de tickets'))
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.ticketpanel.description') || 'Send a ticket panel'
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        const basePayload = await ComponentsV3.createEmbed({
            guildId: interaction.guild.id,
            langOverride: lang,
            titleKey: 'tickets.panel_title',
            contentKey: 'tickets.panel_content',
            ephemeral: false
        });

        const selectMenu = {
            type: 1,
            components: [{
                type: 3,
                custom_id: 'ticket_category_select',
                placeholder: safeLang('tickets.select_category_placeholder', 'Choisissez la catégorie de votre demande', lang),
                options: CATEGORIES.map((cat) => ({
                    label: safeLang(`tickets.categories.${cat.key}.label`, cat.key.charAt(0).toUpperCase() + cat.key.slice(1), lang),
                    value: `ticket_category:${cat.key}`,
                    description: safeLang(`tickets.categories.${cat.key}.description`, `Ouvrir un ticket pour ${cat.key}`, lang),
                    emoji: cat.emoji,
                })),
            }, ],
        };

        await interaction.editReply({
            ...basePayload,
            components: [selectMenu],
        });
    },

    async handleSelectMenuInteraction(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            try { await interaction.deferReply({ ephemeral: true }); } catch (_) {}
        }
        const [prefix, categoryKey] = interaction.values[0].split(':');
        if (prefix !== 'ticket_category') return;
        await createTicketChannel(interaction, categoryKey);
    },

    async handleButtonInteraction(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            try { await interaction.deferReply({ ephemeral: true }); } catch (_) {}
        }
        const [prefix, categoryKey] = interaction.customId.split(':');
        if (prefix !== 'ticket_category') return;
        await createTicketChannel(interaction, categoryKey);
    },

    async handleCloseButton(interaction) {
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';
        const [prefix, channelId] = interaction.customId.split(':');
        if (prefix !== 'ticket_close') return;

        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) {
            return interaction.reply({
                embeds: [{ title: '❌ Erreur', description: safeLang('tickets.errors.channel_not_found', 'Salon de ticket introuvable.', lang) }],
                ephemeral: false
            });
        }
        
        const channelParts = channel.name.split('-');
        const categoryKey = channelParts.length > 1 ? channelParts[1] : 'inconnu';
        const categoryLabel = safeLang(`tickets.categories.${categoryKey}.label`, categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1), lang);

        try {
            const closeEmbed = {
                title: '🗑️ Ticket en cours de fermeture',
                description: 'Ce ticket sera supprimé dans 5 secondes.',
                fields: [
                    { name: 'Résumé', value: `• **Catégorie :** ${categoryLabel}\n• **Fermé par :** ${interaction.user.toString()}\n• **Transcript :** Sauvegardé automatiquement` }
                ],
                timestamp: new Date()
            };

            await interaction.reply({ embeds: [closeEmbed] });

            appendSystemLine(channel, `Closed by ${interaction.user.tag}`);
            const transcriptPath = getTranscriptFilePath(channel.name);

            // Calculer le nombre total de messages (limité à 1000 pour éviter de surcharger)
            let totalMessages = 0;
            try {
                let lastId = undefined;
                while (true) {
                    const fetched = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
                    if (fetched.size === 0) break;
                    totalMessages += fetched.size;
                    lastId = fetched.last()?.id;
                    if (totalMessages >= 1000) break;
                }
            } catch (err) {
                console.error('[Tickets] Unable to count messages in ticket channel:', err);
            }

            // Enregistrer qui a fermé et les infos utiles pour le log channelDelete
            setClosedBy(channel.id, interaction.user);
            updateOnClose(channel.id, {
                transcriptFileName: path.basename(transcriptPath),
                totalMessages
            });

            setTimeout(() => {
                channel.delete(`Ticket closed by ${interaction.user.tag}`).catch(e => console.error("Failed to delete ticket channel:", e));
            }, 5000);

        } catch (e) {
            console.error('[Tickets] Close failed:', e);
            return interaction.reply({
                embeds: [{ title: `❌ ${LanguageManager.get(lang, 'common.error')}`, description: e.message }],
                ephemeral: false
            });
        }
    }
};