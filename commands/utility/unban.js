const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../embeds/embeds').embeds;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un utilisateur')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('L\'ID de l\'utilisateur à débannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du débannissement')
                .setRequired(false)),
    async execute(ctx) {
        const userId = ctx.options.getString('user_id');
        const reason = ctx.options.getString('raison') || 'Aucune raison spécifiée';
        const color = '#00FF00'; // Couleur verte pour le message embed

        const member = await ctx.guild.members.fetch(ctx.user.id);
        if (!member.permissions.has('ADMINISTRATOR')) {
            return ctx.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.' });
        }

        // Répondre rapidement à l'interaction
        await ctx.reply({ content: 'Commande en cours de traitement...', flags: 64 });

        try {
            const bans = await ctx.guild.bans.fetch();
            const banInfo = bans.find(ban => ban.user.id === userId);
            if (!banInfo) {
                return ctx.followUp({ content: 'Cet utilisateur n\'est pas banni.' });
            }

            try {
                const user = await ctx.client.users.fetch(userId);
                await user.send(`Vous allez être débanni du serveur ${ctx.guild.name} pour la raison suivante : ${reason}`);
            } catch (sendError) {
                if (sendError.code === 50007) {
                    console.warn('Impossible d\'envoyer un message à cet utilisateur. L\'utilisateur sera débanni.');
                } else {
                    throw sendError;
                }
            }

            await ctx.guild.bans.remove(userId, reason);

            try {
                const user = await ctx.client.users.fetch(userId);
                await user.send(`Vous avez été débanni du serveur ${ctx.guild.name} pour la raison suivante : ${reason}`);
            } catch (sendError) {
                if (sendError.code === 50007) {
                    console.warn('Impossible d\'envoyer un message à cet utilisateur après le débannissement.');
                } else {
                    throw sendError;
                }
            }

            await ctx.followUp({ embeds: [embeds['message'].message_embed(`Utilisateur débanni`, `L'utilisateur avec l'ID ${userId} a été débanni avec succès pour la raison suivante : ${reason}`, color)] });
        } catch (error) {
            console.error('Erreur lors du débannissement de l\'utilisateur:', error);
            return ctx.followUp({ content: 'Une erreur est survenue lors du débannissement de cet utilisateur.' });
        }
    }
};
