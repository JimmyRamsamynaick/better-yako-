const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('details')
                        .setDescription('Nom du rôle (pour les items personnalisés)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Couleur hexadécimale (ex: #FF0000) (pour rôle perso Gold)')
                        .setRequired(false)))
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
                .addIntegerOption(option => option.setName('amount').setDescription('Montant').setRequired(true))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Récupérer la langue pour les traductions manuelles
        const guildData = await Guild.findOne({ guildId });
        const lang = guildData?.language || 'fr';

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

            const response = await ComponentsV3.createEmbed({
                guildId,
                titleKey: 'shop.list.title',
                contentKey: 'shop.list.desc',
                additionalContent,
                ephemeral: false
            });

            return interaction.reply(response);
        }

        if (subcommand === 'buy') {
            const itemId = interaction.options.getInteger('id');
            const details = interaction.options.getString('details');
            const colorInput = interaction.options.getString('color');
            
            const economy = await EconomyManager.getEconomy(guildId);
            const item = economy.shopItems.find(i => i.id === itemId);

            if (!item) {
                return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.not_found'));
            }

            const balance = await EconomyManager.getBalance(guildId, interaction.user.id);
            if (balance < item.price) {
                return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.insufficient_funds', { balance, price: item.price }));
            }

            // Gestion des stocks (si != -1)
            if (item.stock !== -1 && item.stock <= 0) {
                return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.out_of_stock'));
            }

            // Logique spécifique par type d'item
            if (item.type === 'role_color') {
                // Vérifier/Créer le rôle couleur
                let role = interaction.guild.roles.cache.find(r => r.name === item.name && r.color === parseInt(item.color.replace('#', ''), 16));
                
                if (!role) {
                    try {
                        role = await interaction.guild.roles.create({
                            name: item.name,
                            color: item.color,
                            reason: `Achat boutique par ${interaction.user.tag}`
                        });
                    } catch (e) {
                        return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.role_create'));
                    }
                }

                // Attribuer le rôle
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(role);
                } catch (e) {
                    return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.role_create'));
                }
            } else if (item.type === 'role_custom') {
                if (!details) {
                    return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.no_details'));
                }

                let color = '#99AAB5'; // Gris par défaut
                if (item.id === 12 || item.id === 13) { // Gold ou Diamant
                    if (!colorInput) {
                        return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.no_color'));
                    }
                    if (!/^#[0-9A-F]{6}$/i.test(colorInput)) {
                        return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.invalid_color'));
                    }
                    color = colorInput;
                }

                try {
                    const role = await interaction.guild.roles.create({
                        name: details,
                        color: color,
                        reason: `Achat rôle perso par ${interaction.user.tag}`
                    });
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await member.roles.add(role);
                } catch (e) {
                    return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.error.role_create'));
                }
            }

            // Débiter l'utilisateur
            await EconomyManager.removeCoins(guildId, interaction.user.id, item.price);
            
            // Décrémenter stock si nécessaire
            if (item.stock > 0) {
                item.stock--;
                await economy.save();
            }

            const successMsg = LanguageManager.get(lang, 'shop.success.desc', { 
                user: interaction.user.toString(), 
                item: item.name, 
                price: item.price, 
                balance: balance - item.price 
            });

            return interaction.reply(await ComponentsV3.successEmbed(guildId, 'shop.success.title', successMsg, false));
        }

        if (subcommand === 'give' || subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.admin.no_perm'));
            }

            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            if (subcommand === 'give') {
                await EconomyManager.addCoins(guildId, target.id, amount);
                const msg = LanguageManager.get(lang, 'shop.admin.give_success', { amount, user: target.toString() });
                
                return interaction.reply(await ComponentsV3.createEmbed({
                    guildId,
                    additionalContent: [msg],
                    ephemeral: false
                }));
            } else {
                const result = await EconomyManager.removeCoins(guildId, target.id, amount);
                if (result === false) {
                    return interaction.reply(await ComponentsV3.errorEmbed(guildId, 'shop.admin.remove_fail'));
                }
                const msg = LanguageManager.get(lang, 'shop.admin.remove_success', { amount, user: target.toString() });
                
                return interaction.reply(await ComponentsV3.createEmbed({
                    guildId,
                    additionalContent: [msg],
                    ephemeral: false
                }));
            }
        }
    }
};
