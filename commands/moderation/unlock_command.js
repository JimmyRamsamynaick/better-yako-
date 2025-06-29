const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverrouille un salon (autorise l\'envoi de messages)')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon à déverrouiller (salon actuel par défaut)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du déverrouillage')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Chargement de la langue
        const guildLang = JSON.parse(fs.readFileSync('./data/guildLang.json', 'utf8'));
        const lang = guildLang[interaction.guild.id] || 'fr';
        const langFile = JSON.parse(fs.readFileSync(`./lang/Lang_${lang}.json`, 'utf8'));

        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.unlock.no_permission_title)
                .setDescription(langFile.unlock.no_permission_desc)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Vérification des permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.unlock.bot_no_permission_title)
                .setDescription(langFile.unlock.bot_no_permission_desc)
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
        const reason = interaction.options.getString('raison') || langFile.unlock.default_reason;

        try {
            await interaction.deferReply();

            // Vérifier si le salon est déjà déverrouillé
            const everyoneRole = interaction.guild.roles.everyone;
            const permissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
            
            if (!permissions || permissions.allow.has(PermissionFlagsBits.SendMessages)) {
                const embed = new EmbedBuilder()
                    .setColor('#FF8C00')
                    .setTitle('⚠️ ' + langFile.unlock.already_unlocked_title)
                    .setDescription(langFile.unlock.already_unlocked_desc.replace('{channel}', targetChannel.toString()))
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }

            // Déverrouiller le salon
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null, // Supprimer la restriction
                SendMessagesInThreads: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null
            }, { reason: `${langFile.unlock.audit_reason} ${interaction.user.tag} - ${reason}` });

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 ' + langFile.unlock.success_title)
                .setDescription(langFile.unlock.success_desc.replace('{channel}', targetChannel.toString()))
                .addFields([
                    {
                        name: langFile.unlock.moderator,
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: langFile.unlock.reason,
                        value: reason,
                        inline: true
                    },
                    {
                        name: langFile.unlock.channel,
                        value: targetChannel.toString(),
                        inline: true
                    }
                ])
                .setTimestamp()
                .setFooter({ 
                    text: 'Yako Bot', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            await interaction.editReply({ embeds: [embed] });

            // Message dans le salon déverrouillé (si différent du salon actuel)
            if (targetChannel.id !== interaction.channel.id && targetChannel.type === ChannelType.GuildText) {
                try {
                    const channelEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔓 ' + langFile.unlock.channel_unlocked_title)
                        .setDescription(langFile.unlock.channel_unlocked_desc)
                        .addFields([
                            {
                                name: langFile.unlock.moderator,
                                value: `<@${interaction.user.id}>`,
                                inline: true
                            },
                            {
                                name: langFile.unlock.reason,
                                value: reason,
                                inline: true
                            }
                        ])
                        .setTimestamp();

                    await targetChannel.send({ embeds: [channelEmbed] });
                } catch (channelError) {
                    console.error('Erreur lors de l\'envoi du message dans le salon déverrouillé:', channelError);
                }
            }

            // Log dans le salon de logs si configuré
            try {
                const logChannel = interaction.guild.channels.cache.find(ch => ch.name === 'yako-logs');
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔓 ' + langFile.unlock.log_title)
                        .addFields([
                            {
                                name: langFile.unlock.moderator,
                                value: `<@${interaction.user.id}> (${interaction.user.tag})`,
                                inline: true
                            },
                            {
                                name: langFile.unlock.channel,
                                value: `<#${targetChannel.id}> (${targetChannel.name})`,
                                inline: true
                            },
                            {
                                name: langFile.unlock.reason,
                                value: reason,
                                inline: false
                            }
                        ])
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (logError) {
                console.error('Erreur lors de l\'envoi du log:', logError);
            }

        } catch (error) {
            console.error('Erreur lors du déverrouillage du salon:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ ' + langFile.unlock.error_title)
                .setDescription(langFile.unlock.error_desc)
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};