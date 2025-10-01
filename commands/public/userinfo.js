// commands/public/userinfo.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const BotEmbeds = require('../../utils/embeds');
const LanguageManager = require('../../utils/languageManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Afficher les informations d\'un utilisateur')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('L\'utilisateur dont vous voulez voir les informations')
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
            
            const userInfoEmbed = await BotEmbeds.createUserInfoEmbed(
                targetUser,
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