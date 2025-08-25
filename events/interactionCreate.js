const { Events, EmbedBuilder } = require('discord.js');
const { getTranslation } = require('../index.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // Gestion des commandes slash
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`❌ Commande non trouvée: ${interaction.commandName}`);
                return;
            }
            
            try {
                console.log(`🎯 Exécution de /${interaction.commandName} par ${interaction.user.tag}`);
                
                // SUPPRIMÉ: Ne plus déférer automatiquement
                // Laisser chaque commande gérer sa propre réponse
                
                // Exécuter la commande avec la fonction de traduction
                await command.execute(interaction, client, (key, ...args) => 
                    getTranslation(interaction.guildId, key, ...args)
                );
                
            } catch (error) {
                console.error(`❌ Erreur lors de l'exécution de /${interaction.commandName}:`, error);
                
                // Ne répondre que si l'interaction n'a pas déjà été gérée
                if (!interaction.replied && !interaction.deferred) {
                    try {
                        const errorMessage = new EmbedBuilder()
                            .setTitle('Erreur de commande')
                            .setDescription('Une erreur s\'est produite lors de l\'exécution de cette commande.\n\n**Erreur:** ' + error.message)
                            .setColor(0xFF0000)
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [errorMessage], ephemeral: true });
                    } catch (replyError) {
                        console.error('❌ Erreur lors de l\'envoi du message d\'erreur:', replyError);
                    }
                } else {
                    // Si l'interaction a déjà été gérée, essayer editReply
                    try {
                        const errorMessage = new EmbedBuilder()
                            .setTitle('Erreur de commande')
                            .setDescription('Une erreur s\'est produite lors de l\'exécution de cette commande.\n\n**Erreur:** ' + error.message)
                            .setColor(0xFF0000)
                            .setTimestamp();
                        
                        await interaction.editReply({ embeds: [errorMessage] });
                    } catch (editError) {
                        console.error('❌ Impossible de modifier la réponse:', editError);
                    }
                }
            }
        }
        
        // Gestion des boutons
        else if (interaction.isButton()) {
            const customId = interaction.customId;
            console.log(`📘 Bouton cliqué: ${customId} par ${interaction.user.tag}`);
            
            try {
                // Logique pour les boutons spécifiques
                if (customId.startsWith('lang_')) {
                    const lang = customId.replace('lang_', '');
                    // TODO: Sauvegarder la langue dans la base de données
                    
                    const langNames = {
                        'fr': 'Français 🇫🇷',
                        'en': 'English 🇺🇸',
                        'es': 'Español 🇪🇸'
                    };
                    
                    const successMessage = new EmbedBuilder()
                        .setTitle('Langue modifiée')
                        .setDescription(`La langue a été changée en ${langNames[lang] || lang}`)
                        .setColor(0x00FF00)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [successMessage], ephemeral: true });
                }
                
                // Boutons de la commande ping
                else if (customId === 'ping_refresh') {
                    const startTime = Date.now();
                    const botLatency = Date.now() - startTime;
                    const apiLatency = Math.round(interaction.client.ws.ping);
                    
                    let connectionQuality = '🟢 Excellente';
                    let color = '#57F287';
                    
                    if (apiLatency > 200) {
                        connectionQuality = '🟡 Moyenne';
                        color = '#FEE75C';
                    }
                    if (apiLatency > 500) {
                        connectionQuality = '🔴 Mauvaise';
                        color = '#ED4245';
                    }
                    
                    const refreshedMessage = new EmbedBuilder()
                        .setTitle('🏓 Pong! (Actualisé)')
                        .setDescription(`**Latence du bot:** ${botLatency}ms\n**Latence API Discord:** ${apiLatency}ms\n**Qualité de connexion:** ${connectionQuality}`)
                        .setColor(parseInt(color.replace('#', ''), 16))
                        .setTimestamp()
                        .addFields(
                            {
                                name: '📊 Statistiques',
                                value: `**Serveurs:** ${interaction.client.guilds.cache.size}\n**Utilisateurs:** ${interaction.client.users.cache.size}\n**Temps de fonctionnement:** ${Math.floor(process.uptime() / 60)} minutes`,
                                inline: false
                            },
                            {
                                name: '🔧 Informations techniques',
                                value: `**Version Node.js:** ${process.version}\n**Mémoire utilisée:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n**Plateforme:** ${process.platform}`,
                                inline: false
                            }
                        );
                    
                    // Note: Les boutons nécessitent ActionRowBuilder, pour l'instant on les retire
                    
                    await interaction.update({ embeds: [refreshedMessage] });
                }
                
                else if (customId === 'ping_stats') {
                    const statsMessage = new EmbedBuilder()
                        .setTitle('📊 Statistiques détaillées du bot')
                        .setDescription('Voici les statistiques complètes du bot Better Yako v2')
                        .setColor(0x5865F2)
                        .setTimestamp()
                        .addFields(
                            {
                                name: '🏰 Serveurs et utilisateurs',
                                value: `**Serveurs:** ${interaction.client.guilds.cache.size}\n**Utilisateurs:** ${interaction.client.users.cache.size}\n**Canaux:** ${interaction.client.channels.cache.size}`,
                                inline: true
                            },
                            {
                                name: '⚡ Performance',
                                value: `**Latence API:** ${Math.round(interaction.client.ws.ping)}ms\n**Temps de fonctionnement:** ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n**Mémoire:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                                inline: true
                            },
                            {
                                name: '🔧 Système',
                                value: `**Node.js:** ${process.version}\n**Plateforme:** ${process.platform}\n**Architecture:** ${process.arch}`,
                                inline: true
                            },
                            {
                                name: '📚 Commandes',
                                value: `**Total:** ${interaction.client.commands.size}\n**Langues:** ${interaction.client.languages.size}\n**Événements:** Actifs`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [statsMessage] });
                }
                
                // Boutons de la commande help
                else if (customId === 'help_basic') {
                    const basicCommands = interaction.client.commands.filter(cmd => cmd.category === 'Basic');
                    const commandList = basicCommands.map(cmd => `**/${cmd.data.name}** - ${cmd.data.description}`).join('\n');
                    
                    const helpMessage = new EmbedBuilder()
                        .setTitle('📚 Commandes de base')
                        .setDescription(commandList)
                        .setColor(0x57F287)
                        .setTimestamp();
                    
                    // Note: Boutons retirés temporairement
                    
                    await interaction.update({ embeds: [helpMessage] });
                }
                
                else if (customId === 'help_premium') {
                    const premiumCommands = interaction.client.commands.filter(cmd => cmd.category === 'Premium');
                    const commandList = premiumCommands.map(cmd => `**/${cmd.data.name}** - ${cmd.data.description}`).join('\n');
                    
                    const helpMessage = new EmbedBuilder()
                        .setTitle('⭐ Commandes premium')
                        .setDescription(commandList)
                        .setColor(0xFEE75C)
                        .setTimestamp();
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [helpMessage] });
                }
                
                else if (customId === 'help_language') {
                    const helpMessage = new EmbedBuilder()
                        .setTitle('🌐 Changer la langue')
                        .setDescription('Utilisez la commande `/setlang` pour changer la langue du bot.\n\n**Langues disponibles:**\n🇺🇸 Anglais (en)\n🇪🇸 Espagnol (es)\n🇫🇷 Français (fr)')
                        .setColor(0x5865F2)
                        .setTimestamp();
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [helpMessage] });
                }
                
                // Boutons de la commande stats
                else if (customId === 'stats_refresh') {
                    const statsMessage = new EmbedBuilder()
                        .setTitle('📊 Statistiques du bot (Actualisées)')
                        .setDescription(`Voici les statistiques actualisées de **${interaction.client.user.username}**`)
                        .setColor(0x57F287)
                        .setTimestamp()
                        .addFields(
                            {
                                name: '🏰 Serveurs',
                                value: `${interaction.client.guilds.cache.size}`,
                                inline: true
                            },
                            {
                                name: '👥 Utilisateurs',
                                value: `${interaction.client.users.cache.size}`,
                                inline: true
                            },
                            {
                                name: '📺 Canaux',
                                value: `${interaction.client.channels.cache.size}`,
                                inline: true
                            },
                            {
                                name: '⚡ Latence',
                                value: `${Math.round(interaction.client.ws.ping)}ms`,
                                inline: true
                            },
                            {
                                name: '🕐 Temps de fonctionnement',
                                value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
                                inline: true
                            },
                            {
                                name: '💾 Mémoire',
                                value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [statsMessage] });
                }
                
                else if (customId === 'stats_detailed') {
                    const detailedMessage = new EmbedBuilder()
                        .setTitle('📊 Statistiques détaillées')
                        .setDescription('Informations détaillées sur le bot')
                        .setColor(0xFEE75C)
                        .setTimestamp()
                        .addFields(
                            {
                                name: '📚 Commandes',
                                value: `**Total:** ${interaction.client.commands.size}\n**Basic:** ${interaction.client.commands.filter(cmd => cmd.category === 'Basic').size}\n**Premium:** ${interaction.client.commands.filter(cmd => cmd.category === 'Premium').size}\n**Admin:** ${interaction.client.commands.filter(cmd => cmd.category === 'Autre').size}`,
                                inline: true
                            },
                            {
                                name: '🌐 Langues',
                                value: `**Supportées:** ${interaction.client.languages.size}\n**Disponibles:** en, es, fr`,
                                inline: true
                            },
                            {
                                name: '🎯 Événements',
                                value: `**Actifs:** 4\n**Types:** Interactions, Membres`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [detailedMessage] });
                }
                
                else if (customId === 'stats_system') {
                    const systemMessage = new EmbedBuilder()
                        .setTitle('🖥️ Informations système')
                        .setDescription('Détails techniques du serveur')
                        .setColor(0x5865F2)
                        .setTimestamp()
                        .addFields(
                            {
                                name: '🔧 Node.js',
                                value: `**Version:** ${process.version}\n**Plateforme:** ${process.platform}\n**Architecture:** ${process.arch}`,
                                inline: true
                            },
                            {
                                name: '💾 Mémoire',
                                value: `**Utilisée:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n**Total:** ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB\n**RSS:** ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
                                inline: true
                            },
                            {
                                name: '⏱️ Processus',
                                value: `**PID:** ${process.pid}\n**Uptime:** ${Math.floor(process.uptime())}s\n**CPU:** ${process.cpuUsage().user}μs`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [systemMessage] });
                }
                
                // Boutons de la commande serverinfo
                else if (customId === 'serverinfo_refresh') {
                    const guild = interaction.guild;
                    const owner = await guild.fetchOwner();
                    
                    const refreshedMessage = new EmbedBuilder()
                        .setTitle(`🏰 ${guild.name} (Actualisé)`)
                        .setDescription(`Informations actualisées sur le serveur`)
                        .setColor(0x57F287)
                        .setTimestamp()
                        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                        .addFields(
                            {
                                name: '👑 Propriétaire',
                                value: `${owner.user.tag}`,
                                inline: true
                            },
                            {
                                name: '📅 Créé le',
                                value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                                inline: true
                            },
                            {
                                name: '👥 Membres',
                                value: `${guild.memberCount}`,
                                inline: true
                            },
                            {
                                name: '📺 Canaux',
                                value: `${guild.channels.cache.size}`,
                                inline: true
                            },
                            {
                                name: '😀 Emojis',
                                value: `${guild.emojis.cache.size}`,
                                inline: true
                            },
                            {
                                name: '🎭 Rôles',
                                value: `${guild.roles.cache.size}`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [refreshedMessage] });
                }
                
                else if (customId === 'serverinfo_icon') {
                    const guild = interaction.guild;
                    const iconMessage = new EmbedBuilder()
                        .setTitle(`🖼️ Icône de ${guild.name}`)
                        .setDescription(guild.iconURL() ? 'Voici l\'icône du serveur en haute qualité' : 'Ce serveur n\'a pas d\'icône')
                        .setColor(0x5865F2)
                        .setTimestamp()
                        .setImage(guild.iconURL({ dynamic: true, size: 1024 }));
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [iconMessage] });
                }
                
                else if (customId === 'serverinfo_stats') {
                    const guild = interaction.guild;
                    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
                    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
                    const categories = guild.channels.cache.filter(c => c.type === 4).size;
                    
                    const statsMessage = new EmbedBuilder()
                        .setTitle(`📊 Statistiques de ${guild.name}`)
                        .setDescription('Statistiques détaillées du serveur')
                        .setColor(0xFEE75C)
                        .setTimestamp()
                        .addFields(
                            {
                                name: '📺 Canaux détaillés',
                                value: `**Texte:** ${textChannels}\n**Vocal:** ${voiceChannels}\n**Catégories:** ${categories}`,
                                inline: true
                            },
                            {
                                name: '👥 Membres détaillés',
                                value: `**Total:** ${guild.memberCount}\n**En ligne:** ${guild.members.cache.filter(m => m.presence?.status !== 'offline').size}\n**Bots:** ${guild.members.cache.filter(m => m.user.bot).size}`,
                                inline: true
                            },
                            {
                                name: '🔐 Sécurité',
                                value: `**Niveau:** ${guild.verificationLevel}\n**Filtre:** ${guild.explicitContentFilter}\n**MFA:** ${guild.mfaLevel ? 'Activé' : 'Désactivé'}`,
                                inline: true
                            },
                            {
                                name: '🎭 Rôles et emojis',
                                value: `**Rôles:** ${guild.roles.cache.size}\n**Emojis:** ${guild.emojis.cache.size}\n**Stickers:** ${guild.stickers.cache.size}`,
                                inline: true
                            },
                            {
                                name: '🚀 Boosts',
                                value: `**Niveau:** ${guild.premiumTier}\n**Boosts:** ${guild.premiumSubscriptionCount}\n**Boosters:** ${guild.members.cache.filter(m => m.premiumSince).size}`,
                                inline: true
                            },
                            {
                                name: '📝 Région et ID',
                                value: `**ID:** ${guild.id}\n**Créé:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                                inline: true
                            }
                        );
                    
                    // Note: Boutons retirés temporairement
                    await interaction.update({ embeds: [statsMessage] });
                }
                
                // Autres boutons...
                else {
                    await interaction.reply({
                        content: '⚠️ Action de bouton non implémentée.',
                        ephemeral: true
                    });
                }
                
            } catch (error) {
                console.error(`❌ Erreur lors du traitement du bouton ${customId}:`, error);
                
                const errorMessage = new EmbedBuilder()
                    .setTitle('Erreur de bouton')
                    .setDescription('Une erreur s\'est produite lors du traitement de cette action.')
                    .setColor(0xFF0000)
                    .setTimestamp();

                try {
                    await interaction.reply({ embeds: [errorMessage], ephemeral: true });
                } catch (replyError) {
                    console.error('❌ Erreur lors de l\'envoi du message d\'erreur:', replyError);
                }
            }
        }
        
        // Gestion des menus de sélection
        else if (interaction.isStringSelectMenu()) {
            const customId = interaction.customId;
            const selectedValues = interaction.values;
            
            console.log(`📋 Menu sélectionné: ${customId} avec valeurs: ${selectedValues.join(', ')} par ${interaction.user.tag}`);
            
            try {
                // Logique pour les menus spécifiques
                if (customId === 'language_select') {
                    const lang = selectedValues[0];
                    // TODO: Sauvegarder la langue dans la base de données
                    
                    const langNames = {
                        'fr': 'Français 🇫🇷',
                        'en': 'English 🇺🇸',
                        'es': 'Español 🇪🇸'
                    };
                    
                    const successMessage = new EmbedBuilder()
                        .setTitle('Langue modifiée')
                        .setDescription(`La langue a été changée en ${langNames[lang] || lang}`)
                        .setColor(0x00FF00)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [successMessage], ephemeral: true });
                }
                
                // Autres menus...
                else {
                    await interaction.reply({
                        content: '⚠️ Action de menu non implémentée.',
                        ephemeral: true
                    });
                }
                
            } catch (error) {
                console.error(`❌ Erreur lors du traitement du menu ${customId}:`, error);
                
                const errorMessage = new EmbedBuilder()
                    .setTitle('Erreur de menu')
                    .setDescription('Une erreur s\'est produite lors du traitement de cette sélection.')
                    .setColor(0xFF0000)
                    .setTimestamp();

                try {
                    await interaction.reply({ embeds: [errorMessage], ephemeral: true });
                } catch (replyError) {
                    console.error('❌ Erreur lors de l\'envoi du message d\'erreur:', replyError);
                }
            }
        }
    }
};