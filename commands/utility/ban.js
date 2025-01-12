const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../embeds/embeds').embeds;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à bannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du bannissement')
                .setRequired(false)),
    async execute(ctx) {
        const user = ctx.options.getUser('utilisateur');
        const reason = ctx.options.getString('raison') || 'Aucune raison spécifiée';
        const color = '#FF0000'; // Couleur rouge pour le message embed

        const member = await ctx.guild.members.fetch(ctx.user.id);
        if (!member.permissions.has('ADMINISTRATOR')) {
            return ctx.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.' });
        }

        // Répondre rapidement à l'interaction
        await ctx.reply({ content: 'Commande en cours de traitement...', ephemeral: true });

        try {
            const targetMember = await ctx.guild.members.fetch(user.id);
            try {
                await targetMember.send(`Vous avez été banni du serveur ${ctx.guild.name} pour la raison suivante : ${reason}`);
            } catch (sendError) {
                if (sendError.code === 50007) {
                    console.warn('Impossible d\'envoyer un message à cet utilisateur.');
                } else {
                    throw sendError;
                }
            }
            await targetMember.ban({ reason });

            await ctx.followUp({ embeds: [embeds['message'].message_embed(`${user.tag} banni`, `${user.tag} a été banni avec succès pour la raison suivante : ${reason}`, color)] });
        } catch (error) {
            console.error('Erreur lors du bannissement de l\'utilisateur:', error);
            return ctx.followUp({ content: 'Une erreur est survenue lors du bannissement de cet utilisateur.' });
        }
    }
};
