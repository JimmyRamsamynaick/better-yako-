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
                .setDescription('🧠 Modèle d\'IA à utiliser / AI model to use')
                .setDescriptionLocalizations({
                    'en-US': '🧠 AI model to use',
                    'es-ES': '🧠 Modelo de IA a usar'
                })
                .addChoices(
                    { name: '🤗 Llama 3.1 8B (Recommandé)', value: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
                    { name: '⚡ Mistral 7B (Rapide)', value: 'mistralai/Mistral-7B-Instruct-v0.3' },
                    { name: '🧠 Qwen 2.5 7B', value: 'Qwen/Qwen2.5-7B-Instruct' },
                    { name: '💎 Phi 3.5 Mini', value: 'microsoft/Phi-3.5-mini-instruct' }
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
            
            // Appeler l'API Hugging Face Inference
            const huggingfaceResponse = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
                inputs: `${systemPrompt}\n\nUser: ${question}\nAssistant:`,
                parameters: {
                    max_new_tokens: 1000,
                    temperature: 0.7,
                    do_sample: true,
                    top_p: 0.9,
                    repetition_penalty: 1.1
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            // Extraire la réponse selon le format de retour
            if (Array.isArray(huggingfaceResponse.data)) {
                response = huggingfaceResponse.data[0].generated_text;
                // Nettoyer la réponse en supprimant le prompt initial
                const assistantIndex = response.lastIndexOf('Assistant:');
                if (assistantIndex !== -1) {
                    response = response.substring(assistantIndex + 10).trim();
                }
            } else {
                response = huggingfaceResponse.data.generated_text || 'Désolé, je n\'ai pas pu générer de réponse.';
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
                    errorDescription = 'Clé API Hugging Face invalide ou expirée.';
                } else if (error.response.status === 429) {
                    errorTitle = '⏰ Limite de taux atteinte';
                    errorDescription = 'Vous avez atteint la limite de requêtes de l\'API Hugging Face. Veuillez patienter avant de réessayer.';
                    
                    // Ajouter des informations sur le temps d'attente recommandé
                    const retryAfter = error.response.headers['retry-after'];
                    if (retryAfter) {
                        errorDescription += ` Temps d'attente recommandé: ${retryAfter} secondes.`;
                    } else {
                        errorDescription += ' Temps d\'attente recommandé: 60 secondes.';
                    }
                } else if (error.response.status === 503) {
                    errorTitle = '🔄 Modèle en cours de chargement';
                    errorDescription = 'Le modèle est en cours de chargement sur Hugging Face. Veuillez réessayer dans quelques minutes.';
                } else if (error.response.status === 500) {
                    errorTitle = '🔧 Erreur du serveur Hugging Face';
                    errorDescription = 'Le service Hugging Face rencontre des difficultés techniques.';
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
                        value: error.response?.status === 429 
                            ? '• Attendez quelques minutes avant de réessayer\n• Utilisez un autre modèle d\'IA\n• Réduisez la fréquence de vos requêtes'
                            : '• Vérifiez votre question\n• Essayez un autre modèle\n• Réessayez dans quelques minutes'
                    }
                )
                .setColor('#ff6b6b')
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};