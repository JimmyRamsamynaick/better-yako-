const { EmbedBuilder } = require('discord.js');

module.exports = {
    message_embed(title, desc, color) {
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
}