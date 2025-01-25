const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const embeds = require('../../embeds/embeds').embeds;


module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Muter un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à muter')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('durée')
                .setDescription('La durée du mute en secondes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du mute')
                .setRequired(false)),
    async execute(ctx) {
        const user = ctx.options.getUser('utilisateur');
        const duration = ctx.options.getInteger('durée');
        const reason = ctx.options.getString('raison') || 'Aucune raison spécifiée';
        const color = '#FFA500'; // Couleur orange pour le message embed

        const member = await ctx.guild.members.fetch(ctx.user.id);
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return ctx.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.' });
        }

        // Répondre rapidement à l'interaction
        await ctx.reply({ content: 'Commande en cours de traitement...', ephemeral: true });

        try {
            const targetMember = await ctx.guild.members.fetch(user.id);
            const durationString = calculateDurationString(duration);

            await sendPrivateMessage(targetMember, ctx.guild.name, durationString, reason);
            await muteMember(ctx.guild, targetMember, duration, reason);

            await ctx.followUp({ embeds: [embeds['message'].message_embed(`${user.tag} mute`, `${user.tag} a été mute avec succès pour la durée suivante : ${durationString}. Raison : ${reason}`, color)] });
        } catch (error) {
            console.error('Erreur lors du mute de l\'utilisateur:', error);
            return ctx.followUp({ content: 'Une erreur est survenue lors du mute de cet utilisateur.' });
        }
    }
};

function calculateDurationString(duration) {
    const seconds = duration % 60;
    const minutes = Math.floor((duration / 60) % 60);
    const hours = Math.floor((duration / 3600) % 24);
    const days = Math.floor(duration / 86400);

    return `${days} jours, ${hours} heures, ${minutes} minutes, et ${seconds} secondes`;
}

async function sendPrivateMessage(targetMember, guildName, durationString, reason) {
    try {
        await targetMember.send(`Vous avez été mute du serveur ${guildName} pour la durée suivante : ${durationString}. Raison : ${reason}`);
    } catch (sendError) {
        if (sendError.code === 50007) {
            console.warn('Impossible d\'envoyer un message à cet utilisateur.');
        } else {
            throw sendError;
        }
    }
}

async function muteMember(guild, targetMember, duration, reason) {
    for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased()) {
            await channel.permissionOverwrites.edit(targetMember, {
                [PermissionsBitField.Flags.SendMessages]: false
            }, { reason });
        }
    }

    setTimeout(async () => {
        try {
            for (const channel of guild.channels.cache.values()) {
                if (channel.isTextBased()) {
                    await channel.permissionOverwrites.edit(targetMember, {
                        [PermissionsBitField.Flags.SendMessages]: null
                    }, { reason: 'Mute terminé' });
                }
            }
            await targetMember.send(`Votre mute sur le serveur ${guild.name} est terminé.`);
        } catch (error) {
            console.error('Erreur lors du démutage de l\'utilisateur:', error);
        }
    }, duration * 1000);
}
