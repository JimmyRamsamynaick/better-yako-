const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const transcript = require('discord-html-transcripts');
const Guild = require('../../models/Guild');
const LanguageManager = require('../../utils/languageManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transcript')
        .setDescription('Générer un transcript du ticket actuel')
        .setDescriptionLocalizations({
            'en-US': 'Generate a transcript of the current ticket'
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const { channel, guild, user, locale } = interaction;
        const lang = locale.startsWith('fr') ? 'fr' : 'en';

        await interaction.deferReply({ ephemeral: true });

        // 1. Vérifier si le salon est un ticket (on peut vérifier via le nom ou la catégorie si configurée)
        const guildDoc = await Guild.findOne({ guildId: guild.id });
        if (!guildDoc || !guildDoc.tickets || !guildDoc.tickets.transcriptChannelId) {
            return interaction.editReply({
                content: LanguageManager.get(lang, 'transcript.error_no_channel') || '❌ Le salon des transcripts n\'est pas configuré.'
            });
        }

        const transcriptChannel = guild.channels.cache.get(guildDoc.tickets.transcriptChannelId);
        if (!transcriptChannel) {
            return interaction.editReply({
                content: LanguageManager.get(lang, 'transcript.error_no_channel') || '❌ Le salon des transcripts est introuvable.'
            });
        }

        // Optionnel: Vérifier si le salon actuel est dans la catégorie ticket
        if (guildDoc.tickets.categoryId && channel.parentId !== guildDoc.tickets.categoryId) {
            // On laisse quand même la possibilité de le faire si le staff le veut, mais on peut ajouter un check ici
        }

        await interaction.editReply({
            content: LanguageManager.get(lang, 'transcript.generating') || '⏳ Génération du transcript en cours...'
        });

        try {
            // 2. Détection du créateur du ticket (souvent stocké dans le topic ou via le nom du salon)
            // On essaie de récupérer l'user à partir du nom du salon (format classique ticket-nom ou nom-id)
            let ticketCreator = "Inconnu";
            const channelNameParts = channel.name.split('-');
            if (channelNameParts.length > 1) {
                ticketCreator = channelNameParts[1];
            }

            // 3. Formatage de la date AAAA/MM/JJ
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}/${month}/${day}`;
            const fileDateStr = `${year}-${month}-${day}`; // Pour le nom du fichier (slashs non autorisés)

            // 4. Génération du transcript HTML
            const attachment = await transcript.createTranscript(channel, {
                limit: -1, // Tous les messages
                fileName: `ticket-${ticketCreator}-${fileDateStr}.html`,
                returnType: 'attachment',
                poweredBy: false,
                saveImages: true
            });

            // 5. Envoi dans le salon de logs
            const logEmbed = new EmbedBuilder()
                .setTitle(LanguageManager.get(lang, 'transcript.log_title') || '📄 Transcript de Ticket')
                .setColor(0x5865F2)
                .addFields(
                    { name: LanguageManager.get(lang, 'transcript.log_fields.ticket_name') || 'Nom du ticket', value: channel.name, inline: true },
                    { name: LanguageManager.get(lang, 'transcript.log_fields.creator') || 'Créateur', value: ticketCreator, inline: true },
                    { name: LanguageManager.get(lang, 'transcript.log_fields.closed_by') || 'Fermé par', value: user.tag, inline: true },
                    { name: LanguageManager.get(lang, 'transcript.log_fields.date') || 'Date', value: dateStr, inline: true }
                )
                .setTimestamp();

            await transcriptChannel.send({
                embeds: [logEmbed],
                files: [attachment]
            });

            // 6. Confirmation à l'utilisateur
            await interaction.editReply({
                content: LanguageManager.get(lang, 'transcript.success', { channel: transcriptChannel.toString() }) || `✅ Transcript généré et envoyé dans ${transcriptChannel.toString()}.`
            });

        } catch (error) {
            console.error('Erreur transcript:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la génération du transcript.'
            });
        }
    }
};