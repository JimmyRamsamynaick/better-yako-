const LanguageManager = require('./languageManager');


class BotEmbeds {
    static getLanguageManager() {
        return LanguageManager;
    }


    
    // ===== EMBEDS GÉNÉRIQUES/GLOBAL =====

    /**
     * Embed générique d'erreur
     */
    static createGenericErrorEmbed(message, guildId = null) {
        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || 'Une erreur est survenue.';
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ❌ Erreur\n\n${content}`
                }]
            }]
        };
    }

    /**
     * Embed générique de succès
     */
    static createGenericSuccessEmbed(message, guildId = null) {
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ✅ Succès\n\n${message}`
                }]
            }]
        };
    }

    /**
     * Embed pour utilisateur introuvable
     */
    static createUserNotFoundEmbed(userId, guildId = null) {
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ❌ Utilisateur introuvable\n\nAucun utilisateur trouvé avec l'ID: \`${userId}\``
                }]
            }]
        };
    }

        /**
     * Embed générique pour erreur de permissions utilisateur
     */
    static createNoPermissionEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'errors.no_permission_title') || '❌ Insufficient permissions';
        const message = LanguageManager.get(lang, 'errors.no_permission') || 'You do not have the necessary permissions to use this command.';

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `### ${message}`
                }]
            }]
        };
    }

    static createBotNoPermissionEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'errors.bot_no_permission_title') || '❌ Bot permissions insufficient';
        const message = LanguageManager.get(lang, 'errors.bot_no_permission') || 'I do not have the necessary permissions to execute this command. Please check my permissions.';

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `### ${message}`
                }]
            }]
        };
    }


    // ===== EMBEDS POUR LA COMMANDE CLEAR =====

    /**
     * Embed pour succès de clear
     */
    static createClearSuccessEmbed(count, targetUser = null, guildId = null, lang = 'fr', executor = null) {
        const title = LanguageManager.get(lang, 'commands.clear.success_title') || '✅ Messages supprimés';
        const executorName = executor ? executor.toString() : LanguageManager.get(lang, 'common.moderator') || 'Un utilisateur';
        const message = LanguageManager.get(lang, 'commands.clear.success', {
            user: executorName,
            count: count
        }) || `${executorName} a supprimé ${count} message(s)`;

        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || `${count} message(s) supprimé(s) avec succès`;
        
        return {
            type: 17,
            components: [{
                type: 10,
                content: `## 🧹 Messages supprimés\n\n${count} message(s) supprimé(s) avec succès.`
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE KICK =====

    /**
     * Embed pour succès de kick
     */
    static createKickSuccessEmbed(user, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.kick.success_title') || '✅ User kicked';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const message = LanguageManager.get(lang, 'commands.kick.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} kicked ${userName} for ${finalReason}`;

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }]
        };
    }

    /**
     * Embed pour erreur de kick (utilisateur non trouvé)
     */
    static createKickUserNotFoundEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.kick.error_not_found_title') || '❌ User not found';
        const message = LanguageManager.get(lang, 'commands.kick.error_not_found') || 'This user is not a member of this server.';

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }]
        };
    }

    /**
     * Embed pour erreur de kick (utilisateur non kickable)
     */
    static createKickUserNotKickableEmbed(user, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.kick.error_not_kickable_title') || '❌ Cannot kick user';
        const userName = user.username || user.tag;
        const message = LanguageManager.get(lang, 'commands.kick.error_not_kickable', {
            user: userName
        }) || `I cannot kick ${userName}. They may have higher permissions than me.`;

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }]
        };
    }

    // ===== EMBEDS POUR LA COMMANDE PING =====

    /**
     * Embed pour la commande ping
     */
    static createPingEmbed(latency, apiLatency, guildId = null, lang = 'fr') {
        const ComponentsV3 = require('./ComponentsV3');
        
        const title = LanguageManager.get(lang, 'commands.ping.title') || '🏓 Pong!';
        const message = LanguageManager.get(lang, 'commands.ping.description', {
            latency: latency
        }) || `**Bot Latency:** ${latency}ms`;
        const footer = LanguageManager.get(lang, 'commands.ping.footer') || 'Bot performance';
        
        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}\n\n*${footer}*`
                }]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE SERVERINFO =====

    /**
     * Embed pour la commande serverinfo
     */
    static createServerInfoEmbed(guild, owner, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.serverinfo.title') || '📊 Server Information';
        
        // Obtenir les statistiques des canaux
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
        const threadChannels = guild.channels.cache.filter(c => [10, 11, 12].includes(c.type)).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === 15).size;
        
        // Obtenir les statistiques des membres
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;
        
        // Obtenir les informations de boost
        const boostTierNames = {
            0: lang === 'en' ? 'None' : 'Aucun',
            1: lang === 'en' ? 'Level 1' : 'Niveau 1',
            2: lang === 'en' ? 'Level 2' : 'Niveau 2',
            3: lang === 'en' ? 'Level 3' : 'Niveau 3'
        };
        const boostTierName = boostTierNames[guild.premiumTier] || (lang === 'en' ? 'Unknown' : 'Inconnu');
        
        // Obtenir les informations de vérification
        const verificationLevels = {
            0: lang === 'en' ? 'None' : 'Aucun',
            1: lang === 'en' ? 'Low' : 'Faible',
            2: lang === 'en' ? 'Medium' : 'Moyen',
            3: lang === 'en' ? 'High' : 'Élevé',
            4: lang === 'en' ? 'Very High' : 'Très élevé'
        };
        const verificationLevelName = verificationLevels[guild.verificationLevel] || (lang === 'en' ? 'Unknown' : 'Inconnu');
        
        // Préparer le contenu pour les composants
        const generalInfo = `**📌 ${lang === 'en' ? 'General Information' : 'Informations générales'}**
**${lang === 'en' ? 'Name' : 'Nom'}:** ${guild.name}
**ID:** ${guild.id}
**${lang === 'en' ? 'Owner' : 'Propriétaire'}:** ${owner.user.tag}
**${lang === 'en' ? 'Created on' : 'Créé le'}:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)
**${lang === 'en' ? 'Description' : 'Description'}:** ${guild.description || (lang === 'en' ? 'No description' : 'Aucune description')}`;

        const memberInfo = `**👥 ${lang === 'en' ? 'Members' : 'Membres'}**
**${lang === 'en' ? 'Total' : 'Total'}:** ${guild.memberCount}
**${lang === 'en' ? 'Humans' : 'Humains'}:** ${humanCount}
**${lang === 'en' ? 'Bots' : 'Bots'}:** ${botCount}`;

        const channelInfo = `**💬 ${lang === 'en' ? 'Channels' : 'Canaux'}**
**${lang === 'en' ? 'Total' : 'Total'}:** ${guild.channels.cache.size}
**${lang === 'en' ? 'Text' : 'Textuels'}:** ${textChannels}
**${lang === 'en' ? 'Voice' : 'Vocaux'}:** ${voiceChannels}
**${lang === 'en' ? 'Categories' : 'Catégories'}:** ${categoryChannels}
**${lang === 'en' ? 'Threads' : 'Fils de discussion'}:** ${threadChannels}
**${lang === 'en' ? 'Forums' : 'Forums'}:** ${forumChannels}`;

        const serverInfo = `**🏆 ${lang === 'en' ? 'Server' : 'Serveur'}**
**${lang === 'en' ? 'Roles' : 'Rôles'}:** ${guild.roles.cache.size}
**${lang === 'en' ? 'Emojis' : 'Emojis'}:** ${guild.emojis.cache.size}
**${lang === 'en' ? 'Stickers' : 'Autocollants'}:** ${guild.stickers?.cache.size || 0}
**${lang === 'en' ? 'Boost level' : 'Niveau de boost'}:** ${boostTierName} (${guild.premiumSubscriptionCount} boosts)
**${lang === 'en' ? 'Verification level' : 'Niveau de vérification'}:** ${verificationLevelName}
**${lang === 'en' ? 'Features' : 'Fonctionnalités'}:** ${guild.features.join(', ') || (lang === 'en' ? 'None' : 'Aucune')}`;

        const footer = LanguageManager.get(lang, 'commands.serverinfo.footer') || 'Statistiques du serveur';

        // Utiliser le format ComponentsV3
        return {
            components: [{
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `## ${title}`
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    },
                    {
                        type: 10,
                        content: generalInfo
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    },
                    {
                        type: 10,
                        content: memberInfo
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    },
                    {
                        type: 10,
                        content: channelInfo
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    },
                    {
                        type: 10,
                        content: serverInfo
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    },
                    {
                        type: 10,
                        content: `*${footer} - ${new Date().toLocaleString()}*`
                    }
                ]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE USERINFO =====

    /**
     * Embed pour les informations d'un utilisateur
     */
    static createUserInfoEmbed(user, member, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.userinfo.title', { user: user.tag }) || `👤 ${user.tag} Information`;
        
        // Informations de base
        const userInfo = `**${LanguageManager.get(lang, 'commands.userinfo.fields.id') || '🆔 ID'}:** ${user.id}
**${LanguageManager.get(lang, 'commands.userinfo.fields.created_at') || '📅 Account created'}:** <t:${Math.floor(user.createdTimestamp / 1000)}:D> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`;

        let memberInfo = '';
        if (member) {
            // Informations du membre dans le serveur
            const joinedAt = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` : (LanguageManager.get(lang, 'commands.userinfo.no_data') || 'Unknown');
            const nickname = member.nickname || LanguageManager.get(lang, 'commands.userinfo.no_nickname') || 'None';
            
            memberInfo = `**${LanguageManager.get(lang, 'commands.userinfo.fields.joined_at') || '📥 Joined server'}:** ${joinedAt}
**${LanguageManager.get(lang, 'commands.userinfo.fields.nickname') || '📝 Nickname'}:** ${nickname}`;

            // Rôles
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id) // Exclure @everyone
                .sort((a, b) => b.position - a.position)
                .map(role => `<@&${role.id}>`)
                .slice(0, 10); // Limiter à 10 rôles pour éviter les messages trop longs

            const roleCount = member.roles.cache.size - 1; // -1 pour exclure @everyone
            const rolesText = roles.length > 0 ? roles.join(', ') : LanguageManager.get(lang, 'commands.userinfo.no_roles') || 'No roles';
            const rolesTitle = LanguageManager.get(lang, 'commands.userinfo.fields.roles', { count: roleCount }) || `🎭 Roles (${roleCount})`;
            
            memberInfo += `\n**${rolesTitle}:** ${rolesText}`;

            // Rôle le plus élevé
            const highestRole = member.roles.highest;
            if (highestRole && highestRole.id !== member.guild.id) {
                memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.highest_role') || '👑 Highest role'}:** <@&${highestRole.id}>`;
            }

            // Permissions clés
            let permissions = [];
            if (member.permissions.has('Administrator')) {
                permissions.push(LanguageManager.get(lang, 'commands.userinfo.permissions_admin') || 'Administrator');
            } else {
                if (member.permissions.has('ManageGuild') || member.permissions.has('ManageChannels') || member.permissions.has('ManageRoles') || member.permissions.has('BanMembers') || member.permissions.has('KickMembers')) {
                    permissions.push(LanguageManager.get(lang, 'commands.userinfo.permissions_mod') || 'Moderator');
                } else {
                    permissions.push(LanguageManager.get(lang, 'commands.userinfo.permissions_member') || 'Member');
                }
            }
            memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.permissions') || '🔐 Key permissions'}:** ${permissions.join(', ')}`;

            // Statut
            const presence = member.presence;
            let status = LanguageManager.get(lang, 'commands.userinfo.status.offline') || '⚫ Offline';
            if (presence) {
                switch (presence.status) {
                    case 'online':
                        status = LanguageManager.get(lang, 'commands.userinfo.status.online') || '🟢 Online';
                        break;
                    case 'idle':
                        status = LanguageManager.get(lang, 'commands.userinfo.status.idle') || '🟡 Idle';
                        break;
                    case 'dnd':
                        status = LanguageManager.get(lang, 'commands.userinfo.status.dnd') || '🔴 Do not disturb';
                        break;
                }
            }
            memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.status') || '🟢 Status'}:** ${status}`;

            // Activité
            if (presence && presence.activities && presence.activities.length > 0) {
                const activity = presence.activities[0];
                let activityText = activity.name;
                if (activity.details) activityText += ` - ${activity.details}`;
                memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.activity') || '🎮 Activity'}:** ${activityText}`;
            } else {
                memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.activity') || '🎮 Activity'}:** ${LanguageManager.get(lang, 'commands.userinfo.no_activity') || 'No activity'}`;
            }

            // Boost depuis
            if (member.premiumSince) {
                memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.boost_since') || '💎 Boosting since'}:** <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>`;
            } else {
                memberInfo += `\n**${LanguageManager.get(lang, 'commands.userinfo.fields.boost_since') || '💎 Boosting since'}:** ${LanguageManager.get(lang, 'commands.userinfo.not_boosting') || 'Not boosting'}`;
            }
        }

        // Avatar
        const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
        const avatarInfo = `**${LanguageManager.get(lang, 'commands.userinfo.fields.avatar') || '🖼️ Avatar'}:** [${LanguageManager.get(lang, 'commands.userinfo.fields.avatar') || 'Avatar'}](${avatarUrl})`;

        // Utiliser le format ComponentsV3
        const components = [
            {
                type: 10,
                content: `## ${title}`
            },
            {
                type: 14,
                divider: true,
                spacing: 2
            },
            {
                type: 10,
                content: userInfo
            }
        ];

        if (memberInfo) {
            components.push(
                {
                    type: 14,
                    divider: true,
                    spacing: 2
                },
                {
                    type: 10,
                    content: memberInfo
                }
            );
        }

        components.push(
            {
                type: 14,
                divider: true,
                spacing: 2
            },
            {
                type: 10,
                content: avatarInfo
            }
        );

        return {
            components: [{
                type: 17,
                components: components
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE ASK =====

    /**
     * Embed pour la réponse de l'IA
     */
    static createAskResponseEmbed(question, response, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ask.title') || '🤖 AI Response';
        const questionLabel = LanguageManager.get(lang, 'commands.ask.question') || 'Question';
        const responseLabel = LanguageManager.get(lang, 'commands.ask.response') || 'Response';
        const message = `**${questionLabel}:** ${question}\n\n**${responseLabel}:** ${response}`;

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }],
            flags: 32768
        };
    }

    /**
     * Embed pour erreur premium requis
     */
    static createPremiumRequiredEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ask.premium_required_title') || '💎 Premium Required';
        const message = LanguageManager.get(lang, 'commands.ask.premium_required') || 'This command requires a premium subscription.';

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE MUTE =====

    /**
     * Embed pour succès de mute
     */
    static createMuteSuccessEmbed(user, reason, duration, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.mute.success_title') || '✅ Membre rendu muet';
        const executorMention = executor ? `<@${executor.id}>` : LanguageManager.get(lang, 'common.moderator') || 'Un modérateur';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';
        const durationText = duration || LanguageManager.get(lang, 'common.permanent') || 'Permanent';
        const message = LanguageManager.get(lang, 'commands.mute.success', {
            executor: executorMention,
            user: userName,
            reason: finalReason,
            duration: durationText
        }) || `${executorMention} a rendu muet ${userName} pour ${finalReason} (Durée: ${durationText})`;

        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || 'Membre rendu muet avec succès';
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${content}`
                }]
            }]
        };
    }

    // ===== EMBEDS POUR LA COMMANDE UNMUTE =====

    /**
     * Embed pour succès de unmute
     */
    static createUnmuteSuccessEmbed(user, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unmute.success_title') || '✅ Membre démute';
        const executorMention = executor ? `<@${executor.id}>` : LanguageManager.get(lang, 'common.moderator') || 'Un modérateur';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';
        const message = LanguageManager.get(lang, 'commands.unmute.success', {
            executor: executorMention,
            user: userName,
            reason: finalReason
        }) || `${executorMention} a démute ${userName} pour ${finalReason}`;

        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || 'Membre démute avec succès';
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${content}`
                }]
            }]
        };
    }

    /**
     * Embed pour auto-unmute (fin de durée)
     */
    static createAutoUnmuteEmbed(user, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.mute.auto_unmute_title') || '🔓 Mute expiré';
        const userName = user.username || user.tag;
        const message = LanguageManager.get(lang, 'commands.mute.auto_unmute', {
            user: userName
        }) || `${userName} n'est plus rendu muet (durée expirée)`;

        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || 'Mute expiré automatiquement';
        
        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${content}`
                }]
            }]
        };
    }

    /**
     * Embed pour notification directe à l'utilisateur lors d'un auto-unmute
     */
    static createUserUnmuteNotificationEmbed(serverName, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.mute.user_unmute_notification_title') || '🔓 Vous n\'êtes plus muet';
        const message = LanguageManager.get(lang, 'commands.mute.user_unmute_notification', {
            server: serverName
        }) || `Votre mute sur le serveur **${serverName}** a expiré. Vous pouvez maintenant parler à nouveau.`;

        // S'assurer que le contenu n'est jamais vide pour éviter l'erreur DiscordAPIError[50035]
        const content = message || 'Votre mute a expiré';
        
        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${content}`
                }]
            }]
        };
    }

    // ===== EMBEDS POUR LA COMMANDE LOCK =====

    /**
     * Embed pour succès de lock
     */
    static createLockSuccessEmbed(channel, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.lock.success_title') || '🔒 Channel locked';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const channelName = channel.name;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const message = LanguageManager.get(lang, 'commands.lock.success', {
            executor: executorName,
            channel: channelName,
            reason: finalReason
        }) || `${executorName} locked ${channelName} for ${finalReason}`;

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE UNLOCK =====

    /**
     * Embed pour succès de unlock
     */
    static createUnlockSuccessEmbed(channel, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unlock.success_title') || '🔓 Channel unlocked';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const channelName = channel.name;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const message = LanguageManager.get(lang, 'commands.unlock.success', {
            executor: executorName,
            channel: channelName,
            reason: finalReason
        }) || `${executorName} unlocked ${channelName} for ${finalReason}`;

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}`
                }]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE BAN =====

    /**
     * Embed pour succès de bannissement
     */
    static createBanSuccessEmbed(user, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.success_title') || '✅ User banned';
        const executorName = executor ? `<@${executor.id}>` : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const description = LanguageManager.get(lang, 'commands.ban.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} banned ${userName} for ${finalReason}`;

        return {
            embeds: [{
                title: title,
                description: description,
                color: 0x00ff00,
                timestamp: new Date().toISOString()
            }]
        };
    }

    /**
     * Embed pour erreur de permissions du bot (ban)
     */
    static createBanBotPermissionEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.error_bot_permissions_title') || '❌ Insufficient bot permissions';
        const message = LanguageManager.get(lang, 'commands.ban.error_bot_permissions') || 'I do not have sufficient permissions to ban this user.';

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `### ${message}`
                }]
            }],
            flags: 32768
        };
    }

    /**
     * Embed pour utilisateur déjà banni
     */
    static createUserAlreadyBannedEmbed(user, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.error_title') || '❌ Ban error';
        const message = LanguageManager.get(lang, 'commands.ban.error_already_banned') || 'This user is already banned';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 32768
        };
    }

    /**
     * Embed pour erreur générale de bannissement
     */
    static createBanErrorEmbed(error, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.error_title') || '❌ Ban error';
        const message = LanguageManager.get(lang, 'commands.ban.error') || 'An error occurred while banning the user.';
        const detailsLabel = LanguageManager.get(lang, 'common.details') || 'Details';

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
                }]
            }],
            flags: 32768
        };
    }

    /**
     * Embed pour utilisateur non bannable (hiérarchie)
     */
    static createUserNotBannableEmbed(user, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.error_hierarchy_title') || '⚠️ Insufficient hierarchy';
        const message = LanguageManager.get(lang, 'commands.ban.error_hierarchy', { user: user.tag || user.username }) || `You cannot ban ${user.tag || user.username} due to role hierarchy.`;

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE UNBAN =====

    /**
     * Embed pour succès de débannissement
     */
    static createUnbanSuccessEmbed(user, guildId = null, executor = null, reason = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unban.success_title') || '✅ User unbanned';
        const executorName = executor ? `<@${executor.id}>` : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const description = LanguageManager.get(lang, 'commands.unban.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} unbanned ${userName} for ${finalReason}`;

        return {
            embeds: [{
                title: title,
                description: description,
                color: 0x00ff00,
                timestamp: new Date().toISOString()
            }]
        };
    }

    /**
     * Embed pour utilisateur non banni
     */
    static createUserNotBannedEmbed(user, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unban.error_title') || '❌ Unban error';
        const message = LanguageManager.get(lang, 'commands.unban.error_not_banned') || 'This user is not banned';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 32768
        };
    }

    /**
     * Embed pour erreur générale de débannissement
     */
    static createUnbanErrorEmbed(error, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unban.error_title') || '❌ Unban error';
        const message = LanguageManager.get(lang, 'commands.unban.error') || 'An error occurred while unbanning';
        const detailsLabel = LanguageManager.get(lang, 'common.details') || 'Details';

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
                }]
            }],
            flags: 32768
        };
    }

    // ===== EMBEDS POUR LA COMMANDE SETLANG =====

    /**
     * Embed pour succès de changement de langue
     */
    static createSetlangSuccessEmbed(language, guildId = null, lang = 'fr') {
        const languageNames = {
            'fr': 'Français 🇫🇷',
            'en': 'English 🇺🇸'
        };
        
        const title = LanguageManager.get(lang, 'commands.setlang.success_title') || '✅ Language changed';
        const message = LanguageManager.get(lang, 'commands.setlang.success', {
            language: languageNames[language]
        }) || `✅ Bot language changed to **${languageNames[language]}**.`;

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 32768
        };
    }



    /**
     * Embed pour erreur générale de setlang
     */
    static createSetlangErrorEmbed(error, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.setlang.error_title') || '❌ Language change error';
        const message = LanguageManager.get(lang, 'commands.setlang.error');
        const detailsLabel = LanguageManager.get(lang, 'common.details') || 'Details';

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
                }]
            }],
            flags: 32768
        };
    }



    // ===== EMBEDS POUR LA COMMANDE HELP =====

    /**
     * Embed pour la commande help
     */
    static createHelpEmbed(selectedCategory = null, lang = 'fr') {
        const components = [
            {
                type: 17,
                components: [
                    {
                        type: 12,
                        items: [
                            {
                                media: {
                                    url: "https://cdn.discordapp.com/attachments/1176977094908071979/1393225945439015006/helpLNTR-PSD.png?ex=68726646&is=687114c6&hm=5cad4cc3a7b7420ef85b5dcc84b52378dd347f97c12a7c1234d7658e8d1dc933&"
                                }
                            }
                        ]
                    },
                    {
                        type: 10,
                        content: `# ${LanguageManager.get(lang, 'commands.help.main_title')}\n\n${LanguageManager.get(lang, 'commands.help.main_description')}`
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 2
                    }
                ]
            }
        ];

        // Ajouter le contenu de la catégorie sélectionnée s'il existe
        if (selectedCategory) {
            let categoryContent = '';
            
            switch (selectedCategory) {
                case 'moderation':
                    categoryContent = `## ${LanguageManager.get(lang, 'commands.help.moderation_title')}\n${LanguageManager.get(lang, 'commands.help.moderation_description')}`;
                    break;
                case 'public':
                    categoryContent = `## ${LanguageManager.get(lang, 'commands.help.public_title')}\n${LanguageManager.get(lang, 'commands.help.public_description')}`;
                    break;
                case 'premium':
                    categoryContent = `## ${LanguageManager.get(lang, 'commands.help.premium_title')}\n${LanguageManager.get(lang, 'commands.help.premium_description')}`;
                    break;
            }
            
            components[0].components.push({
                type: 10,
                content: categoryContent
            });
        } else {
            // Instructions par défaut
            components[0].components.push({
                type: 10,
                content: LanguageManager.get(lang, 'commands.help.default_instructions')
            });
            
            components[0].components.push({
                type: 14,
                divider: true,
                spacing: 2
            });
        }

        // Menu déroulant pour les catégories
        components[0].components.push({
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: "help_category_select",
                    placeholder: LanguageManager.get(lang, 'commands.help.select_placeholder'),
                    min_values: 0,
                    max_values: 1,
                    options: [
                        {
                            label: LanguageManager.get(lang, 'commands.help.moderation_option'),
                            value: "moderation",
                            description: LanguageManager.get(lang, 'commands.help.moderation_desc'),
                            emoji: {
                                name: "🛡️"
                            }
                        },
                        {
                            label: LanguageManager.get(lang, 'commands.help.public_option'),
                            value: "public",
                            description: LanguageManager.get(lang, 'commands.help.public_desc'),
                            emoji: {
                                name: "👥"
                            }
                        },
                        {
                            label: LanguageManager.get(lang, 'commands.help.premium_option'),
                            value: "premium",
                            description: LanguageManager.get(lang, 'commands.help.premium_desc'),
                            emoji: {
                                name: "⭐"
                            }
                        }
                    ]
                }
            ]
        });

        // Footer final
        components[0].components.push({
            type: 14,
            divider: true,
            spacing: 2
        });

        components[0].components.push({
            type: 10,
            content: `-# ${LanguageManager.get(lang, 'commands.help.footer_text')}`
        });

        return {
            flags: 32768,
            components: components
        };
    }

    // ===== EMBEDS POUR LES ÉVÉNEMENTS =====

    /**
     * Embed de bienvenue pour guildCreate
     */
    static createWelcomeEmbed(serverCount, lang = 'fr') {
        const welcomeTitle = LanguageManager.get(lang, 'welcome.title');
        const welcomeDescription = LanguageManager.get(lang, 'welcome.description', {
            serverCount: serverCount
        });

        return {
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${welcomeTitle}\n\n${welcomeDescription}`
                }]
            }],
            flags: 32768
        };
    }

    /**
     * Embed d'erreur pour les cooldowns
     */
    static createCooldownErrorEmbed(timeLeft, lang = 'fr') {
        const cooldownTitle = LanguageManager.get(lang, 'errors.cooldown.title') || '⏰ Cooldown';
        const cooldownMessage = LanguageManager.get(lang, 'errors.cooldown.message', {
            timeLeft: timeLeft.toFixed(1)
        }) || `Vous devez attendre ${timeLeft.toFixed(1)} secondes avant de réutiliser cette commande.`;

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${cooldownTitle}\n\n${cooldownMessage}`
                }]
            }]
        };
    }

    /**
     * Embed d'erreur générale pour les commandes
     */
    static createCommandErrorEmbed(lang = 'fr') {
        const errorTitle = LanguageManager.get(lang, 'common.error');
        const errorMessage = LanguageManager.get(lang, 'errors.command_execution') || 'Une erreur est survenue lors de l\'exécution de cette commande.';

        return {
            flags: 32768,
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${errorTitle}\n\n${errorMessage}`
                }]
            }]
        };
    }
}

module.exports = BotEmbeds;