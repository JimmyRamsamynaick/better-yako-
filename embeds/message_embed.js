const { EmbedBuilder } = require('discord.js');

module.exports = {
    message_embed(title, desc, color) {
        if (!title || typeof title !== 'string') {
            throw new Error("Le titre (title) doit être une chaîne de caractères valide.");
        }
        if (!desc || typeof desc !== 'string') {
            throw new Error("La description (desc) doit être une chaîne de caractères valide.");
        }
        if (!color || typeof color !== 'string') {
            throw new Error("La couleur (color) doit être une chaîne de caractères valide.");
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setFooter({
                text: "By Sweizeur",
                iconURL: "https://github.com/Sweizeur/",
            })
            .setTimestamp();

        return embed;
    }
};
