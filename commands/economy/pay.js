const { SlashCommandBuilder } = require('discord.js');
const EconomyManager = require('../../utils/economyManager');
const { ComponentsV3 } = require('../../utils/ComponentsV3');
const LanguageManager = require('../../utils/languageManager');
const Guild = require('../../models/Guild');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transférer des coins à un autre utilisateur')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('L\'utilisateur à qui donner des coins')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Le montant à transférer')
                .setMinValue(1)
                .setRequired(true)),
    
    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        // Récupérer la langue
        const guildData = await Guild.findOne({ guildId });
        const lang = guildData?.language || 'fr';

        // Vérifications de base
        if (target.id === interaction.user.id) {
            return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'pay.error.self_transfer'));
        }

        if (target.bot) {
            return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'pay.error.bot_transfer'));
        }

        const senderBalance = await EconomyManager.getBalance(guildId, interaction.user.id);
        if (senderBalance < amount) {
            return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'pay.error.insufficient_funds', { balance: Math.floor(senderBalance), amount }));
        }

        // Effectuer le transfert
        // 1. Retirer au sender
        const removeResult = await EconomyManager.removeCoins(guildId, interaction.user.id, amount);
        if (!removeResult) {
            return interaction.editReply(await ComponentsV3.errorEmbed(guildId, 'pay.error.transaction_failed'));
        }

        // 2. Ajouter au receiver
        await EconomyManager.addCoins(guildId, target.id, amount);

        // Logs
        if (guildData?.shopLogs?.enabled && guildData.shopLogs.channelId) {
            try {
                const logChannel = interaction.guild.channels.cache.get(guildData.shopLogs.channelId);
                if (logChannel) {
                    const logEmbed = {
                        title: '💸 Transfert d\'argent',
                        color: 0x3498DB, // Bleu
                        fields: [
                            { name: 'Expéditeur', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                            { name: 'Destinataire', value: `${target.tag} (${target.id})`, inline: true },
                            { name: 'Montant', value: `${amount} 🪙`, inline: true },
                            { name: 'Date', value: `<t:${Math.floor(Date.now() / 1000)}:f>` }
                        ]
                    };
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (err) {
                console.error('Erreur log pay:', err);
            }
        }

        // Confirmation
        const successMsg = LanguageManager.get(lang, 'pay.success.desc', { 
            sender: interaction.user.toString(),
            target: target.toString(),
            amount: amount
        });

        return interaction.editReply(await ComponentsV3.successEmbed(guildId, 'pay.success.title', successMsg, false));
    }
};
