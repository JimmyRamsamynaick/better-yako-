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
            flags: 64
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
        const title = LanguageManager.get(lang, 'commands.ping.title') || '🏓 Pong!';
        const message = LanguageManager.get(lang, 'commands.ping.description', {
            latency: latency,
            apiLatency: apiLatency
        }) || `**Bot Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`;
        const footer = LanguageManager.get(lang, 'commands.ping.footer') || 'Bot performance';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}\n\n*${footer}*`
            }],
            flags: 64
        };
    }

    // ===== EMBEDS POUR LA COMMANDE SERVERINFO =====

    /**
     * Embed pour la commande serverinfo
     */
    static createServerInfoEmbed(guild, owner, guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.serverinfo.title') || '📊 Server Information';
        const message = LanguageManager.get(lang, 'commands.serverinfo.description', {
            guildName: guild.name,
            owner: owner.user.tag,
            createdAt: `<t:${Math.floor(guild.createdAt / 1000)}:D>`,
            guildId: guild.id,
            memberCount: guild.memberCount,
            channelCount: guild.channels.cache.size,
            roleCount: guild.roles.cache.size,
            emojiCount: guild.emojis.cache.size,
            boostLevel: guild.premiumTier,
            boostCount: guild.premiumSubscriptionCount,
            verificationLevel: guild.verificationLevel,
            guildDescription: guild.description || LanguageManager.get(lang, 'common.no_description') || 'No description'
        }) || `**Server:** ${guild.name}\n**Owner:** ${owner.user.tag}\n**Created:** <t:${Math.floor(guild.createdAt / 1000)}:D>\n**Members:** ${guild.memberCount}\n**Channels:** ${guild.channels.cache.size}\n**Roles:** ${guild.roles.cache.size}`;
        const footer = LanguageManager.get(lang, 'commands.serverinfo.footer') || 'Server statistics';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}\n\n*${footer}*`
            }],
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
        };
    }

    /**
     * Embed pour erreur premium requis
     */
    static createPremiumRequiredEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ask.premium_required_title') || '💎 Premium Required';
        const message = LanguageManager.get(lang, 'commands.ask.premium_required') || 'This command requires a premium subscription.';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
        };
    }

    // ===== EMBEDS POUR LA COMMANDE MUTE =====

    /**
     * Embed pour succès de mute
     */
    static createMuteSuccessEmbed(user, reason, duration, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.mute.success_title') || '✅ Membre rendu muet';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'Un modérateur';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';
        const durationText = duration || LanguageManager.get(lang, 'common.permanent') || 'Permanent';
        const message = LanguageManager.get(lang, 'commands.mute.success', {
            executor: executorName,
            user: userName,
            reason: finalReason,
            duration: durationText
        }) || `${executorName} a rendu muet ${userName} pour ${finalReason} (Durée: ${durationText})`;

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
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'Un modérateur';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'Aucune raison fournie';
        const message = LanguageManager.get(lang, 'commands.unmute.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} a démute ${userName} pour ${finalReason}`;

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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
        };
    }

    // ===== EMBEDS POUR LA COMMANDE BAN =====

    /**
     * Embed pour succès de bannissement
     */
    static createBanSuccessEmbed(user, reason, guildId = null, executor = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.success_title') || '✅ User banned';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const message = LanguageManager.get(lang, 'commands.ban.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} banned ${userName} for ${finalReason}`;

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
        };
    }

    /**
     * Embed pour erreur de permissions du bot (ban)
     */
    static createBanBotPermissionEmbed(guildId = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.ban.error_bot_permissions_title') || '❌ Insufficient bot permissions';
        const message = LanguageManager.get(lang, 'commands.ban.error_bot_permissions') || 'I do not have sufficient permissions to ban this user.';

        return {
            type: 17,
            components: [{
                type: 10,
                content: `### ${message}`
            }],
            flags: 64
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
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
            }],
            flags: 64
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
            flags: 64
        };
    }

    // ===== EMBEDS POUR LA COMMANDE UNBAN =====

    /**
     * Embed pour succès de débannissement
     */
    static createUnbanSuccessEmbed(user, guildId = null, executor = null, reason = null, lang = 'fr') {
        const title = LanguageManager.get(lang, 'commands.unban.success_title') || '✅ User unbanned';
        const executorName = executor ? executor.username : LanguageManager.get(lang, 'common.moderator') || 'A moderator';
        const userName = user.username || user.tag;
        const finalReason = reason || LanguageManager.get(lang, 'common.no_reason') || 'No reason provided';
        const message = LanguageManager.get(lang, 'commands.unban.success', {
            executor: executorName,
            user: userName,
            reason: finalReason
        }) || `${executorName} unbanned ${userName} for ${finalReason}`;

        return {
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}`
            }],
            flags: 64
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
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
            }],
            flags: 64
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
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${title}\n\n${message}\n\n**${detailsLabel}:** ${error.message}`
            }],
            flags: 64
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
            type: 17,
            components: [{
                type: 10,
                content: `## ${welcomeTitle}\n\n${welcomeDescription}`
            }],
            flags: 64
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