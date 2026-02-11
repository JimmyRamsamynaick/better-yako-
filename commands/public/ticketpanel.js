const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const { appendSystemLine, initTranscript, getTranscriptFilePath } = require('../../utils/ticketTranscripts');
const { setClosedBy, setTicketMeta, updateOnClose } = require('../../utils/ticketsRegistry');
const path = require('path');
const transcript = require('discord-html-transcripts');
const fs = require('fs');

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
        // Déterminer les permissions: visibilité limitée à owner, admins, staff et auteur
        const everyoneRoleId = interaction.guild.roles.everyone.id;
        const adminRoleIds = interaction.guild.roles.cache
            .filter(r => r.permissions.has('Administrator'))
            .map(r => r.id);
        const staffRoleId = guildData?.tickets?.staffRoleId || null;
        const ownerId = interaction.guild.ownerId;

        const overwrites = [
            // Bloquer tout le monde par défaut
            { id: everyoneRoleId, deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            // Autoriser le bot
            { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'ManageChannels'] },
            // Autoriser l'auteur du ticket
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks'] },
        ];

        // Autoriser le propriétaire du serveur
        if (ownerId) {
            overwrites.push({ id: ownerId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
        }
        // Autoriser les rôles admin
        adminRoleIds.forEach(roleId => {
            overwrites.push({ id: roleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
        });
        // Autoriser le rôle staff configuré
        if (staffRoleId) {
            overwrites.push({ id: staffRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] });
        }

        const channel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            reason: `Ticket ${categoryKey} ouvert par ${interaction.user.tag}`,
            permissionOverwrites: overwrites
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
        // Acquittement rapide pour éviter "L’application ne répond plus"
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (_) {
            if (!interaction.deferred && !interaction.replied) {
                try { await interaction.reply({ content: '⏳ Préparation du panneau de tickets…', ephemeral: true }); } catch (_) {}
            }
        }

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
            }],
        };

        // Vérifier les permissions d’envoi dans le salon
        const me = interaction.guild.members.me;
        const channel = interaction.channel;
        const perms = channel.permissionsFor(me);
        const canSend = perms && perms.has(PermissionFlagsBits.SendMessages);
        const canEmbed = perms && perms.has(PermissionFlagsBits.EmbedLinks);

        if (canSend && canEmbed) {
            try {
                await channel.send({
                    ...basePayload,
                    components: [selectMenu],
                });
                await interaction.editReply({
                    content: safeLang('tickets.panel_sent_confirmation', '✅ Panneau de tickets envoyé dans ce salon.', lang)
                });
            } catch (err) {
                await interaction.editReply({
                    embeds: [{ title: '❌ Erreur', description: err.message }]
                });
            }
        } else {
            const missing = [
                !canSend ? 'Envoyer des messages' : null,
                !canEmbed ? 'Intégrer des liens' : null,
            ].filter(Boolean).join(', ');
            await interaction.editReply({
                embeds: [{
                    title: '❌ Permissions manquantes',
                    description: safeLang('tickets.panel_missing_perms', `Je n’ai pas les permissions pour envoyer le panneau ici (${missing}).`, lang)
                }]
            });
        }
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

            // --- NOUVEAU : GÉNÉRATION DU TRANSCRIPT HTML ---
            try {
                if (guildData?.tickets?.transcriptChannelId) {
                    const transcriptChannel = interaction.guild.channels.cache.get(guildData.tickets.transcriptChannelId);
                    if (transcriptChannel) {
                        // Détection du créateur
                        let ticketCreator = "Inconnu";
                        const channelNameParts = channel.name.split('-');
                        if (channelNameParts.length > 2) {
                            ticketCreator = channelNameParts[2];
                        } else if (channelNameParts.length > 1) {
                            ticketCreator = channelNameParts[1];
                        }

                        const now = new Date();
                        const fullDate = now.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const dateFileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        
                        // 1. Détection du créateur
                        let openerName = "Utilisateur";
                        let openerMention = "Inconnu";
                        try {
                            const registryEntry = require('../../utils/ticketsRegistry').get(channel.id);
                            if (registryEntry && registryEntry.meta && registryEntry.meta.openerId) {
                                const member = await interaction.guild.members.fetch(registryEntry.meta.openerId).catch(() => null);
                                if (member) {
                                    openerName = member.user.username;
                                    openerMention = member.toString();
                                }
                            } else {
                                const parts = channel.name.split('-');
                                openerName = parts[parts.length - 1];
                            }
                        } catch (_) {}

                        const safeUserName = openerName.replace(/[^\w\s-]/gi, '').trim();
                        const finalFileName = `ticket-${safeUserName}-${dateFileName}.html`;

                        // 2. Récupération des messages
                        const messages = await channel.messages.fetch({ limit: 100 });
                        const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                        
                        // 3. Génération du LOG BRUT (Enveloppé dans un commentaire HTML pour être invisible au navigateur mais visible sur Discord)
                        let textLog = `<!-- TRANSCRIPT LOG\n`;
                        textLog += `${"Envoyé".padEnd(12)} : ${fullDate}\n`;
                        textLog += `${"Sauvegardé".padEnd(12)} : ${fullDate}\n`;
                        textLog += `${"Salon".padEnd(12)} : ${channel.name}\n`;
                        textLog += `${"Serveur".padEnd(12)} : ${interaction.guild.name}\n`;
                        textLog += `\n---------------- MESSAGE HISTORY ----------------\n\n`;

                        sortedMessages.forEach(msg => {
                            const msgDate = msg.createdAt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            textLog += `[${msg.author.tag}] : ${msgDate}\n`;
                            if (msg.content) textLog += `${msg.content}\n`;
                            if (msg.embeds.length > 0) {
                                msg.embeds.forEach(embed => {
                                    textLog += `(Embed : ${embed.title || 'Sans titre'})\n`;
                                    if (embed.description) textLog += `> ${embed.description.replace(/\n/g, '\n> ')}\n`;
                                });
                            }
                            textLog += `\n`;
                        });
                        textLog += `\n---------------- END OF LOG ----------------\n-->`;

                        // 4. Intégration du RENDERER HTML/CSS (Caché, pour navigateur)
                        const htmlAttachment = await transcript.createTranscript(channel, {
                            limit: -1,
                            fileName: finalFileName,
                            returnType: 'attachment',
                            poweredBy: false,
                            saveImages: true
                        });

                        const htmlBase = htmlAttachment.attachment.toString('utf-8');
                        
                        // On combine sans sauts de ligne excessifs pour éviter la bande blanche
                        const finalFileContent = textLog + htmlBase;

                        const buffer = Buffer.from(finalFileContent, 'utf-8');
                        const fileAttachment = { attachment: buffer, name: finalFileName };

                        // 5. Envoi STRICT
                        // Message 1 : Uniquement le fichier
                        await transcriptChannel.send({
                            files: [fileAttachment]
                        });

                        // Message 2 : Embed "Ticket Fermé"
                        const logEmbed = new EmbedBuilder()
                            .setTitle(`📕 Ticket Fermé`)
                            .setColor(0xFF0000)
                            .addFields(
                                { name: '🎫 Ticket', value: channel.name, inline: true },
                                { name: '👤 Ouvert par', value: openerMention, inline: true },
                                { name: '🔒 Fermé par', value: interaction.user.toString(), inline: true }
                            )
                            .setFooter({ text: `${interaction.guild.name} • ${fullDate}`, iconURL: interaction.guild.iconURL() });

                        await transcriptChannel.send({
                            embeds: [logEmbed]
                        });
                    }
                }
            } catch (transcriptErr) {
                console.error('[Tickets] Auto-transcript failed:', transcriptErr);
            }
            // -----------------------------------------------

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