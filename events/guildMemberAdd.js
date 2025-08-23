const { EmbedBuilder, Colors } = require('discord.js');
const DatabaseManager = require('../utils/database');
const Logger = require('../utils/logger');
const { getTranslation } = require('../index');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const guild = member.guild;
            const guildConfig = await DatabaseManager.getGuildConfig(guild.id);
            
            if (!guildConfig) {
                console.warn(`Configuration introuvable pour le serveur ${guild.name}`);
                return;
            }

            // Log de l'arrivée du membre
            await Logger.logUser(guild, 'join', member.user, `Membre #${guild.memberCount}`);

            // Vérifier si le canal de bienvenue est configuré
            if (!guildConfig.welcomeChannelId) {
                return; // Pas de canal de bienvenue configuré
            }

            const welcomeChannel = guild.channels.cache.get(guildConfig.welcomeChannelId);
            if (!welcomeChannel || !welcomeChannel.isTextBased()) {
                console.warn(`Canal de bienvenue introuvable ou invalide pour ${guild.name}`);
                return;
            }

            // Obtenir les traductions
            const lang = guildConfig.language || 'fr';
            const translations = getTranslation(lang);

            // Créer le message de bienvenue personnalisé ou utiliser celui par défaut
            let welcomeMessage = guildConfig.welcomeMessage || translations.welcome.default_message;
            
            // Remplacer les variables dans le message
            welcomeMessage = welcomeMessage
                .replace('{user}', `<@${member.id}>`)
                .replace('{username}', member.user.username)
                .replace('{server}', guild.name)
                .replace('{memberCount}', guild.memberCount.toString())
                .replace('{mention}', `<@${member.id}>`);

            // Créer l'embed de bienvenue
            const welcomeEmbed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle(`${translations.welcome.title} ${guild.name}! 🎉`)
                .setDescription(welcomeMessage)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: translations.welcome.member_info,
                        value: `👤 ${member.user.tag}\n🆔 ${member.id}\n📅 ${translations.welcome.account_created}: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: translations.welcome.server_info,
                        value: `👥 ${translations.welcome.total_members}: ${guild.memberCount}\n📊 ${translations.welcome.member_number}: #${guild.memberCount}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: translations.welcome.footer,
                    iconURL: guild.iconURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Ajouter une image de bannière si configurée
            if (guild.banner) {
                welcomeEmbed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
            }

            // Envoyer le message de bienvenue
            await welcomeChannel.send({ 
                content: `<@${member.id}>`, // Mention pour notifier
                embeds: [welcomeEmbed] 
            });

            // Assigner automatiquement des rôles si configurés
            if (guildConfig.autoRoles && guildConfig.autoRoles.length > 0) {
                try {
                    const rolesToAdd = guildConfig.autoRoles
                        .map(roleId => guild.roles.cache.get(roleId))
                        .filter(role => role && role.position < guild.members.me.roles.highest.position);

                    if (rolesToAdd.length > 0) {
                        await member.roles.add(rolesToAdd);
                        
                        // Log de l'attribution automatique des rôles
                        const roleNames = rolesToAdd.map(role => role.name).join(', ');
                        await Logger.logUser(guild, 'role_add', member.user, `Rôles automatiques ajoutés: ${roleNames}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'attribution des rôles automatiques:', error);
                    await Logger.logError(guild, error, 'Attribution des rôles automatiques');
                }
            }

            // Envoyer un message privé de bienvenue si configuré
            if (guildConfig.welcomeDM && guildConfig.welcomeDMMessage) {
                try {
                    let dmMessage = guildConfig.welcomeDMMessage
                        .replace('{user}', member.user.username)
                        .replace('{server}', guild.name);

                    const dmEmbed = new EmbedBuilder()
                        .setColor(Colors.Blue)
                        .setTitle(`${translations.welcome.dm_title} ${guild.name}! 💌`)
                        .setDescription(dmMessage)
                        .setThumbnail(guild.iconURL({ dynamic: true }))
                        .setFooter({ text: translations.welcome.dm_footer })
                        .setTimestamp();

                    await member.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // L'utilisateur a peut-être désactivé les MPs
                    console.log(`Impossible d'envoyer un MP de bienvenue à ${member.user.tag}`);
                }
            }

        } catch (error) {
            console.error('Erreur dans l\'événement guildMemberAdd:', error);
            
            // Log de l'erreur
            try {
                await Logger.logError(member.guild, error, 'Événement guildMemberAdd');
            } catch (logError) {
                console.error('Erreur lors du log de l\'erreur:', logError);
            }
        }
    }
};