// commands/moderation/unban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannit un utilisateur du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option.setName('utilisateur')
                .setDescription('ID ou nom#discriminant de l\'utilisateur à débannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du débannissement')
                .setRequired(false)),

    async execute(interaction, client, getTranslation) {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: '❌ Vous n\'avez pas la permission de débannir des membres.',
                ephemeral: true
            });
        }

        const userInput = interaction.options.getString('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

        try {
            await interaction.deferReply();

            // Récupérer la liste des bans
            const bans = await interaction.guild.bans.fetch();
            let userToUnban = null;

            // Rechercher l'utilisateur par ID ou par nom#discriminant
            if (/^\d{17,19}$/.test(userInput)) {
                // C'est un ID
                userToUnban = bans.get(userInput);
            } else {
                // Recherche par nom#discriminant ou nom d'utilisateur
                userToUnban = bans.find(ban =>
                    ban.user.tag.toLowerCase().includes(userInput.toLowerCase()) ||
                    ban.user.username.toLowerCase().includes(userInput.toLowerCase())
                );
            }

            if (!userToUnban) {
                const embed = new EmbedBuilder()
                    .setColor('#ff8c00')
                    .setTitle('⚠️ Utilisateur introuvable')
                    .setDescription('Aucun utilisateur banni trouvé avec ce nom ou cet ID.')
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Débannir l'utilisateur
            await interaction.guild.members.unban(userToUnban.user.id, `${interaction.user.tag}: ${reason}`);

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Utilisateur débanni')
                .setDescription(`**${userToUnban.user.username}** a été débanni du serveur.`)
                .addFields([
                    {
                        name: 'Utilisateur',
                        value: `${userToUnban.user.tag} (${userToUnban.user.id})`,
                        inline: true
                    },
                    {
                        name: 'Modérateur',
                        value: interaction.user.tag,
                        inline: true
                    },
                    {
                        name: 'Raison du ban original',
                        value: userToUnban.reason || 'Aucune raison fournie',
                        inline: false
                    },
                    {
                        name: 'Raison du déban',
                        value: reason,
                        inline: false
                    }
                ])
                .setThumbnail(userToUnban.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: 'Yako Bot',
                    iconURL: client.user.displayAvatarURL()
                });

            await interaction.editReply({ embeds: [embed] });

            // Log dans le salon de logs si configuré
            const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
            if (logChannel) {
                logChannel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Erreur lors du déban:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur s\'est produite lors du débannissement.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    category: 'Modération'
};