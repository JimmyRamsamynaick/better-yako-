const { PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('./database');

class PermissionManager {
    /**
     * Vérifie si un utilisateur a les permissions d'administrateur
     * @param {GuildMember} member - Le membre à vérifier
     * @param {GuildConfig} guildConfig - Configuration du serveur
     * @returns {boolean}
     */
    static async isAdmin(member, guildConfig = null) {
        // Vérification des permissions Discord natives
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }

        // Vérification du propriétaire du serveur
        if (member.guild.ownerId === member.id) {
            return true;
        }

        // Vérification des rôles configurés
        if (guildConfig && guildConfig.adminRoles.length > 0) {
            const hasAdminRole = member.roles.cache.some(role => 
                guildConfig.adminRoles.includes(role.id)
            );
            if (hasAdminRole) return true;
        }

        // Vérification des rôles par nom (fallback)
        const adminRoleNames = ['admin', 'administrateur', 'administrator'];
        const hasAdminRoleName = member.roles.cache.some(role => 
            adminRoleNames.includes(role.name.toLowerCase())
        );

        return hasAdminRoleName;
    }

    /**
     * Vérifie si un utilisateur a les permissions de modérateur
     * @param {GuildMember} member - Le membre à vérifier
     * @param {GuildConfig} guildConfig - Configuration du serveur
     * @returns {boolean}
     */
    static async isModerator(member, guildConfig = null) {
        // Les admins sont aussi modérateurs
        if (await this.isAdmin(member, guildConfig)) {
            return true;
        }

        // Vérification des permissions Discord natives
        if (member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
            member.permissions.has(PermissionFlagsBits.BanMembers) ||
            member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return true;
        }

        // Vérification des rôles configurés
        if (guildConfig && guildConfig.moderatorRoles.length > 0) {
            const hasModRole = member.roles.cache.some(role => 
                guildConfig.moderatorRoles.includes(role.id)
            );
            if (hasModRole) return true;
        }

        // Vérification des rôles par nom (fallback)
        const modRoleNames = ['modérateur', 'moderator', 'mod', 'staff'];
        const hasModRoleName = member.roles.cache.some(role => 
            modRoleNames.includes(role.name.toLowerCase())
        );

        return hasModRoleName;
    }

    /**
     * Vérifie si un utilisateur peut modérer un autre utilisateur
     * @param {GuildMember} moderator - Le modérateur
     * @param {GuildMember} target - La cible
     * @returns {boolean}
     */
    static canModerate(moderator, target) {
        // Ne peut pas se modérer soi-même
        if (moderator.id === target.id) {
            return false;
        }

        // Ne peut pas modérer le propriétaire
        if (target.guild.ownerId === target.id) {
            return false;
        }

        // Ne peut pas modérer quelqu'un avec un rôle plus élevé
        if (target.roles.highest.position >= moderator.roles.highest.position) {
            return false;
        }

        // Ne peut pas modérer un bot (sauf si c'est un admin)
        if (target.user.bot && !moderator.permissions.has(PermissionFlagsBits.Administrator)) {
            return false;
        }

        return true;
    }

    /**
     * Vérifie si le bot peut effectuer une action sur un utilisateur
     * @param {GuildMember} botMember - Le membre bot
     * @param {GuildMember} target - La cible
     * @param {string} action - L'action à effectuer (ban, kick, mute)
     * @returns {boolean}
     */
    static canBotModerate(botMember, target, action) {
        // Ne peut pas modérer le propriétaire
        if (target.guild.ownerId === target.id) {
            return false;
        }

        // Ne peut pas modérer quelqu'un avec un rôle plus élevé que le bot
        if (target.roles.highest.position >= botMember.roles.highest.position) {
            return false;
        }

        // Vérification des permissions spécifiques
        switch (action) {
            case 'ban':
                return botMember.permissions.has(PermissionFlagsBits.BanMembers);
            case 'kick':
                return botMember.permissions.has(PermissionFlagsBits.KickMembers);
            case 'mute':
                return botMember.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                       botMember.permissions.has(PermissionFlagsBits.ManageRoles);
            case 'manage_messages':
                return botMember.permissions.has(PermissionFlagsBits.ManageMessages);
            default:
                return false;
        }
    }

    /**
     * Obtient ou crée le rôle de mute pour un serveur
     * @param {Guild} guild - Le serveur
     * @param {GuildConfig} guildConfig - Configuration du serveur
     * @returns {Role|null}
     */
    static async getMuteRole(guild, guildConfig) {
        try {
            // Vérifier si un rôle de mute est configuré
            if (guildConfig.muteRoleId) {
                const existingRole = guild.roles.cache.get(guildConfig.muteRoleId);
                if (existingRole) {
                    return existingRole;
                }
            }

            // Chercher un rôle existant par nom
            const muteRoleNames = ['muted', 'mute', 'muet', 'silencieux'];
            let muteRole = guild.roles.cache.find(role => 
                muteRoleNames.includes(role.name.toLowerCase())
            );

            if (!muteRole) {
                // Créer le rôle de mute
                muteRole = await guild.roles.create({
                    name: 'Muted',
                    color: '#818386',
                    permissions: [],
                    reason: 'Rôle de mute automatique créé par Better Yako'
                });

                // Configurer les permissions pour tous les canaux
                const channels = guild.channels.cache;
                for (const [, channel] of channels) {
                    try {
                        await channel.permissionOverwrites.create(muteRole, {
                            SendMessages: false,
                            Speak: false,
                            AddReactions: false,
                            SendMessagesInThreads: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false
                        });
                    } catch (error) {
                        console.error(`Erreur lors de la configuration du rôle mute pour le canal ${channel.name}:`, error);
                    }
                }
            }

            // Sauvegarder l'ID du rôle dans la configuration
            await DatabaseManager.updateGuildConfig(guild.id, {
                muteRoleId: muteRole.id
            });

            return muteRole;
        } catch (error) {
            console.error('Erreur lors de la création/récupération du rôle mute:', error);
            return null;
        }
    }
}

module.exports = PermissionManager;