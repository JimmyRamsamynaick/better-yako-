const { EmbedBuilder } = require('discord.js');

module.exports = {
    error_embed(error) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: "By Sweizeur",
                url: "https://github.com/Sweizeur/",
                iconURL: "https://avatars.githubusercontent.com/u/49610307?v=4",
            })
            .setTitle("Erreur")
            .setDescription(error)
            .addFields(
                {
                    name: "",
                    value: "---------------------------------------------------------------------",
                    inline: false
                },
            )
            .setImage("https://media.tenor.com/qZatoBrJlZ0AAAAM/sons-of-the-forest-the-forest.gif")
            .setColor("#6f0202")
            .setFooter({
                text: "Kelvin Protect",
                iconURL: "https://media.discordapp.net/attachments/1213933072953770065/1216046029624053810/Kelvin_protection.png?ex=6608309e&is=65f5bb9e&hm=cd0903497c8a0c8caa93114cfc8ca51d6b6450b2f577bb63bf4246786bc3f777&=&format=webp&quality=lossless&width=864&height=889",
            })
            .setTimestamp();

        return embed;
    }
}