const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../../utils/permissions');
const DatabaseManager = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un utilisateur du serveur')
        .addStringOption(option =>
            option.setName('utilisateur')
                .setDescription('ID ou nom d\'utilisateur à débannir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du débannissement')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const { getTranslation } = require('../../index');
        const guildConfig = await DatabaseManager.getGuildConfig(interaction.guild.id);
        const lang = guildConfig?.language || 'fr';
        const t = (key, ...args) => getTranslation(lang, key, ...args);

        try {
            // Vérification des permissions
            const member = interaction.member;
            const isModerator = await PermissionManager.isModerator(member, guildConfig);
            
            if (!isModerator) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Permissions insuffisantes')
                    .setDescription('Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.')
                    .setColor('#FF0000')
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const userInput = interaction.options.getString('utilisateur');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

            await interaction.deferReply();

            let targetUser = null;
            let banInfo = null;

            try {
                // Essayer de récupérer l'utilisateur par ID
                if (/^\d{17,19}$/.test(userInput)) {
                    targetUser = await interaction.client.users.fetch(userInput);
                } else {
                    // Chercher dans la liste des bannis par nom d'utilisateur
                    const bans = await interaction.guild.bans.fetch();
                    const foundBan = bans.find(ban => 
                        ban.user.username.toLowerCase().includes(userInput.toLowerCase()) ||
                        ban.user.tag.toLowerCase().includes(userInput.toLowerCase())
                    );
                    if (foundBan) {
                        targetUser = foundBan.user;
                        banInfo = foundBan;
                    }
                }

                if (!targetUser) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ Utilisateur introuvable')
                        .setDescription(`Impossible de trouver un utilisateur avec l'identifiant: \`${userInput}\``)
                        .setColor('#FF0000')
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [embed] });
                }

                // Vérifier si l'utilisateur est banni
                if (!banInfo) {
                    try {
                        banInfo = await interaction.guild.bans.fetch(targetUser.id);
                    } catch (error) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Utilisateur non banni')
                            .setDescription(`L'utilisateur ${targetUser.tag} n'est pas banni de ce serveur.`)
                            .setColor('#FFA500')
                            .setTimestamp();
                        return await interaction.editReply({ embeds: [embed] });
                    }
                }

                // Débannissement
                await interaction.guild.members.unban(targetUser.id, `${reason} | Modérateur: ${interaction.user.tag}`);

                // Enregistrement dans la base de données
                await DatabaseManager.addSanction(
                    targetUser.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'unban',
                    reason
                );

                // Message de confirmation
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Débannissement réussi')
                    .setDescription(`**${targetUser.tag}** a été débanni avec succès du serveur.`)
                    .setColor('#00FF00')
                    .setTimestamp()
                    .addFields(
                        { name: '📋 Détails du débannissement', value: '\u200B', inline: false },
                        { name: '👤 Utilisateur', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                        { name: '👮 Modérateur', value: interaction.user.tag, inline: true },
                        { name: '📝 Raison', value: reason, inline: false },
                        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `Débanni par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ embeds: [successEmbed] });

                // Log dans le canal de logs
                if (guildConfig?.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🔓 Débannissement')
                            .setDescription(
                                `**Utilisateur:** ${targetUser.tag} (${targetUser.id})\n` +
                                `**Modérateur:** ${interaction.user.tag} (${interaction.user.id})\n` +
                                `**Raison:** ${reason}\n` +
                                `**Raison du ban original:** ${banInfo?.reason || 'Inconnue'}\n` +
                                `**Horodatage:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            )
                            .setColor('#0099FF')
                            .setTimestamp();
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } catch (error) {
                console.error('Erreur lors du débannissement:', error);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Erreur lors du débannissement')
                    .setDescription(`Une erreur s'est produite: ${error.message}`)
                    .setColor('#FF0000')
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed] });
            }

        } catch (error) {
            console.error('Erreur dans la commande unban:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur inattendue')
                .setDescription('Une erreur inattendue s\'est produite. Veuillez réessayer.')
                .setColor('#FF0000')
                .setTimestamp();
            
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};