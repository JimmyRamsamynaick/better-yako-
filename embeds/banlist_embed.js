const { EmbedBuilder } = require('discord.js');

module.exports = {
    banlist_embed(values) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: "By Sweizeur",
                url: "https://github.com/Sweizeur/",
                iconURL: "https://avatars.githubusercontent.com/u/49610307?v=4",
            })
            .setTitle("Banlist")
            .setDescription("Voici la liste des mots bannis par le serveur.")
            .addFields(
                {
                    name: "Mots bannis:",
                    value: values,
                    inline: false
                },
            )
            .setImage("https://static0.gamerantimages.com/wordpress/wp-content/uploads/2023/03/sons-of-the-forest-kelvin.jpg")
            .setColor("#66a8ff")
            .setFooter({
                text: "Kelvin Protect",
                iconURL: "https://media.discordapp.net/attachments/1213933072953770065/1216046029624053810/Kelvin_protection.png?ex=6608309e&is=65f5bb9e&hm=cd0903497c8a0c8caa93114cfc8ca51d6b6450b2f577bb63bf4246786bc3f777&=&format=webp&quality=lossless&width=864&height=889",
            })
            .setTimestamp();

        return embed;
    }
}