const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');
const axios = require('axios');

module.exports = {
    category: 'Premium',
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('🤖 Posez une question à l\'IA / Ask a question to AI')
        .setDescriptionLocalizations({
            'en-US': '🤖 Ask a question to AI',
            'es-ES': '🤖 Hacer una pregunta a la IA'
        })
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Votre question pour l\'IA')
                .setDescriptionLocalizations({
                    'en-US': 'Your question for the AI',
                    'es-ES': 'Tu pregunta para la IA'
                })
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addStringOption(option =>
            option.setName('model')
                .setDescription('Modèle d\'IA à utiliser')
                .setDescriptionLocalizations({
                    'en-US': 'AI model to use',
                    'es-ES': 'Modelo de IA a usar'
                })
                .addChoices(
                    { name: 'GPT-4 (Recommandé)', value: 'gpt-4' },
                    { name: 'GPT-3.5 Turbo (Rapide)', value: 'gpt-3.5-turbo' },
                    { name: 'Claude-3 Sonnet', value: 'claude-3-sonnet' },
                    { name: 'Gemini Pro', value: 'gemini-pro' }
                )
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('Réponse visible uniquement par vous')
                .setDescriptionLocalizations({
                    'en-US': 'Response visible only to you',
                    'es-ES': 'Respuesta visible solo para ti'
                })
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const question = interaction.options.getString('question');
        const model = interaction.options.getString('model') || 'gpt-4';
        const isPrivate = interaction.options.getBoolean('private') || false;
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ Fonctionnalités IA désactivées',
                description: 'Les fonctionnalités d\'intelligence artificielle ne sont pas configurées sur ce bot.',
                fields: [
                    {
                        name: '💡 Information',
                        value: 'Contactez l\'administrateur du bot pour activer ces fonctionnalités.'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        // Créer le message de chargement
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🤖 IA en cours de réflexion...',
            description: `**Question:** ${question}\n**Modèle:** ${model}`,
            fields: [
                {
                    name: '⏳ Statut',
                    value: '🔄 Génération de la réponse en cours...'
                }
            ],
            color: '#ffaa00'
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            let response;
            const startTime = Date.now();
            
            // Préparer le contexte système
            const systemPrompt = `Tu es un assistant IA intelligent et utile. Tu réponds de manière claire, précise et détaillée. Tu peux répondre à toutes sortes de questions sur n'importe quel sujet. Adapte ton niveau de langage à la question posée. Si la question est en français, réponds en français. Si elle est en anglais, réponds en anglais. Si elle est en espagnol, réponds en espagnol.`;
            
            // Appeler l'API selon le modèle choisi
            if (model.startsWith('gpt')) {
                const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });
                
                response = openaiResponse.data.choices[0].message.content;
            } else if (model.startsWith('claude')) {
                const anthropicResponse = await axios.post('https://api.anthropic.com/v1/messages', {
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: 2000,
                    messages: [
                        { role: 'user', content: `${systemPrompt}\n\nQuestion: ${question}` }
                    ]
                }, {
                    headers: {
                        'x-api-key': process.env.ANTHROPIC_API_KEY,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 30000
                });
                
                response = anthropicResponse.data.content[0].text;
            } else if (model.startsWith('gemini')) {
                const geminiResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\nQuestion: ${question}`
                        }]
                    }]
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });
                
                response = geminiResponse.data.candidates[0].content.parts[0].text;
            }
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Diviser la réponse si elle est trop longue
            const chunks = ModernComponents.splitLongText(response, 1800);
            
            // Créer le message de réponse principal
            const responseMessage = ModernComponents.createSuccessMessage({
                title: '🤖 Réponse de l\'IA',
                description: `**Question:** ${question}\n**Modèle:** ${model} • **Temps:** ${responseTime}ms`,
                fields: [
                    {
                        name: '💬 Réponse',
                        value: chunks[0]
                    }
                ],
                buttons: [
                    {
                        customId: `ask_regenerate_${Date.now()}`,
                        label: '🔄 Régénérer',
                        style: 2
                    },
                    {
                        customId: `ask_continue_${Date.now()}`,
                        label: '➡️ Continuer',
                        style: 1
                    },
                    {
                        customId: `ask_translate_${Date.now()}`,
                        label: '🌐 Traduire',
                        style: 2
                    }
                ]
            });
            
            await interaction.editReply(responseMessage);
            
            // Envoyer les chunks supplémentaires si nécessaire
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpMessage = ModernComponents.createContainer({
                        components: [
                            ModernComponents.createTextDisplay({
                                content: chunks[i],
                                style: 'paragraph'
                            })
                        ]
                    });
                    
                    await interaction.followUp({ ...followUpMessage, ephemeral: isPrivate });
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'appel à l\'API IA:', error);
            
            let errorTitle = '❌ Erreur de l\'IA';
            let errorDescription = 'Une erreur est survenue lors de la génération de la réponse.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorTitle = '🔑 Erreur d\'authentification';
                    errorDescription = 'Clé API invalide ou expirée.';
                } else if (error.response.status === 429) {
                    errorTitle = '⏰ Limite de taux atteinte';
                    errorDescription = 'Trop de requêtes. Veuillez réessayer dans quelques minutes.';
                } else if (error.response.status === 500) {
                    errorTitle = '🔧 Erreur du serveur IA';
                    errorDescription = 'Le service IA rencontre des difficultés techniques.';
                }
            } else if (error.code === 'ECONNABORTED') {
                errorTitle = '⏱️ Timeout';
                errorDescription = 'La requête a pris trop de temps. Veuillez réessayer.';
            }
            
            const errorMessage = ModernComponents.createErrorMessage({
                title: errorTitle,
                description: errorDescription,
                fields: [
                    {
                        name: '🔧 Détails techniques',
                        value: `**Modèle:** ${model}\n**Erreur:** ${error.message || 'Erreur inconnue'}`
                    },
                    {
                        name: '💡 Solutions',
                        value: '• Vérifiez votre question\n• Essayez un autre modèle\n• Réessayez dans quelques minutes'
                    }
                ],
                buttons: [
                    {
                        customId: `ask_retry_${Date.now()}`,
                        label: '🔄 Réessayer',
                        style: 2
                    }
                ]
            });
            
            await interaction.editReply(errorMessage);
        }
    }
};