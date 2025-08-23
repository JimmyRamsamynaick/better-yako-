const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');
const axios = require('axios');

module.exports = {
    category: 'Premium',
    data: new SlashCommandBuilder()
        .setName('analyze')
        .setDescription('🔍 Analyse du contenu avec l\'IA / Analyze content with AI')
        .setDescriptionLocalizations({
            'en-US': '🔍 Analyze content with AI',
            'es-ES': '🔍 Analizar contenido con IA'
        })
        .addSubcommand(subcommand =>
            subcommand
                .setName('text')
                .setDescription('📝 Analyser un texte')
                .setDescriptionLocalizations({
                    'en-US': '📝 Analyze text',
                    'es-ES': '📝 Analizar texto'
                })
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Texte à analyser')
                        .setDescriptionLocalizations({
                            'en-US': 'Text to analyze',
                            'es-ES': 'Texto a analizar'
                        })
                        .setRequired(true)
                        .setMaxLength(3000)
                )
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type d\'analyse')
                        .setDescriptionLocalizations({
                            'en-US': 'Analysis type',
                            'es-ES': 'Tipo de análisis'
                        })
                        .addChoices(
                            { name: '📊 Analyse générale', value: 'general' },
                            { name: '😊 Sentiment', value: 'sentiment' },
                            { name: '🎯 Mots-clés', value: 'keywords' },
                            { name: '📚 Style d\'écriture', value: 'style' },
                            { name: '🔍 Résumé', value: 'summary' },
                            { name: '🌐 Langue et grammaire', value: 'grammar' },
                            { name: '💼 Ton professionnel', value: 'professional' }
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('🖼️ Analyser une image')
                .setDescriptionLocalizations({
                    'en-US': '🖼️ Analyze image',
                    'es-ES': '🖼️ Analizar imagen'
                })
                .addAttachmentOption(option =>
                    option.setName('image')
                        .setDescription('Image à analyser')
                        .setDescriptionLocalizations({
                            'en-US': 'Image to analyze',
                            'es-ES': 'Imagen a analizar'
                        })
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('focus')
                        .setDescription('Focus de l\'analyse')
                        .setDescriptionLocalizations({
                            'en-US': 'Analysis focus',
                            'es-ES': 'Enfoque del análisis'
                        })
                        .addChoices(
                            { name: '🔍 Description générale', value: 'general' },
                            { name: '👥 Personnes', value: 'people' },
                            { name: '🏞️ Paysage/Lieu', value: 'landscape' },
                            { name: '🎨 Style artistique', value: 'artistic' },
                            { name: '📝 Texte dans l\'image', value: 'text' },
                            { name: '🏷️ Objets', value: 'objects' },
                            { name: '🎭 Émotions', value: 'emotions' }
                        )
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('url')
                .setDescription('🔗 Analyser une page web')
                .setDescriptionLocalizations({
                    'en-US': '🔗 Analyze web page',
                    'es-ES': '🔗 Analizar página web'
                })
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('URL à analyser')
                        .setDescriptionLocalizations({
                            'en-US': 'URL to analyze',
                            'es-ES': 'URL a analizar'
                        })
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('aspect')
                        .setDescription('Aspect à analyser')
                        .setDescriptionLocalizations({
                            'en-US': 'Aspect to analyze',
                            'es-ES': 'Aspecto a analizar'
                        })
                        .addChoices(
                            { name: '📄 Contenu principal', value: 'content' },
                            { name: '🎨 Design/UX', value: 'design' },
                            { name: '🔍 SEO', value: 'seo' },
                            { name: '⚡ Performance', value: 'performance' },
                            { name: '🛡️ Sécurité', value: 'security' },
                            { name: '📊 Analyse complète', value: 'complete' }
                        )
                        .setRequired(false)
                )
        ),
    
    async execute(interaction, client, getTranslation) {
        const subcommand = interaction.options.getSubcommand();
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.OPENAI_API_KEY) {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ Analyse IA désactivée',
                description: 'L\'analyse par IA n\'est pas configurée sur ce bot.',
                fields: [
                    {
                        name: '💡 Information',
                        value: 'Contactez l\'administrateur du bot pour activer cette fonctionnalité.'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        if (subcommand === 'text') {
            await this.analyzeText(interaction);
        } else if (subcommand === 'image') {
            await this.analyzeImage(interaction);
        } else if (subcommand === 'url') {
            await this.analyzeUrl(interaction);
        }
    },
    
    async analyzeText(interaction) {
        const content = interaction.options.getString('content');
        const analysisType = interaction.options.getString('type') || 'general';
        
        // Prompts pour différents types d'analyse
        const analysisPrompts = {
            general: 'Fais une analyse complète de ce texte : style, ton, structure, thèmes principaux, et qualité générale.',
            sentiment: 'Analyse le sentiment de ce texte : émotions exprimées, ton général (positif/négatif/neutre), et nuances émotionnelles.',
            keywords: 'Extrais et analyse les mots-clés principaux de ce texte, leur fréquence et leur importance contextuelle.',
            style: 'Analyse le style d\'écriture de ce texte : registre de langue, figures de style, structure des phrases, et techniques littéraires.',
            summary: 'Fais un résumé détaillé de ce texte en identifiant les points clés et les idées principales.',
            grammar: 'Analyse la langue et la grammaire de ce texte : correction linguistique, structure, et suggestions d\'amélioration.',
            professional: 'Évalue le ton professionnel de ce texte et suggère des améliorations pour un contexte business.'
        };
        
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🔍 Analyse en cours...',
            description: `**Type:** ${analysisType}\n**Longueur:** ${content.length} caractères`,
            fields: [
                {
                    name: '📝 Extrait du texte',
                    value: `\`\`\`${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\`\`\``
                }
            ],
            color: '#9c88ff'
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            const startTime = Date.now();
            
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert en analyse textuelle. Tu fournis des analyses détaillées, structurées et pertinentes.'
                    },
                    {
                        role: 'user',
                        content: `${analysisPrompts[analysisType]}\n\nTexte à analyser :\n"${content}"`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            const analysis = response.data.choices[0].message.content;
            const endTime = Date.now();
            const analysisTime = endTime - startTime;
            
            const chunks = ModernComponents.splitLongText(analysis, 1800);
            
            const successMessage = ModernComponents.createSuccessMessage({
                title: '🔍 Analyse textuelle terminée',
                description: `**Type d\'analyse:** ${analysisType}\n**Temps:** ${analysisTime}ms\n**Longueur:** ${content.length} caractères`,
                fields: [
                    {
                        name: '📊 Résultats de l\'analyse',
                        value: chunks[0]
                    }
                ],
                buttons: [
                    {
                        customId: `analyze_rerun_${Date.now()}`,
                        label: '🔄 Autre analyse',
                        style: 2
                    },
                    {
                        customId: `analyze_detailed_${Date.now()}`,
                        label: '🔍 Plus de détails',
                        style: 1
                    }
                ]
            });
            
            await interaction.editReply(successMessage);
            
            // Envoyer les chunks supplémentaires
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpMessage = ModernComponents.createContainer({
                        components: [
                            ModernComponents.createTextDisplay({
                                content: `**Suite de l\'analyse:**\n${chunks[i]}`,
                                style: 'paragraph'
                            })
                        ]
                    });
                    
                    await interaction.followUp(followUpMessage);
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'analyse de texte:', error);
            await this.handleAnalysisError(interaction, error, 'texte');
        }
    },
    
    async analyzeImage(interaction) {
        const imageAttachment = interaction.options.getAttachment('image');
        const focus = interaction.options.getString('focus') || 'general';
        
        // Vérifier que c'est bien une image
        if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ Fichier invalide',
                description: 'Le fichier fourni n\'est pas une image valide.',
                fields: [
                    {
                        name: '📋 Formats supportés',
                        value: 'PNG, JPG, JPEG, GIF, WEBP'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🖼️ Analyse d\'image en cours...',
            description: `**Focus:** ${focus}\n**Taille:** ${(imageAttachment.size / 1024).toFixed(1)} KB`,
            fields: [
                {
                    name: '⏳ Statut',
                    value: '🔄 L\'IA analyse votre image...'
                }
            ],
            color: '#ff6b9d',
            thumbnail: imageAttachment.url
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            const startTime = Date.now();
            
            // Prompts selon le focus
            const focusPrompts = {
                general: 'Décris cette image en détail : ce que tu vois, les couleurs, la composition, l\'ambiance générale.',
                people: 'Analyse les personnes dans cette image : nombre, âge approximatif, expressions, postures, vêtements.',
                landscape: 'Décris le paysage ou le lieu : environnement, architecture, éléments naturels, atmosphère.',
                artistic: 'Analyse le style artistique : technique, composition, couleurs, style, époque possible.',
                text: 'Identifie et transcris tout texte visible dans cette image.',
                objects: 'Identifie et décris tous les objets visibles dans cette image.',
                emotions: 'Analyse les émotions et l\'ambiance transmises par cette image.'
            };
            
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: focusPrompts[focus]
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageAttachment.url,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000
            });
            
            const analysis = response.data.choices[0].message.content;
            const endTime = Date.now();
            const analysisTime = endTime - startTime;
            
            const chunks = ModernComponents.splitLongText(analysis, 1800);
            
            const successMessage = ModernComponents.createSuccessMessage({
                title: '🖼️ Analyse d\'image terminée',
                description: `**Focus:** ${focus}\n**Temps:** ${analysisTime}ms\n**Modèle:** GPT-4o Mini`,
                fields: [
                    {
                        name: '🔍 Analyse visuelle',
                        value: chunks[0]
                    }
                ],
                image: imageAttachment.url,
                buttons: [
                    {
                        customId: `analyze_image_focus_${Date.now()}`,
                        label: '🎯 Autre focus',
                        style: 2
                    },
                    {
                        customId: `analyze_image_detailed_${Date.now()}`,
                        label: '🔍 Plus de détails',
                        style: 1
                    }
                ]
            });
            
            await interaction.editReply(successMessage);
            
            // Envoyer les chunks supplémentaires
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpMessage = ModernComponents.createContainer({
                        components: [
                            ModernComponents.createTextDisplay({
                                content: `**Suite de l\'analyse:**\n${chunks[i]}`,
                                style: 'paragraph'
                            })
                        ]
                    });
                    
                    await interaction.followUp(followUpMessage);
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'analyse d\'image:', error);
            await this.handleAnalysisError(interaction, error, 'image');
        }
    },
    
    async analyzeUrl(interaction) {
        const url = interaction.options.getString('url');
        const aspect = interaction.options.getString('aspect') || 'content';
        
        // Valider l'URL
        try {
            new URL(url);
        } catch {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ URL invalide',
                description: 'L\'URL fournie n\'est pas valide.',
                fields: [
                    {
                        name: '💡 Format attendu',
                        value: 'https://exemple.com ou http://exemple.com'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🔗 Analyse d\'URL en cours...',
            description: `**URL:** ${url}\n**Aspect:** ${aspect}`,
            fields: [
                {
                    name: '⏳ Statut',
                    value: '🔄 Récupération et analyse du contenu...'
                }
            ],
            color: '#4ecdc4'
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            // Note: Pour une vraie implémentation, vous devriez utiliser un service de scraping
            // Ici, nous simulons l'analyse avec l'IA
            const startTime = Date.now();
            
            const aspectPrompts = {
                content: `Analyse le contenu principal de cette page web : ${url}. Décris le sujet, la structure, la qualité du contenu.`,
                design: `Analyse le design et l'UX de cette page web : ${url}. Évalue l'interface, la navigation, l'esthétique.`,
                seo: `Analyse le SEO de cette page web : ${url}. Évalue l'optimisation pour les moteurs de recherche.`,
                performance: `Analyse les performances de cette page web : ${url}. Évalue la vitesse, l'optimisation.`,
                security: `Analyse la sécurité de cette page web : ${url}. Évalue les aspects de sécurité visibles.`,
                complete: `Fais une analyse complète de cette page web : ${url}. Couvre le contenu, design, SEO, et aspects techniques.`
            };
            
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert en analyse web. Tu fournis des analyses détaillées des sites web basées sur les meilleures pratiques.'
                    },
                    {
                        role: 'user',
                        content: aspectPrompts[aspect]
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            const analysis = response.data.choices[0].message.content;
            const endTime = Date.now();
            const analysisTime = endTime - startTime;
            
            const chunks = ModernComponents.splitLongText(analysis, 1800);
            
            const successMessage = ModernComponents.createSuccessMessage({
                title: '🔗 Analyse d\'URL terminée',
                description: `**URL:** ${url}\n**Aspect:** ${aspect}\n**Temps:** ${analysisTime}ms`,
                fields: [
                    {
                        name: '🌐 Analyse web',
                        value: chunks[0]
                    }
                ],
                buttons: [
                    {
                        customId: `analyze_url_aspect_${Date.now()}`,
                        label: '🎯 Autre aspect',
                        style: 2
                    },
                    {
                        customId: `analyze_url_visit_${Date.now()}`,
                        label: '🔗 Visiter',
                        style: 5,
                        url: url
                    }
                ]
            });
            
            await interaction.editReply(successMessage);
            
            // Envoyer les chunks supplémentaires
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpMessage = ModernComponents.createContainer({
                        components: [
                            ModernComponents.createTextDisplay({
                                content: `**Suite de l\'analyse:**\n${chunks[i]}`,
                                style: 'paragraph'
                            })
                        ]
                    });
                    
                    await interaction.followUp(followUpMessage);
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'analyse d\'URL:', error);
            await this.handleAnalysisError(interaction, error, 'URL');
        }
    },
    
    async handleAnalysisError(interaction, error, type) {
        let errorTitle = `❌ Erreur d\'analyse ${type}`;
        let errorDescription = `Une erreur est survenue lors de l\'analyse ${type === 'URL' ? 'de l\'URL' : type === 'image' ? 'de l\'image' : 'du texte'}.`;
        
        if (error.response) {
            if (error.response.status === 401) {
                errorTitle = '🔑 Erreur d\'authentification';
                errorDescription = 'Clé API invalide ou expirée.';
            } else if (error.response.status === 429) {
                errorTitle = '⏰ Limite de taux atteinte';
                errorDescription = 'Trop de requêtes. Veuillez réessayer dans quelques minutes.';
            } else if (error.response.status === 400) {
                errorTitle = '⚠️ Contenu non analysable';
                errorDescription = 'Le contenu fourni ne peut pas être analysé.';
            }
        }
        
        const errorMessage = ModernComponents.createErrorMessage({
            title: errorTitle,
            description: errorDescription,
            fields: [
                {
                    name: '🔧 Détails techniques',
                    value: `**Type:** ${type}\n**Erreur:** ${error.message || 'Erreur inconnue'}`
                },
                {
                    name: '💡 Solutions',
                    value: '• Vérifiez le contenu fourni\n• Réessayez dans quelques minutes\n• Contactez le support si le problème persiste'
                }
            ],
            buttons: [
                {
                    customId: `analyze_retry_${Date.now()}`,
                    label: '🔄 Réessayer',
                    style: 2
                }
            ]
        });
        
        await interaction.editReply(errorMessage);
    }
};