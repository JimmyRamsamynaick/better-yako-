const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Affiche l\'avatar d\'un utilisateur / Show user avatar')
        .setDescriptionLocalizations({
            'en-US': '🖼️ Show user avatar',
            'es-ES': '🖼️ Mostrar avatar del usuario'
        })
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Utilisateur dont afficher l\'avatar')
                .setDescriptionLocalizations({
                    'en-US': 'User to show avatar for',
                    'es-ES': 'Usuario para mostrar avatar'
                })
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('size')
                .setDescription('Taille de l\'avatar')
                .setDescriptionLocalizations({
                    'en-US': 'Avatar size',
                    'es-ES': 'Tamaño del avatar'
                })
                .addChoices(
                    { name: '64x64', value: '64' },
                    { name: '128x128', value: '128' },
                    { name: '256x256', value: '256' },
                    { name: '512x512', value: '512' },
                    { name: '1024x1024', value: '1024' },
                    { name: '2048x2048', value: '2048' },
                    { name: '4096x4096', value: '4096' }
                )
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const size = parseInt(interaction.options.getString('size')) || 1024;
        const member = interaction.guild.members.cache.get(targetUser.id);
        
        // URLs des avatars
        const globalAvatar = targetUser.displayAvatarURL({ dynamic: true, size: size });
        const serverAvatar = member?.avatarURL({ dynamic: true, size: size });
        
        // Déterminer le type d'avatar
        const hasCustomAvatar = targetUser.avatar !== null;
        const hasServerAvatar = member?.avatar !== null;
        
        // Créer les champs d'information
        const fields = [
            {
                name: '📊 Informations',
                value: `**Utilisateur:** ${targetUser.toString()}\n**Taille:** ${size}x${size}px\n**Type:** ${hasCustomAvatar ? '🎨 Avatar personnalisé' : '🤖 Avatar par défaut'}${hasServerAvatar ? '\n**Avatar de serveur:** ✅ Oui' : ''}`
            }
        ];
        
        // Ajouter les liens de téléchargement
        const downloadLinks = [];
        downloadLinks.push(`[PNG](${targetUser.displayAvatarURL({ extension: 'png', size: size })})`);
        downloadLinks.push(`[JPG](${targetUser.displayAvatarURL({ extension: 'jpg', size: size })})`);
        downloadLinks.push(`[WEBP](${targetUser.displayAvatarURL({ extension: 'webp', size: size })})`);
        
        if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
            downloadLinks.push(`[GIF](${targetUser.displayAvatarURL({ extension: 'gif', size: size })})`);
        }
        
        fields.push({
            name: '💾 Télécharger',
            value: downloadLinks.join(' • ')
        });
        
        // Créer les boutons
        const buttons = [
            {
                customId: `avatar_refresh_${targetUser.id}`,
                label: '🔄 Actualiser',
                style: 2
            },
            {
                customId: `avatar_sizes_${targetUser.id}`,
                label: '📏 Autres tailles',
                style: 2
            }
        ];
        
        // Ajouter un bouton pour l'avatar de serveur si disponible
        if (hasServerAvatar) {
            buttons.push({
                customId: `avatar_server_${targetUser.id}`,
                label: '🏰 Avatar serveur',
                style: 1
            });
        }
        
        // Créer le message avec EmbedBuilder
        const avatarMessage = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${targetUser.displayName || targetUser.username}`)
            .setDescription(`Avatar ${hasServerAvatar && serverAvatar !== globalAvatar ? 'global' : ''} de ${targetUser.toString()}`)
            .addFields(fields)
            .setColor(member?.displayHexColor || 0x5865F2)
            .setImage(globalAvatar)
            .setTimestamp();
        
        // Note: Boutons retirés temporairement
        await interaction.editReply({ embeds: [avatarMessage] });
    }
};