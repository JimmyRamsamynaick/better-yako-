// commands/info/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste des commandes disponibles')
        .addStringOption(option =>
            option.setName('commande')
                .setDescription('Commande spécifique pour laquelle obtenir de l\'aide')
                .setRequired(false)),

    async execute(interaction, client, getTranslation) {
        const commandName = interaction.options.getString('commande');

        if (!commandName) {
            // Afficher toutes les commandes
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📖 Aide - Yako Bot')
                .setDescription('Voici toutes les commandes disponibles :')
                .setThumbnail(client.user.displayAvatarURL());

            // Organiser les commandes par catégorie
            const categories = {
                'Modération': [],
                'Utilitaires': [],
                'Informations': []
            };

            client.commands.forEach(command => {
                const category = command.category || 'Autres';
                if (!categories[category]) categories[category] = [];
                categories[category].push(`</${command.data.name}:0> - ${command.data.description}`);
            });

            // Ajouter les catégories à l'embed
            Object.entries(categories).forEach(([category, commands]) => {
                if (commands.length > 0) {
                    embed.addFields({
                        name: category,
                        value: commands.join('\n'),
                        inline: false
                    });
                }
            });

            embed.setFooter({
                text: 'Utilisez /help [commande] pour plus d\'informations',
                iconURL: client.user.displayAvatarURL()
            });

            return interaction.reply({ embeds: [embed] });
        }

        // Afficher l'aide pour une commande spécifique
        const command = client.commands.get(commandName);

        if (!command) {
            return interaction.reply({
                content: `❌ Commande \`${commandName}\` introuvable.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📖 Aide - /${command.data.name}`)
            .setDescription(command.data.description)
            .addFields(
                { name: 'Utilisation', value: `</${command.data.name}:0>`, inline: false }
            );

        if (command.data.options && command.data.options.length > 0) {
            const options = command.data.options.map(opt =>
                `\`${opt.name}\` - ${opt.description} ${opt.required ? '(requis)' : '(optionnel)'}`
            ).join('\n');

            embed.addFields({ name: 'Options', value: options, inline: false });
        }

        interaction.reply({ embeds: [embed] });
    },

    category: 'Informations'
};
