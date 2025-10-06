// commands/moderation/clear.js
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, AttachmentBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription(LanguageManager.get('fr', 'commands.clear.description') || 'Supprimer des messages')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.clear.description') || 'Delete messages'
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription(LanguageManager.get('fr', 'commands.clear.amount_option') || 'Nombre de messages à supprimer (1-100)')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.clear.amount_option') || 'Number of messages to delete (1-100)'
                })
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.clear.user_option') || 'Supprimer seulement les messages de cet utilisateur')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.clear.user_option') || 'Delete only messages from this user'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        // Déférer la réponse pour éviter l'expiration de l'interaction (10062)
        // Utiliser les flags pour l'éphemère (au lieu de "ephemeral" déprécié)
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        } catch (e) {
            // Si déjà déféré ou répondu, ignorer
        }

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const noPermMessage = LanguageManager.get(lang, 'errors.no_permission') || '❌ Vous n\'avez pas la permission d\'utiliser cette commande.';
            return interaction.editReply({ content: noPermMessage });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const botNoPermMessage = LanguageManager.get(lang, 'errors.bot_no_permission') || '❌ Le bot n\'a pas les permissions nécessaires.';
            return interaction.editReply({ content: botNoPermMessage });
        }

        try {
            // Récupérer les messages
            const messages = await interaction.channel.messages.fetch({ limit: targetUser ? 100 : amount });
            
            let messagesToDelete;
            if (targetUser) {
                // Filtrer les messages de l'utilisateur spécifique
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
                
                if (messagesToDelete.size === 0) {
                    const errorMsg = LanguageManager.get(lang, 'commands.clear.no_messages_found', {
                        user: targetUser.username
                    }) || `Aucun message trouvé pour ${targetUser.username} dans les 100 derniers messages.`;
                    return interaction.editReply({ content: `❌ ${errorMsg}` });
                }
            } else {
                // Prendre les X derniers messages
                messagesToDelete = messages.first(amount);
            }

            // Supprimer les messages
            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

            // Générer le fichier .txt avec les messages supprimés
            let attachment = null;
            if (deleted.size > 0) {
                try {
                    // Traductions pour le fichier .txt
                    const serverLabel = LanguageManager.get(lang, 'common.server') || 'Serveur';
                    const channelLabel = LanguageManager.get(lang, 'common.channel') || 'Canal';
                    const moderatorLabel = LanguageManager.get(lang, 'common.moderator') || 'Modérateur';
                    const dateLabel = LanguageManager.get(lang, 'common.date') || 'Date';
                    const messageCountLabel = LanguageManager.get(lang, 'common.message_count') || 'Nombre de messages';
                    const targetedUserLabel = LanguageManager.get(lang, 'common.targeted_user') || 'Utilisateur ciblé';
                    const noContentLabel = LanguageManager.get(lang, 'common.no_content') || '[Message sans contenu texte]';
                    const attachmentsLabel = lang === 'en' ? 'Attachments' : 'Pièces jointes';
                    const embedsLabel = lang === 'en' ? 'Embeds' : 'Embeds';
                    const deletedMessagesTitle = lang === 'en' ? '=== DELETED MESSAGES ===' : '=== MESSAGES SUPPRIMÉS ===';
                    
                    // Créer le contenu du fichier .txt
                    let txtContent = `${deletedMessagesTitle}\n`;
                    txtContent += `${serverLabel}: ${interaction.guild.name}\n`;
                    txtContent += `${channelLabel}: #${interaction.channel.name}\n`;
                    txtContent += `${moderatorLabel}: ${interaction.user.tag} (${interaction.user.id})\n`;
                    txtContent += `${dateLabel}: ${new Date().toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}\n`;
                    txtContent += `${messageCountLabel}: ${deleted.size}\n`;
                    if (targetUser) {
                        txtContent += `${targetedUserLabel}: ${targetUser.tag} (${targetUser.id})\n`;
                    }
                    txtContent += `\n${'='.repeat(50)}\n\n`;

                    // Ajouter chaque message supprimé
                    const sortedMessages = Array.from(deleted.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                    sortedMessages.forEach((message, index) => {
                        txtContent += `[${index + 1}] ${message.author.tag} (${message.author.id})\n`;
                        txtContent += `${dateLabel}: ${message.createdAt.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR')}\n`;
                        txtContent += `${lang === 'en' ? 'Content' : 'Contenu'}: ${message.content || noContentLabel}\n`;
                        
                        if (message.attachments.size > 0) {
                            txtContent += `${attachmentsLabel}:\n`;
                            message.attachments.forEach(att => {
                                txtContent += `  - ${att.name} (${att.url})\n`;
                            });
                        }
                        
                        if (message.embeds.length > 0) {
                            txtContent += `${embedsLabel}: ${message.embeds.length} embed(s)\n`;
                        }
                        
                        txtContent += `\n${'-'.repeat(30)}\n\n`;
                    });

                    // Créer l'attachment directement depuis le buffer
                    const fileName = `messages_supprimes_${interaction.guild.id}_${Date.now()}.txt`;
                    attachment = new AttachmentBuilder(Buffer.from(txtContent, 'utf8'), { name: fileName });

                } catch (fileError) {
                    console.error('Erreur lors de la création du fichier .txt:', fileError);
                }
            }

            // Message de succès avec traduction
            let successMsg;
            if (targetUser) {
                successMsg = LanguageManager.get(lang, 'commands.clear.success_user', {
                    user: interaction.user.toString(),
                    count: deleted.size,
                    target: targetUser.toString()
                }) || `${interaction.user.toString()} a supprimé ${deleted.size} message(s) de ${targetUser.toString()}`;
            } else {
                successMsg = LanguageManager.get(lang, 'commands.clear.success', {
                    user: interaction.user.toString(),
                    count: deleted.size
                }) || `${interaction.user.toString()} a supprimé ${deleted.size} message(s)`;
            }

            // Envoyer la réponse simple, éphemère, avec fichier si disponible
            const replyOptions = { content: `✅ ${successMsg}` };
            if (attachment) {
                replyOptions.files = [attachment];
            }
            await interaction.editReply(replyOptions);

            // Ne pas envoyer le fichier au salon de logs pour revenir au comportement de base

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            const errorMsg = LanguageManager.get(lang, 'commands.clear.error') || 'Une erreur est survenue lors de la suppression des messages';
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ ${errorMsg}`, flags: MessageFlags.Ephemeral });
            } else {
                try {
                    await interaction.editReply({ content: `❌ ${errorMsg}` });
                } catch (_) {}
            }
    }
    }
};