const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
                    { name: 'GPT-3.5 Turbo (Recommandé)', value: 'gpt-3.5-turbo' },
                    { name: 'GPT-4o Mini (Rapide)', value: 'gpt-4o-mini' },
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
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('private') || false });
        
        const question = interaction.options.getString('question');
        const model = interaction.options.getString('model') || 'gpt-3.5-turbo';
        const isPrivate = interaction.options.getBoolean('private') || false;
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Fonctionnalités IA désactivées')
                .setDescription('Les fonctionnalités d\'intelligence artificielle ne sont pas configurées sur ce bot.')
                .addFields({
                    name: '💡 Information',
                    value: 'Contactez l\'administrateur du bot pour activer ces fonctionnalités.'
                })
                .setColor('#ff6b6b')
                .setTimestamp();
            
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
        
        // Créer le message de chargement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🤖 IA en cours de réflexion...')
            .setDescription(`**Question:** ${question}\n**Modèle:** ${model}`)
            .addFields({
                name: '⏳ Statut',
                value: '🔄 Génération de la réponse en cours...'
            })
            .setColor('#ffaa00')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [loadingEmbed] });
        
        try {
            let response;
            const startTime = Date.now();
            
            // Préparer le contexte système
            const systemPrompt = `Tu es YAKO, un assistant IA amical, intelligent et serviable. Tu réponds TOUJOURS aux questions, même les plus simples ou personnelles. Tu peux parler de tout : comment tu vas, ton âge, ton nom, tes goûts, etc. Sois créatif et engageant dans tes réponses. Tu as une personnalité chaleureuse et tu aimes aider les utilisateurs. Réponds dans la même langue que la question posée.`;
            
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
            const chunks = [];
            if (response.length <= 1800) {
                chunks.push(response);
            } else {
                for (let i = 0; i < response.length; i += 1800) {
                    chunks.push(response.slice(i, i + 1800));
                }
            }
            
            // Créer le message de réponse principal
            const responseEmbed = new EmbedBuilder()
                .setTitle('🤖 Réponse de l\'IA')
                .setDescription(`**Question:** ${question}\n**Modèle:** ${model} • **Temps:** ${responseTime}ms`)
                .addFields({
                    name: '💬 Réponse',
                    value: chunks[0]
                })
                .setColor('#51cf66')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [responseEmbed], ephemeral: isPrivate });
            
            // Envoyer les chunks supplémentaires si nécessaire
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpEmbed = new EmbedBuilder()
                        .setDescription(chunks[i])
                        .setColor('#51cf66');
                    
                    await interaction.followUp({ embeds: [followUpEmbed], ephemeral: isPrivate });
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
            
            const errorEmbed = new EmbedBuilder()
                .setTitle(errorTitle)
                .setDescription(errorDescription)
                .addFields(
                    {
                        name: '🔧 Détails techniques',
                        value: `**Modèle:** ${model}\n**Erreur:** ${error.message || 'Erreur inconnue'}`
                    },
                    {
                        name: '💡 Solutions',
                        value: '• Vérifiez votre question\n• Essayez un autre modèle\n• Réessayez dans quelques minutes'
                    }
                )
                .setColor('#ff6b6b')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};