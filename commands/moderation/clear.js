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
            'EnglishUS': LanguageManager.get('en', 'commands.clear.description') || 'Delete messages'
        })
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription(LanguageManager.get('fr', 'commands.clear.amount_option') || 'Nombre de messages à supprimer (1-100)')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.clear.amount_option') || 'Number of messages to delete (1-100)'
                })
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.clear.user_option') || 'Supprimer seulement les messages de cet utilisateur')
                .setDescriptionLocalizations({
                    'EnglishUS': LanguageManager.get('en', 'commands.clear.user_option') || 'Delete only messages from this user'
                })
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        // Pas de defer pour éviter l'erreur Unknown interaction

        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Vérifier les permissions de l'utilisateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const noPermEmbed = BotEmbeds.createNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...noPermEmbed,
                flags: MessageFlags.Ephemeral
            });
        }

        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const botNoPermEmbed = BotEmbeds.createBotNoPermissionEmbed(interaction.guild.id, lang);
            return interaction.reply({
                ...botNoPermEmbed,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // Récupérer les messages
            const messages = await interaction.channel.messages.fetch({ limit: targetUser ? 100 : amount });
            
            let messagesToDelete;
            if (targetUser) {
                // Filtrer les messages de l'utilisateur spécifique
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id).first(amount);
                
                if (messagesToDelete.size === 0) {
                    const errorMsg = LanguageManager.get(lang, 'clear.no_messages_found', {
                        user: targetUser.username
                    });
                    const errorEmbed = BotEmbeds.createGenericErrorEmbed(errorMsg, interaction.guild.id);
                    return interaction.reply({
                        ...errorEmbed,
                        ephemeral: true
                    });
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

                    // Créer le fichier temporaire
                    const fileName = `messages_supprimes_${interaction.guild.id}_${Date.now()}.txt`;
                    const tempDir = path.join(__dirname, '../../temp');
                    
                    // Créer le dossier temp s'il n'existe pas
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    const filePath = path.join(tempDir, fileName);
                    fs.writeFileSync(filePath, txtContent, 'utf8');

                    // Créer l'attachment
                    attachment = new AttachmentBuilder(filePath, { name: fileName });

                    // Programmer la suppression du fichier après 5 minutes
                    setTimeout(() => {
                        try {
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        } catch (err) {
                            console.error('Erreur lors de la suppression du fichier temporaire:', err);
                        }
                    }, 5 * 60 * 1000); // 5 minutes

                } catch (fileError) {
                    console.error('Erreur lors de la création du fichier .txt:', fileError);
                }
            }

            // Message de succès avec traduction
            let successMsg;
            if (targetUser) {
                successMsg = LanguageManager.get(lang, 'clear.success_user', {
                    user: interaction.user.toString(),
                    count: deleted.size,
                    target: targetUser.toString()
                });
            } else {
                successMsg = LanguageManager.get(lang, 'clear.success', {
                    user: interaction.user.toString(),
                    count: deleted.size
                });
            }

            const successEmbed = BotEmbeds.createClearSuccessEmbed(deleted.size, targetUser, interaction.guild.id, lang, interaction.user, deleted);
            
            // Envoyer la réponse avec le fichier .txt si disponible
            const replyOptions = { ...successEmbed, flags: MessageFlags.Ephemeral };
            if (attachment) {
                replyOptions.files = [attachment];
            }
            
            await interaction.reply(replyOptions);

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            const errorMsg = LanguageManager.get(lang, 'clear.error');
            if (!interaction.replied && !interaction.deferred) {
                const errorEmbed = BotEmbeds.createGenericErrorEmbed(errorMsg, interaction.guild.id);
                await interaction.reply({ ...errorEmbed, flags: MessageFlags.Ephemeral });
            }
        }
    }
};