const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('🏰 Affiche les informations du serveur / Show server information')
        .setDescriptionLocalizations({
            'en-US': '🏰 Show server information',
            'es-ES': '🏰 Mostrar información del servidor'
        }),
    
    async execute(interaction, client, getTranslation) {
        await interaction.deferReply();
        const guild = interaction.guild;
        
        // Calculer les statistiques des membres
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(member => 
            member.presence?.status === 'online' || 
            member.presence?.status === 'idle' || 
            member.presence?.status === 'dnd'
        ).size;
        const botMembers = guild.members.cache.filter(member => member.user.bot).size;
        const humanMembers = totalMembers - botMembers;
        
        // Calculer les statistiques des salons
        const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
        const categories = guild.channels.cache.filter(channel => channel.type === 4).size;
        const totalChannels = textChannels + voiceChannels;
        
        // Informations sur les rôles
        const totalRoles = guild.roles.cache.size - 1; // -1 pour exclure @everyone
        const hoistedRoles = guild.roles.cache.filter(role => role.hoist).size;
        
        // Niveau de vérification
        const verificationLevels = {
            0: '🔓 Aucune',
            1: '📧 Email vérifié',
            2: '⏰ Membre depuis 5 minutes',
            3: '⏰ Membre depuis 10 minutes',
            4: '📱 Numéro de téléphone vérifié'
        };
        
        // Niveau de filtre de contenu explicite
        const explicitFilters = {
            0: '🔓 Désactivé',
            1: '⚠️ Membres sans rôle',
            2: '🛡️ Tous les membres'
        };
        
        // Niveau de notification par défaut
        const defaultNotifications = {
            0: '📢 Tous les messages',
            1: '📌 Mentions uniquement'
        };
        
        // Fonctionnalités du serveur
        const features = [];
        if (guild.features.includes('COMMUNITY')) features.push('🏘️ Communauté');
        if (guild.features.includes('PARTNERED')) features.push('🤝 Partenaire Discord');
        if (guild.features.includes('VERIFIED')) features.push('✅ Vérifié');
        if (guild.features.includes('VANITY_URL')) features.push('🔗 URL personnalisée');
        if (guild.features.includes('BANNER')) features.push('🖼️ Bannière');
        if (guild.features.includes('ANIMATED_ICON')) features.push('🎬 Icône animée');
        if (guild.features.includes('INVITE_SPLASH')) features.push('🎨 Écran d\'invitation');
        if (guild.features.includes('DISCOVERABLE')) features.push('🔍 Découvrable');
        
        // Informations sur les boosts
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostEmojis = ['', '🥉', '🥈', '🥇'];
        
        // Dates importantes
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
        
        // Créer les champs d'information
        const fields = [
            {
                name: '👥 Membres',
                value: `**Total:** ${totalMembers.toLocaleString()}\n**Humains:** ${humanMembers.toLocaleString()}\n**Bots:** ${botMembers.toLocaleString()}\n**En ligne:** ${onlineMembers.toLocaleString()}`
            },
            {
                name: '📝 Salons',
                value: `**Total:** ${totalChannels}\n**Texte:** ${textChannels}\n**Vocal:** ${voiceChannels}\n**Catégories:** ${categories}`
            },
            {
                name: '🎭 Rôles',
                value: `**Total:** ${totalRoles}\n**Affichés séparément:** ${hoistedRoles}\n**Rôle le plus élevé:** ${guild.roles.highest.toString()}`
            },
            {
                name: '🛡️ Sécurité',
                value: `**Niveau de vérification:** ${verificationLevels[guild.verificationLevel]}\n**Filtre de contenu:** ${explicitFilters[guild.explicitContentFilter]}\n**Notifications par défaut:** ${defaultNotifications[guild.defaultMessageNotifications]}`
            },
            {
                name: '📊 Informations générales',
                value: `**ID:** ${guild.id}\n**Propriétaire:** <@${guild.ownerId}>\n**Région:** ${guild.preferredLocale || 'Non définie'}\n**Créé:** <t:${createdTimestamp}:F>\n**Créé:** <t:${createdTimestamp}:R>`
            }
        ];
        
        // Ajouter les informations sur les boosts si applicable
        if (boostLevel > 0 || boostCount > 0) {
            fields.push({
                name: '💎 Nitro Boost',
                value: `**Niveau:** ${boostEmojis[boostLevel]} Niveau ${boostLevel}\n**Nombre de boosts:** ${boostCount}\n**Boosteurs:** ${guild.premiumSubscriptionCount || 0}`
            });
        }
        
        // Ajouter les fonctionnalités si il y en a
        if (features.length > 0) {
            fields.push({
                name: '✨ Fonctionnalités',
                value: features.join('\n')
            });
        }
        
        // Créer le message avec EmbedBuilder
        const serverInfoMessage = new EmbedBuilder()
            .setTitle(`🏰 ${guild.name}`)
            .setDescription(`Informations détaillées du serveur ${guild.name}`)
            .addFields(fields)
            .setColor(0x5865F2)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setTimestamp();
        
        // Note: Boutons retirés temporairement
        await interaction.editReply({ embeds: [serverInfoMessage] });
    }
};