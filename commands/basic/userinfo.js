const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 Affiche les informations d\'un utilisateur / Show user information')
        .setDescriptionLocalizations({
            'en-US': '👤 Show user information',
            'es-ES': '👤 Mostrar información del usuario'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Utilisateur dont afficher les informations')
                .setDescriptionLocalizations({
                    'en-US': 'User to show information for',
                    'es-ES': 'Usuario para mostrar información'
                })
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        
        // Calculer les dates
        const accountCreated = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedServer = member ? Math.floor(member.joinedTimestamp / 1000) : null;
        
        // Obtenir les rôles (si c'est un membre du serveur)
        let rolesText = 'Aucun rôle';
        if (member && member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 10); // Limiter à 10 rôles
            
            rolesText = roles.join(', ');
            if (member.roles.cache.size > 11) {
                rolesText += ` et ${member.roles.cache.size - 11} autre(s)...`;
            }
        }
        
        // Déterminer le statut
        const presence = member?.presence;
        let statusEmoji = '⚫';
        let statusText = 'Hors ligne';
        
        if (presence) {
            switch (presence.status) {
                case 'online':
                    statusEmoji = '🟢';
                    statusText = 'En ligne';
                    break;
                case 'idle':
                    statusEmoji = '🟡';
                    statusText = 'Absent';
                    break;
                case 'dnd':
                    statusEmoji = '🔴';
                    statusText = 'Ne pas déranger';
                    break;
            }
        }
        
        // Obtenir les permissions importantes
        let keyPermissions = [];
        if (member) {
            if (member.permissions.has('Administrator')) keyPermissions.push('👑 Administrateur');
            if (member.permissions.has('ManageGuild')) keyPermissions.push('⚙️ Gérer le serveur');
            if (member.permissions.has('ManageChannels')) keyPermissions.push('📝 Gérer les salons');
            if (member.permissions.has('ManageMessages')) keyPermissions.push('🗑️ Gérer les messages');
            if (member.permissions.has('KickMembers')) keyPermissions.push('👢 Expulser des membres');
            if (member.permissions.has('BanMembers')) keyPermissions.push('🔨 Bannir des membres');
        }
        
        // Créer les champs d'information
        const fields = [
            {
                name: '📊 Informations générales',
                value: `**ID:** ${targetUser.id}\n**Nom d'utilisateur:** ${targetUser.username}\n**Nom d'affichage:** ${targetUser.displayName || targetUser.username}\n**Statut:** ${statusEmoji} ${statusText}`
            },
            {
                name: '📅 Dates importantes',
                value: `**Compte créé:** <t:${accountCreated}:F>\n**Compte créé:** <t:${accountCreated}:R>${joinedServer ? `\n**A rejoint le serveur:** <t:${joinedServer}:F>\n**A rejoint:** <t:${joinedServer}:R>` : ''}`
            }
        ];
        
        if (member) {
            fields.push({
                name: '🎭 Rôles du serveur',
                value: rolesText
            });
            
            if (keyPermissions.length > 0) {
                fields.push({
                    name: '🔑 Permissions importantes',
                    value: keyPermissions.join('\n')
                });
            }
            
            // Informations sur le boost
            if (member.premiumSince) {
                const boostingSince = Math.floor(member.premiumSinceTimestamp / 1000);
                fields.push({
                    name: '💎 Nitro Boost',
                    value: `**Boost depuis:** <t:${boostingSince}:F>\n**Boost depuis:** <t:${boostingSince}:R>`
                });
            }
        }
        
        // Déterminer la couleur basée sur le rôle le plus élevé
        let color = '#5865F2';
        if (member && member.displayHexColor !== '#000000') {
            color = member.displayHexColor;
        }
        
        // Créer l'embed avec les informations
        const userInfoEmbed = {
            title: `👤 Informations de ${targetUser.displayName || targetUser.username}`,
            description: `Voici les informations détaillées de ${targetUser.toString()}`,
            fields: fields,
            color: color,
            thumbnail: {
                url: targetUser.displayAvatarURL({ dynamic: true, size: 256 })
            }
        };
        
        // Créer les boutons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`userinfo_refresh_${targetUser.id}`)
                    .setLabel('🔄 Actualiser')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`userinfo_avatar_${targetUser.id}`)
                    .setLabel('🖼️ Avatar')
                    .setStyle(ButtonStyle.Primary)
            );
        
        await interaction.editReply({
            embeds: [userInfoEmbed],
            components: [actionRow]
        });
    }
};