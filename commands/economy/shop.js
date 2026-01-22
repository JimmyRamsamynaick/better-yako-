const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Système de boutique et d\'économie')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Affiche les items disponibles dans la boutique'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Acheter un item')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID de l\'item à acheter')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Donner des coins (Admin)')
                .addUserOption(option => option.setName('user').setDescription('Utilisateur').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retirer des coins (Admin)')
                .addUserOption(option => option.setName('user').setDescription('Utilisateur').setRequired(true))
                .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlogs')
                .setDescription('Configurer le salon de logs pour les achats (Admin)')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Le salon où envoyer les logs d\'achat')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),
    
    async execute(interaction) {
        // Defer l'interaction immédiatement pour éviter les timeouts (10062)
        // ephemeral: false car la plupart des commandes sont publiques
        await interaction.deferReply({ ephemeral: false });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Récupérer la langue pour les traductions manuelles
        const guildData = await Guild.findOne({ guildId });
        const lang = guildData?.language || 'fr';

        if (subcommand === 'setlogs') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.admin.no_perm'));
            }

            const channel = interaction.options.getChannel('channel');
            
            // Mise à jour de la configuration
            if (!guildData.shopLogs) guildData.shopLogs = {};
            guildData.shopLogs.channelId = channel.id;
            guildData.shopLogs.enabled = true;
            await guildData.save();

            return interaction.editReply(await ComponentsV3.successEmbed(guildId, 'shop.logs.success_title', 
                LanguageManager.get(lang, 'shop.logs.success_desc', { channel: channel.toString() })
            ));
        }

        if (subcommand === 'list') {
            const economy = await EconomyManager.getEconomy(guildId);
            const items = economy.shopItems.sort((a, b) => a.id - b.id);

            let cosmetics = items.filter(i => i.type === 'role_color').map(i => `**ID ${i.id}** - ${i.name} : \`${i.price} 🪙\``).join('\n');
            let roles = items.filter(i => i.type === 'role_custom').map(i => `**ID ${i.id}** - ${i.name} : \`${i.price} 🪙\`\n*${i.description}*`).join('\n\n');

            const additionalContent = [];
            
            if (cosmetics) {
                additionalContent.push({ type: 'text', key: 'shop.list.cosmetics' });
                additionalContent.push(cosmetics);
            }
            
            if (roles) {
                if (cosmetics) additionalContent.push({ type: 'divider' });
                additionalContent.push({ type: 'text', key: 'shop.list.roles' });
                additionalContent.push(roles);
            }

            // Ajout de la note pour les rôles personnalisés
            if (roles) {
                additionalContent.push({ type: 'divider' });
                additionalContent.push({ type: 'text', key: 'shop.list.custom_role_note' });
            }

            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'shop.list.title',
                contentKey: 'shop.list.desc',
                additionalContent,
                ephemeral: false
            });

            return interaction.editReply(response);
        }

        if (subcommand === 'buy') {
            const itemId = interaction.options.getInteger('id');
            
            const economy = await EconomyManager.getEconomy(guildId);
            const item = economy.shopItems.find(i => i.id === itemId);

            if (!item) {
                return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.error.not_found'));
            }

            const balance = await EconomyManager.getBalance(guildId, interaction.user.id);
            if (balance < item.price) {
                return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.error.insufficient_funds', { balance, price: item.price }));
            }

            // Gestion des stocks (si != -1)
            if (item.stock !== -1 && item.stock <= 0) {
                return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.error.out_of_stock'));
            }

            // Logique spécifique par type d'item
            if (item.type === 'role_color') {
                // Vérifier/Créer le rôle couleur
                // Modification: Recherche uniquement par nom pour éviter les doublons si la couleur diffère légèrement
                let role = interaction.guild.roles.cache.find(r => r.name === item.name);
                
                if (!role) {
                    try {
                        role = await interaction.guild.roles.create({
                            name: item.name,
                            color: item.color,
                            reason: `Achat boutique par ${interaction.user.tag}`
                        });
                    } catch (e) {
                        return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.error.role_create'));
                    }
                }

                // Attribuer le rôle
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(role);
                } catch (e) {
                    return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.error.role_create'));
                }
            } else if (item.type === 'role_custom') {
                // Pour les rôles personnalisés, on n'ajoute PAS le rôle automatiquement.
                // L'utilisateur doit ouvrir un ticket.
                // On ne vérifie plus details ni color
            }

            // Débiter l'utilisateur
            await EconomyManager.removeCoins(guildId, interaction.user.id, item.price);
            
            // Décrémenter stock si nécessaire
            if (item.stock > 0) {
                item.stock--;
                await economy.save();
            }

            // Choisir le message de succès approprié
            const successKey = item.type === 'role_custom' ? 'shop.success.custom_role_desc' : 'shop.success.desc';
            const successMsg = LanguageManager.get(lang, successKey, { 
                user: interaction.user.toString(), 
                item: item.name, 
                price: item.price, 
                balance: balance - item.price 
            });

            // Envoi du log d'achat si configuré
            if (guildData.shopLogs && guildData.shopLogs.enabled && guildData.shopLogs.channelId) {
                try {
                    const logChannel = interaction.guild.channels.cache.get(guildData.shopLogs.channelId);
                    if (logChannel) {
                        const logEmbed = {
                            title: '🛒 Nouvel achat boutique',
                            color: 0xFFA500, // Orange
                            fields: [
                                { name: 'Utilisateur', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                { name: 'Item', value: `${item.name} (ID: ${item.id})`, inline: true },
                                { name: 'Prix', value: `${item.price} 🪙`, inline: true },
                                { name: 'Nouveau solde', value: `${balance - item.price} 🪙`, inline: true },
                                { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
                            ]
                        };
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                } catch (err) {
                    console.error('Erreur lors de l\'envoi du log shop:', err);
                }
            }

            return interaction.editReply(await ComponentsV3.successEmbed(guildId, 'shop.success.title', successMsg, false));
        }

        if (subcommand === 'give' || subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.admin.no_perm'));
            }

            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            if (subcommand === 'give') {
                await EconomyManager.addCoins(guildId, target.id, amount);
                const msg = LanguageManager.get(lang, 'shop.admin.give_success', { amount, user: target.toString() });
                
                // Logs
                if (guildData?.shopLogs?.enabled && guildData.shopLogs.channelId) {
                    try {
                        const logChannel = interaction.guild.channels.cache.get(guildData.shopLogs.channelId);
                        if (logChannel) {
                            const logEmbed = {
                                title: '💰 Don d\'argent (Admin)',
                                color: 0x2ECC71, // Vert
                                fields: [
                                    { name: 'Admin', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                    { name: 'Bénéficiaire', value: `${target.tag} (${target.id})`, inline: true },
                                    { name: 'Montant', value: `+${amount} 🪙`, inline: true },
                                    { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
                                ]
                            };
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (err) {
                        console.error('Erreur log shop give:', err);
                    }
                }

                return interaction.editReply(await ComponentsV3.createEmbed({
                    guildId,
                    additionalContent: [msg],
                    ephemeral: false
                }));
            } else {
                const result = await EconomyManager.removeCoins(guildId, target.id, amount);
                if (result === false) {
                    return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'shop.admin.remove_fail'));
                }
                const msg = LanguageManager.get(lang, 'shop.admin.remove_success', { amount, user: target.toString() });
                
                // Logs
                if (guildData?.shopLogs?.enabled && guildData.shopLogs.channelId) {
                    try {
                        const logChannel = interaction.guild.channels.cache.get(guildData.shopLogs.channelId);
                        if (logChannel) {
                            const logEmbed = {
                                title: '💸 Retrait d\'argent (Admin)',
                                color: 0xE74C3C, // Rouge
                                fields: [
                                    { name: 'Admin', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                                    { name: 'Cible', value: `${target.tag} (${target.id})`, inline: true },
                                    { name: 'Montant', value: `-${amount} 🪙`, inline: true },
                                    { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
                                ]
                            };
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    } catch (err) {
                        console.error('Erreur log shop remove:', err);
                    }
                }

                return interaction.editReply(await ComponentsV3.createEmbed({
                    guildId,
                    additionalContent: [msg],
                    ephemeral: false
                }));
            }
        }
    }
};
