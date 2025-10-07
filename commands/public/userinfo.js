// commands/public/userinfo.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription(LanguageManager.get('fr', 'commands.userinfo.description') || 'Afficher les informations d\'un utilisateur')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.userinfo.description') || 'Show user information'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription(LanguageManager.get('fr', 'commands.userinfo.user_option') || 'L\'utilisateur dont vous voulez voir les informations')
                .setDescriptionLocalizations({
                    'en-US': LanguageManager.get('en', 'commands.userinfo.user_option') || 'The user whose information you want to see'
                })
                .setRequired(false)),
    
    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Récupérer l'utilisateur (celui spécifié ou l'auteur de la commande)
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            // Récupérer le membre du serveur
            const member = await interaction.guild.members.fetch(targetUser.id);

            // Forcer la récupération complète du User pour disposer de la bannière
            let fetchedUser = targetUser;
            try {
                fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
            } catch (fetchErr) {
                console.warn('userinfo: échec du fetch forcé du User pour la bannière:', fetchErr);
            }

            // Fallback: si la bannière est absente, tenter un fetch sur l'instance User
            try {
                const hasBanner = Boolean(fetchedUser?.banner || fetchedUser?.bannerURL?.({ size: 1024 }));
                if (!hasBanner && typeof targetUser.fetch === 'function') {
                    const refetched = await targetUser.fetch(true);
                    if (refetched) fetchedUser = refetched;
                }
            } catch (fallbackErr) {
                console.warn('userinfo: fallback user.fetch(true) a échoué:', fallbackErr);
            }

            const userInfoEmbed = await BotEmbeds.createUserInfoEmbed(
                fetchedUser,
                member,
                interaction.guild.id,
                lang
            );
            
            await interaction.reply(userInfoEmbed);
        } catch (error) {
            console.error('Erreur lors de la récupération des informations de l\'utilisateur:', error);
            
            // Si l'utilisateur n'est pas dans le serveur
            if (error.code === 10007 || error.code === 10013) {
                const notInServerMsg = LanguageManager.get(lang, 'commands.userinfo.user_not_in_server') || 'Cet utilisateur n\'est pas dans ce serveur.';
                await interaction.reply({ 
                    content: notInServerMsg, 
                    ephemeral: true 
                });
            } else {
                const errorMsg = LanguageManager.get(lang, 'errors.command_error') || 'Une erreur est survenue lors de l\'exécution de cette commande.';
                await interaction.reply({ 
                    content: errorMsg, 
                    ephemeral: true 
                });
            }
        }
    }
};