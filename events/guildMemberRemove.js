const { EmbedBuilder, Colors } = require('discord.js');
const DatabaseManager = require('../utils/database');
const Logger = require('../utils/logger');
const { getTranslation } = require('../index');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        try {
            const guild = member.guild;
            const guildConfig = await DatabaseManager.getGuildConfig(guild.id);
            
            if (!guildConfig) {
                console.warn(`Configuration introuvable pour le serveur ${guild.name}`);
                return;
            }

            // Calculer la durée de présence sur le serveur
            const joinedAt = member.joinedAt;
            const timeOnServer = joinedAt ? Date.now() - joinedAt.getTime() : null;
            
            let timeOnServerText = 'Inconnu';
            if (timeOnServer) {
                const days = Math.floor(timeOnServer / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeOnServer % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                if (days > 0) {
                    timeOnServerText = `${days} jour${days > 1 ? 's' : ''}${hours > 0 ? ` et ${hours} heure${hours > 1 ? 's' : ''}` : ''}`;
                } else if (hours > 0) {
                    timeOnServerText = `${hours} heure${hours > 1 ? 's' : ''}`;
                } else {
                    const minutes = Math.floor((timeOnServer % (1000 * 60 * 60)) / (1000 * 60));
                    timeOnServerText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
                }
            }

            // Log du départ du membre
            await Logger.logUser(guild, 'leave', member.user, `Temps sur le serveur: ${timeOnServerText}`);

            // Vérifier si le canal de départ est configuré (peut être le même que celui de bienvenue)
            const leaveChannelId = guildConfig.leaveChannelId || guildConfig.welcomeChannelId;
            if (!leaveChannelId) {
                return; // Pas de canal de départ configuré
            }

            const leaveChannel = guild.channels.cache.get(leaveChannelId);
            if (!leaveChannel || !leaveChannel.isTextBased()) {
                console.warn(`Canal de départ introuvable ou invalide pour ${guild.name}`);
                return;
            }

            // Obtenir les traductions
            const lang = guildConfig.language || 'fr';
            const translations = getTranslation(lang);

            // Créer le message de départ personnalisé ou utiliser celui par défaut
            let leaveMessage = guildConfig.leaveMessage || translations.leave.default_message;
            
            // Remplacer les variables dans le message
            leaveMessage = leaveMessage
                .replace('{user}', member.user.username)
                .replace('{username}', member.user.username)
                .replace('{server}', guild.name)
                .replace('{memberCount}', guild.memberCount.toString())
                .replace('{timeOnServer}', timeOnServerText);

            // Créer l'embed de départ
            const leaveEmbed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle(`${translations.leave.title} 👋`)
                .setDescription(leaveMessage)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: translations.leave.member_info,
                        value: `👤 ${member.user.tag}\n🆔 ${member.id}\n⏱️ ${translations.leave.time_on_server}: ${timeOnServerText}`,
                        inline: true
                    },
                    {
                        name: translations.leave.server_info,
                        value: `👥 ${translations.leave.remaining_members}: ${guild.memberCount}\n📅 ${translations.leave.joined_at}: ${joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>` : 'Inconnu'}`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: translations.leave.footer,
                    iconURL: guild.iconURL({ dynamic: true }) 
                })
                .setTimestamp();

            // Ajouter les rôles que le membre avait
            if (member.roles.cache.size > 1) { // Exclure @everyone
                const roles = member.roles.cache
                    .filter(role => role.id !== guild.id) // Exclure @everyone
                    .map(role => role.name)
                    .slice(0, 10) // Limiter à 10 rôles pour éviter les messages trop longs
                    .join(', ');
                
                if (roles) {
                    leaveEmbed.addFields({
                        name: translations.leave.roles,
                        value: roles + (member.roles.cache.size > 11 ? '...' : ''),
                        inline: false
                    });
                }
            }

            // Envoyer le message de départ
            await leaveChannel.send({ embeds: [leaveEmbed] });

            // Nettoyer les données du membre (avertissements, sanctions expirées, etc.)
            if (guildConfig.cleanupOnLeave) {
                try {
                    // Supprimer les avertissements actifs (optionnel)
                    const warnings = await DatabaseManager.getUserWarnings(member.id, guild.id);
                    if (warnings.length > 0) {
                        await Logger.logInfo(guild, 'Nettoyage automatique', 
                            `${warnings.length} avertissement(s) supprimé(s) pour ${member.user.tag} suite à son départ`);
                        
                        // Marquer les avertissements comme inactifs
                        for (const warning of warnings) {
                            await DatabaseManager.removeWarning(warning._id);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors du nettoyage des données du membre:', error);
                }
            }

        } catch (error) {
            console.error('Erreur dans l\'événement guildMemberRemove:', error);
            
            // Log de l'erreur
            try {
                await Logger.logError(member.guild, error, 'Événement guildMemberRemove');
            } catch (logError) {
                console.error('Erreur lors du log de l\'erreur:', logError);
            }
        }
    }
};