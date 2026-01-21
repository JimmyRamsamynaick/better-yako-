const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');

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

        if (subcommand === 'list') {
            const economy = await EconomyManager.getEconomy(guildId);
            const items = economy.shopItems.sort((a, b) => a.id - b.id);

            const embed = new EmbedBuilder()
                .setTitle('🛒 Boutique Yako')
                .setColor('#FFD700')
                .setDescription('Utilisez `/shop buy <id>` pour acheter un item.');

            let cosmetics = items.filter(i => i.type === 'role_color').map(i => `**ID ${i.id}** - ${i.name} : \`${i.price} 🪙\``).join('\n');
            let roles = items.filter(i => i.type === 'role_custom').map(i => `**ID ${i.id}** - ${i.name} : \`${i.price} 🪙\`\n*${i.description}*`).join('\n\n');

            if (cosmetics) embed.addFields({ name: '🎨 Cosmétiques (Couleurs)', value: cosmetics });
            if (roles) embed.addFields({ name: '🎭 Rôles Personnalisés', value: roles });

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'buy') {
            const itemId = interaction.options.getInteger('id');
            const details = interaction.options.getString('details');
            const colorInput = interaction.options.getString('color');
            
            const economy = await EconomyManager.getEconomy(guildId);
            const item = economy.shopItems.find(i => i.id === itemId);

            if (!item) {
                return interaction.reply({ content: '❌ Item introuvable.', ephemeral: true });
            }

            const balance = await EconomyManager.getBalance(guildId, interaction.user.id);
            if (balance < item.price) {
                return interaction.reply({ content: `❌ Solde insuffisant. Vous avez ${balance} 🪙, il vous en faut ${item.price}.`, ephemeral: true });
            }

            // Gestion des stocks (si != -1)
            if (item.stock !== -1 && item.stock <= 0) {
                return interaction.reply({ content: '❌ Cet item est en rupture de stock.', ephemeral: true });
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
                        return interaction.reply({ content: '❌ Erreur lors de la création du rôle. Vérifiez mes permissions.', ephemeral: true });
                    }
                }

                // Attribuer le rôle
                try {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    // Retirer les autres rôles couleur si nécessaire ? (Optionnel, ici on ajoute juste)
                    await member.roles.add(role);
                } catch (e) {
                    return interaction.reply({ content: '❌ Impossible de vous donner le rôle.', ephemeral: true });
                }
            } else if (item.type === 'role_custom') {
                if (!details) {
                    return interaction.reply({ content: '❌ Vous devez spécifier un nom pour votre rôle personnalisé dans l\'option `details`.', ephemeral: true });
                }

                let color = '#99AAB5'; // Gris par défaut
                if (item.id === 12 || item.id === 13) { // Gold ou Diamant
                    if (!colorInput) {
                        return interaction.reply({ content: '❌ Vous devez spécifier une couleur hex (ex: #FF0000) pour ce rôle.', ephemeral: true });
                    }
                    if (!/^#[0-9A-F]{6}$/i.test(colorInput)) {
                        return interaction.reply({ content: '❌ Format de couleur invalide. Utilisez le format hexadécimal (ex: #FF0000).', ephemeral: true });
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
                    return interaction.reply({ content: '❌ Erreur lors de la création du rôle personnalisé.', ephemeral: true });
                }
            }

            // Débiter l'utilisateur
            await EconomyManager.removeCoins(guildId, interaction.user.id, item.price);
            
            // Décrémenter stock si nécessaire
            if (item.stock > 0) {
                item.stock--;
                await economy.save();
            }

            const embed = new EmbedBuilder()
                .setTitle('🧾 Achat confirmé !')
                .setColor('#00FF00')
                .setDescription(`Félicitations ${interaction.user} !\nVous avez acheté **${item.name}** pour \`${item.price} 🪙\`.\n\n*Votre nouveau solde : ${balance - item.price} 🪙*`)
                .setThumbnail(interaction.user.displayAvatarURL());

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'give' || subcommand === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ Vous n\'avez pas la permission.', ephemeral: true });
            }

            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            if (subcommand === 'give') {
                await EconomyManager.addCoins(guildId, target.id, amount);
                return interaction.reply({ content: `✅ **${amount} 🪙** ajoutés au compte de ${target}.` });
            } else {
                const result = await EconomyManager.removeCoins(guildId, target.id, amount);
                if (result === false) {
                    return interaction.reply({ content: `❌ Impossible de retirer ce montant (solde insuffisant ou erreur).`, ephemeral: true });
                }
                return interaction.reply({ content: `✅ **${amount} 🪙** retirés du compte de ${target}.` });
            }
        }
    }
};