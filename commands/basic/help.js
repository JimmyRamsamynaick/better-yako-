const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');

module.exports = {
    category: 'Basic',
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Affiche l\'aide et toutes les commandes / Show help and all commands')
        .setDescriptionLocalizations({
            'en-US': '📚 Show help and all commands',
            'es-ES': '📚 Mostrar ayuda y todos los comandos'
        })
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Commande spécifique pour laquelle obtenir de l\'aide')
                .setDescriptionLocalizations({
                    'en-US': 'Specific command to get help for',
                    'es-ES': 'Comando específico para obtener ayuda'
                })
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const specificCommand = interaction.options.getString('command');
        
        if (specificCommand) {
            // Aide pour une commande spécifique
            const command = client.commands.get(specificCommand);
            
            if (!command) {
                const errorMessage = ModernComponents.createErrorMessage({
                    title: 'Commande introuvable',
                    description: `La commande \`${specificCommand}\` n'existe pas.`
                });
                
                return await interaction.editReply(errorMessage);
            }
            
            const commandHelp = ModernComponents.createInfoMessage({
                title: `📖 Aide pour /${command.data.name}`,
                description: command.data.description,
                fields: [
                    {
                        name: '📝 Utilisation',
                        value: `\`/${command.data.name}\``
                    },
                    {
                        name: '📂 Catégorie',
                        value: command.category || 'Non définie'
                    }
                ],
                color: '#5865F2'
            });
            
            return await interaction.editReply(commandHelp);
        }
        
        // Aide générale - organiser les commandes par catégorie
        const commandsByCategory = {};
        
        client.commands.forEach(command => {
            const category = command.category || 'Autre';
            if (!commandsByCategory[category]) {
                commandsByCategory[category] = [];
            }
            commandsByCategory[category].push({
                name: command.data.name,
                description: command.data.description
            });
        });
        
        // Créer les champs pour chaque catégorie
        const fields = [];
        const categoryEmojis = {
            'Basic': '🔧',
            'Premium': '💎',
            'Admin': '⚙️',
            'Moderation': '🛡️',
            'Music': '🎵',
            'Fun': '🎮',
            'Utility': '🛠️',
            'AI': '🤖',
            'Autre': '📁'
        };
        
        Object.entries(commandsByCategory).forEach(([category, commands]) => {
            const emoji = categoryEmojis[category] || '📁';
            const commandList = commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description.split(' / ')[0]}`).join('\n');
            
            fields.push({
                name: `${emoji} ${category}`,
                value: commandList || 'Aucune commande'
            });
        });
        
        // Créer le message d'aide principal
        const helpMessage = ModernComponents.createInfoMessage({
            title: '📚 Better Yako v2 - Aide',
            description: `Bienvenue dans Better Yako v2 ! Voici toutes les commandes disponibles :\n\n**Total des commandes:** ${client.commands.size}\n**Serveurs:** ${client.guilds.cache.size}\n**Utilisateurs:** ${client.users.cache.size}`,
            fields: fields,
            color: '#5865F2',
            buttons: [
                {
                    customId: 'help_basic',
                    label: '🔧 Commandes de base',
                    style: 1
                },
                {
                    customId: 'help_premium',
                    label: '💎 Premium',
                    style: 1
                },
                {
                    customId: 'help_language',
                    label: '🌍 Changer la langue',
                    style: 2
                }
            ]
        });
        
        await interaction.editReply(helpMessage);
    }
};