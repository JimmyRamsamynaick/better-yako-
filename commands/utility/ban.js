const { SlashCommandBuilder } = require('discord.js');
const { adminID } = process.env;
const embeds = require('../../embeds/embeds').embeds;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à bannir')
                .setRequired(true)),
    async execute(ctx) {
        const user = ctx.options.getUser('utilisateur');

        if (ctx.user.id !== adminID) {
            return ctx.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
        }

        try {
            const member = await ctx.guild.members.fetch(user.id);
            await member.ban();
            ctx.reply({ embeds: [embeds['message'].message_embed(`${user.tag} a été banni avec succès !`)], ephemeral: true });
        } catch (error) {
            console.error('Erreur lors du bannissement de l\'utilisateur:', error);
            ctx.reply({ content: 'Une erreur est survenue lors du bannissement de cet utilisateur.', ephemeral: true });
        }
    }
};
