// commands/public/vote.js
const { SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');

const TOPGG_URL = 'https://top.gg/fr/bot/1396411539648544809/vote';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription(LanguageManager.get('fr', 'commands.vote.description') || 'Voter pour le bot sur Top.gg')
        .setDescriptionLocalizations({
            'en-US': LanguageManager.get('en', 'commands.vote.description') || 'Vote for the bot on Top.gg'
        }),

    async execute(interaction) {
        // Récupérer la langue du serveur
        const guildData = await Guild.findOne({ guildId: interaction.guild.id });
        const lang = guildData?.language || 'fr';

        // Créer un message d'information (éphémère) avec un bouton lien
        const infoPayload = await ComponentsV3.infoEmbed(
            interaction.guild.id,
            'commands.vote.title',
            'commands.vote.content',
            { url: TOPGG_URL },
            true,
            lang
        );

        const buttonRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    style: 5, // Link button
                    label: LanguageManager.get(lang, 'commands.vote.button_label') || (lang === 'en' ? 'Vote on Top.gg' : 'Voter sur Top.gg'),
                    url: TOPGG_URL,
                    emoji: { name: '⭐' }
                }
            ]
        };

        // Insérer le bouton dans le container Components V3 (type 17)
        const payload = { ...infoPayload };
        if (payload.components && payload.components[0] && payload.components[0].type === 17) {
            payload.components[0].components.push(buttonRow);
        } else {
            payload.components = [{ type: 17, components: [ buttonRow ] }];
        }

        await interaction.reply(payload);
    }
};