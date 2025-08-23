const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');
const axios = require('axios');

module.exports = {
    category: 'Premium',
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('🎨 Génère une image avec l\'IA / Generate an image with AI')
        .setDescriptionLocalizations({
            'en-US': '🎨 Generate an image with AI',
            'es-ES': '🎨 Generar una imagen con IA'
        })
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Description de l\'image à générer')
                .setDescriptionLocalizations({
                    'en-US': 'Description of the image to generate',
                    'es-ES': 'Descripción de la imagen a generar'
                })
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Style artistique de l\'image')
                .setDescriptionLocalizations({
                    'en-US': 'Artistic style of the image',
                    'es-ES': 'Estilo artístico de la imagen'
                })
                .addChoices(
                    { name: '🎨 Réaliste', value: 'realistic' },
                    { name: '🖼️ Artistique', value: 'artistic' },
                    { name: '📱 Digital Art', value: 'digital' },
                    { name: '🎭 Anime/Manga', value: 'anime' },
                    { name: '🖌️ Peinture à l\'huile', value: 'oil_painting' },
                    { name: '✏️ Croquis', value: 'sketch' },
                    { name: '🌈 Fantastique', value: 'fantasy' },
                    { name: '🤖 Cyberpunk', value: 'cyberpunk' }
                )
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('size')
                .setDescription('Taille de l\'image')
                .setDescriptionLocalizations({
                    'en-US': 'Image size',
                    'es-ES': 'Tamaño de la imagen'
                })
                .addChoices(
                    { name: '1024x1024 (Carré)', value: '1024x1024' },
                    { name: '1792x1024 (Paysage)', value: '1792x1024' },
                    { name: '1024x1792 (Portrait)', value: '1024x1792' }
                )
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('quality')
                .setDescription('Qualité de l\'image')
                .setDescriptionLocalizations({
                    'en-US': 'Image quality',
                    'es-ES': 'Calidad de la imagen'
                })
                .addChoices(
                    { name: '🔥 HD (Haute qualité)', value: 'hd' },
                    { name: '⚡ Standard (Rapide)', value: 'standard' }
                )
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('Image visible uniquement par vous')
                .setDescriptionLocalizations({
                    'en-US': 'Image visible only to you',
                    'es-ES': 'Imagen visible solo para ti'
                })
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const prompt = interaction.options.getString('prompt');
        const style = interaction.options.getString('style') || 'realistic';
        const size = interaction.options.getString('size') || '1024x1024';
        const quality = interaction.options.getString('quality') || 'standard';
        const isPrivate = interaction.options.getBoolean('private') || false;
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.OPENAI_API_KEY) {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ Génération d\'images désactivée',
                description: 'La génération d\'images par IA n\'est pas configurée sur ce bot.',
                fields: [
                    {
                        name: '💡 Information',
                        value: 'Contactez l\'administrateur du bot pour activer cette fonctionnalité.'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        // Améliorer le prompt selon le style
        const stylePrompts = {
            realistic: 'photorealistic, high quality, detailed',
            artistic: 'artistic, creative, expressive, masterpiece',
            digital: 'digital art, modern, clean, professional',
            anime: 'anime style, manga, japanese animation, vibrant colors',
            oil_painting: 'oil painting, classical art, textured brushstrokes',
            sketch: 'pencil sketch, hand-drawn, artistic lines',
            fantasy: 'fantasy art, magical, mystical, enchanted',
            cyberpunk: 'cyberpunk, futuristic, neon lights, sci-fi'
        };
        
        const enhancedPrompt = `${prompt}, ${stylePrompts[style]}, high quality, detailed`;
        
        // Créer le message de chargement
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🎨 Génération d\'image en cours...',
            description: `**Prompt:** ${prompt}\n**Style:** ${style}\n**Taille:** ${size}\n**Qualité:** ${quality}`,
            fields: [
                {
                    name: '⏳ Statut',
                    value: '🔄 L\'IA crée votre image...\n⏱️ Cela peut prendre 10-30 secondes'
                },
                {
                    name: '🎯 Prompt amélioré',
                    value: `\`\`\`${enhancedPrompt}\`\`\``
                }
            ],
            color: '#ff6b6b'
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            const startTime = Date.now();
            
            // Appeler l'API DALL-E 3
            const response = await axios.post('https://api.openai.com/v1/images/generations', {
                model: 'dall-e-3',
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: quality,
                response_format: 'url'
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 secondes pour la génération d'image
            });
            
            const endTime = Date.now();
            const generationTime = Math.round((endTime - startTime) / 1000);
            
            const imageUrl = response.data.data[0].url;
            const revisedPrompt = response.data.data[0].revised_prompt || enhancedPrompt;
            
            // Créer le message de succès avec l'image
            const successMessage = ModernComponents.createSuccessMessage({
                title: '🎨 Image générée avec succès !',
                description: `**Prompt original:** ${prompt}\n**Style:** ${style} • **Temps:** ${generationTime}s`,
                fields: [
                    {
                        name: '🤖 Prompt révisé par l\'IA',
                        value: `\`\`\`${revisedPrompt.substring(0, 1000)}${revisedPrompt.length > 1000 ? '...' : ''}\`\`\``
                    },
                    {
                        name: '📊 Détails techniques',
                        value: `**Modèle:** DALL-E 3\n**Résolution:** ${size}\n**Qualité:** ${quality}\n**Format:** PNG`
                    }
                ],
                image: imageUrl,
                buttons: [
                    {
                        customId: `image_regenerate_${Date.now()}`,
                        label: '🔄 Régénérer',
                        style: 2
                    },
                    {
                        customId: `image_variation_${Date.now()}`,
                        label: '🎲 Variation',
                        style: 1
                    },
                    {
                        customId: `image_download_${Date.now()}`,
                        label: '💾 Télécharger',
                        style: 2,
                        url: imageUrl
                    }
                ]
            });
            
            await interaction.editReply(successMessage);
            
        } catch (error) {
            console.error('Erreur lors de la génération d\'image:', error);
            
            let errorTitle = '❌ Erreur de génération';
            let errorDescription = 'Une erreur est survenue lors de la génération de l\'image.';
            let solutions = [];
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                if (status === 400) {
                    errorTitle = '⚠️ Prompt invalide';
                    errorDescription = 'Le prompt contient du contenu non autorisé ou est mal formaté.';
                    solutions = [
                        '• Évitez le contenu violent ou explicite',
                        '• Simplifiez votre description',
                        '• Utilisez des termes plus généraux'
                    ];
                } else if (status === 401) {
                    errorTitle = '🔑 Erreur d\'authentification';
                    errorDescription = 'Clé API invalide ou expirée.';
                } else if (status === 429) {
                    errorTitle = '⏰ Limite de taux atteinte';
                    errorDescription = 'Trop de requêtes. Veuillez réessayer dans quelques minutes.';
                } else if (status === 500) {
                    errorTitle = '🔧 Erreur du serveur';
                    errorDescription = 'Le service de génération d\'images rencontre des difficultés.';
                }
                
                if (errorData?.error?.message) {
                    errorDescription += `\n\n**Détail:** ${errorData.error.message}`;
                }
            } else if (error.code === 'ECONNABORTED') {
                errorTitle = '⏱️ Timeout';
                errorDescription = 'La génération a pris trop de temps. Veuillez réessayer.';
                solutions = [
                    '• Simplifiez votre prompt',
                    '• Essayez une taille d\'image plus petite',
                    '• Réessayez dans quelques minutes'
                ];
            }
            
            const fields = [
                {
                    name: '🔧 Détails techniques',
                    value: `**Prompt:** ${prompt}\n**Style:** ${style}\n**Erreur:** ${error.message || 'Erreur inconnue'}`
                }
            ];
            
            if (solutions.length > 0) {
                fields.push({
                    name: '💡 Solutions',
                    value: solutions.join('\n')
                });
            }
            
            const errorMessage = ModernComponents.createErrorMessage({
                title: errorTitle,
                description: errorDescription,
                fields: fields,
                buttons: [
                    {
                        customId: `image_retry_${Date.now()}`,
                        label: '🔄 Réessayer',
                        style: 2
                    },
                    {
                        customId: `image_modify_${Date.now()}`,
                        label: '✏️ Modifier le prompt',
                        style: 1
                    }
                ]
            });
            
            await interaction.editReply(errorMessage);
        }
    }
};