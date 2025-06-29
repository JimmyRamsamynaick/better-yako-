const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime un nombre spécifié de messages dans le salon')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Supprimer uniquement les messages de cet utilisateur')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Chargement de la langue
        const guildLang = JSON.parse(fs.readFileSync('./data/guildLang.json', 'utf8'));
        const lang = guildLang[interaction.guild.id] || 'fr';
        const langFile = JSON.parse(fs.readFileSync(`./lang/Lang_${lang}.json`, 'utf8'));

        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.clear.no_permission_title)
                .setDescription(langFile.clear.no_permission_desc)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Vérification des permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.clear.bot_no_permission_title)
                .setDescription(langFile.clear.bot_no_permission_desc)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const amount = interaction.options.getInteger('nombre');
        const targetUser = interaction.options.getUser('utilisateur');

        try {
            await interaction.deferReply({ ephemeral: true });

            let messages;
            if (targetUser) {
                // Récupérer plus de messages pour filtrer ceux de l'utilisateur spécifique
                const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
                messages = fetchedMessages.filter(msg => msg.author.id === targetUser.id).first(amount);
            } else {
                messages = await interaction.channel.messages.fetch({ limit: amount });
            }

            if (messages.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FF8C00')
                    .setTitle('⚠️ ' + langFile.clear.no_messages_title)
                    .setDescription(langFile.clear.no_messages_desc)
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // Filtrer les messages de plus de 14 jours (limitation Discord)
            const filteredMessages = messages.filter(msg => 
                Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
            );

            if (filteredMessages.size === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FF8C00')
                    .setTitle('⚠️ ' + langFile.clear.messages_too_old_title)
                    .setDescription(langFile.clear.messages_too_old_desc)
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // Suppression des messages
            const deletedMessages = await interaction.channel.bulkDelete(filteredMessages, true);

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ ' + langFile.clear.success_title)
                .setDescription(targetUser ? 
                    langFile.clear.success_desc_user
                        .replace('{count}', deletedMessages.size)
                        .replace('{user}', targetUser.username) :
                    langFile.clear.success_desc
                        .replace('{count}', deletedMessages.size))
                .addFields([
                    {
                        name: langFile.clear.moderator,
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: langFile.clear.channel,
                        value: `<#${interaction.channel.id}>`,
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: 'Yako Bot', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            await interaction.editReply({ embeds: [embed] });

            // Log dans le salon de logs si configuré
            try {
                const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('🗑️ ' + langFile.clear.log_title)
                        .addFields([
                            {
                                name: langFile.clear.moderator,
                                value: `<@${interaction.user.id}> (${interaction.user.tag})`,
                                inline: true
                            },
                            {
                                name: langFile.clear.channel,
                                value: `<#${interaction.channel.id}>`,
                                inline: true
                            },
                            {
                                name: langFile.clear.messages_deleted,
                                value: deletedMessages.size.toString(),
                                inline: true
                            }
                        ])
                        .setTimestamp();
                    
                    if (targetUser) {
                        logEmbed.addFields([{
                            name: langFile.clear.target_user,
                            value: `<@${targetUser.id}> (${targetUser.tag})`,
                            inline: true
                        }]);
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (logError) {
                console.error('Erreur lors de l\'envoi du log:', logError);
            }

        } catch (error) {
            console.error('Erreur lors de la suppression des messages:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.clear.error_title)
                .setDescription(langFile.clear.error_desc)
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};