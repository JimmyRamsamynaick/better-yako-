// commands/moderation/purge.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Supprime des messages selon différents critères')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('Supprime un nombre spécifié de messages')
                .addIntegerOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre de messages à supprimer (1-100)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Supprime les messages d\'un utilisateur spécifique')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('Utilisateur dont les messages doivent être supprimés')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre de messages à vérifier (1-100)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bots')
                .setDescription('Supprime les messages des bots')
                .addIntegerOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre de messages à vérifier (1-100)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('embeds')
                .setDescription('Supprime les messages contenant des embeds')
                .addIntegerOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre de messages à vérifier (1-100)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('contains')
                .setDescription('Supprime les messages contenant un texte spécifique')
                .addStringOption(option =>
                    option.setName('texte')
                        .setDescription('Texte à rechercher dans les messages')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre de messages à vérifier (1-100)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100))),

    async execute(interaction, client, getTranslation) {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de supprimer des messages.',
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas la permission de supprimer des messages.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const maxMessages = interaction.options.getInteger('nombre') || 50;

        try {
            await interaction.deferReply({ ephemeral: true });

            // Récupérer les messages
            const messages = await interaction.channel.messages.fetch({ limit: maxMessages });
            let messagesToDelete = [];

            switch (subcommand) {
                case 'all':
                    messagesToDelete = Array.from(messages.values());
                    break;

                case 'user':
                    const targetUser = interaction.options.getUser('utilisateur');
                    messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
                    break;

                case 'bots':
                    messagesToDelete = messages.filter(msg => msg.author.bot);
                    break;

                case 'embeds':
                    messagesToDelete = messages.filter(msg => msg.embeds.length > 0);
                    break;

                case 'contains':
                    const searchText = interaction.options.getString('texte').toLowerCase();
                    messagesToDelete = messages.filter(msg =>
                        msg.content.toLowerCase().includes(searchText)
                    );
                    break;
            }

            // Filtrer les messages de plus de 14 jours
            const filteredMessages = messagesToDelete.filter(msg =>
                Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
            );

            if (filteredMessages.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff8c00')
                    .setTitle('⚠️ Aucun message trouvé')
                    .setDescription('Aucun message correspondant aux critères n\'a été trouvé ou tous les messages sont trop anciens.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Supprimer les messages
            const deletedMessages = await interaction.channel.bulkDelete(filteredMessages, true);

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🗑️ Messages supprimés')
                .setDescription(`**${deletedMessages.size}** message(s) supprimé(s) avec succès.`)
                .addFields([
                    {
                        name: 'Type de suppression',
                        value: this.getSubcommandDescription(subcommand, interaction.options),
                        inline: true
                    },
                    {
                        name: 'Modérateur',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Salon',
                        value: interaction.channel.toString(),
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [embed] });

            // Log dans le salon de logs si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ffa500')
                    .setTitle('🗑️ Purge effectuée')
                    .addFields([
                        {
                            name: 'Modérateur',
                            value: `${interaction.user.tag} (${interaction.user.id})`,
                            inline: true
                        },
                        {
                            name: 'Salon',
                            value: interaction.channel.toString(),
                            inline: true
                        },
                        {
                            name: 'Messages supprimés',
                            value: deletedMessages.size.toString(),
                            inline: true
                        },
                        {
                            name: 'Type',
                            value: this.getSubcommandDescription(subcommand, interaction.options),
                            inline: false
                        }
                    ])
                    .setTimestamp();

                logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Erreur lors de la purge:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur s\'est produite lors de la suppression des messages.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    getSubcommandDescription(subcommand, options) {
        switch (subcommand) {
            case 'all':
                return `Tous les messages (${options.getInteger('nombre')})`;
            case 'user':
                return `Messages de ${options.getUser('utilisateur').tag}`;
            case 'bots':
                return 'Messages des bots';
            case 'embeds':
                return 'Messages avec embeds';
            case 'contains':
                return `Messages contenant "${options.getString('texte')}"`;
            default:
                return 'Type inconnu';
        }
    },

    category: 'Modération'
};