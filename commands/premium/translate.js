const { SlashCommandBuilder } = require('discord.js');
const ModernComponents = require('../../utils/modernComponents.js');
const axios = require('axios');

module.exports = {
    category: 'Premium',
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('🌐 Traduit un texte avec l\'IA / Translate text with AI')
        .setDescriptionLocalizations({
            'en-US': '🌐 Translate text with AI',
            'es-ES': '🌐 Traducir texto con IA'
        })
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Texte à traduire')
                .setDescriptionLocalizations({
                    'en-US': 'Text to translate',
                    'es-ES': 'Texto a traducir'
                })
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addStringOption(option =>
            option.setName('to')
                .setDescription('Langue de destination')
                .setDescriptionLocalizations({
                    'en-US': 'Target language',
                    'es-ES': 'Idioma de destino'
                })
                .addChoices(
                    { name: '🇫🇷 Français', value: 'french' },
                    { name: '🇺🇸 English', value: 'english' },
                    { name: '🇪🇸 Español', value: 'spanish' },
                    { name: '🇩🇪 Deutsch', value: 'german' },
                    { name: '🇮🇹 Italiano', value: 'italian' },
                    { name: '🇵🇹 Português', value: 'portuguese' },
                    { name: '🇷🇺 Русский', value: 'russian' },
                    { name: '🇯🇵 日本語', value: 'japanese' },
                    { name: '🇰🇷 한국어', value: 'korean' },
                    { name: '🇨🇳 中文', value: 'chinese' },
                    { name: '🇦🇪 العربية', value: 'arabic' },
                    { name: '🇮🇳 हिन्दी', value: 'hindi' }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('from')
                .setDescription('Langue source (auto-détection si non spécifiée)')
                .setDescriptionLocalizations({
                    'en-US': 'Source language (auto-detect if not specified)',
                    'es-ES': 'Idioma de origen (auto-detección si no se especifica)'
                })
                .addChoices(
                    { name: '🔍 Auto-détection', value: 'auto' },
                    { name: '🇫🇷 Français', value: 'french' },
                    { name: '🇺🇸 English', value: 'english' },
                    { name: '🇪🇸 Español', value: 'spanish' },
                    { name: '🇩🇪 Deutsch', value: 'german' },
                    { name: '🇮🇹 Italiano', value: 'italian' },
                    { name: '🇵🇹 Português', value: 'portuguese' },
                    { name: '🇷🇺 Русский', value: 'russian' },
                    { name: '🇯🇵 日本語', value: 'japanese' },
                    { name: '🇰🇷 한국어', value: 'korean' },
                    { name: '🇨🇳 中文', value: 'chinese' },
                    { name: '🇦🇪 العربية', value: 'arabic' },
                    { name: '🇮🇳 हिन्दी', value: 'hindi' }
                )
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('style')
                .setDescription('Style de traduction')
                .setDescriptionLocalizations({
                    'en-US': 'Translation style',
                    'es-ES': 'Estilo de traducción'
                })
                .addChoices(
                    { name: '📝 Standard', value: 'standard' },
                    { name: '🎩 Formel', value: 'formal' },
                    { name: '😊 Décontracté', value: 'casual' },
                    { name: '📚 Littéraire', value: 'literary' },
                    { name: '💼 Professionnel', value: 'professional' },
                    { name: '🎭 Créatif', value: 'creative' }
                )
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('private')
                .setDescription('Traduction visible uniquement par vous')
                .setDescriptionLocalizations({
                    'en-US': 'Translation visible only to you',
                    'es-ES': 'Traducción visible solo para ti'
                })
                .setRequired(false)
        ),
    
    async execute(interaction, client, getTranslation) {
        const text = interaction.options.getString('text');
        const targetLang = interaction.options.getString('to');
        const sourceLang = interaction.options.getString('from') || 'auto';
        const style = interaction.options.getString('style') || 'standard';
        const isPrivate = interaction.options.getBoolean('private') || false;
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.OPENAI_API_KEY) {
            const errorMessage = ModernComponents.createErrorMessage({
                title: '❌ Traduction IA désactivée',
                description: 'La traduction par IA n\'est pas configurée sur ce bot.',
                fields: [
                    {
                        name: '💡 Information',
                        value: 'Contactez l\'administrateur du bot pour activer cette fonctionnalité.'
                    }
                ]
            });
            
            return await interaction.editReply(errorMessage);
        }
        
        // Mappage des langues
        const languageMap = {
            french: 'français',
            english: 'anglais',
            spanish: 'espagnol',
            german: 'allemand',
            italian: 'italien',
            portuguese: 'portugais',
            russian: 'russe',
            japanese: 'japonais',
            korean: 'coréen',
            chinese: 'chinois',
            arabic: 'arabe',
            hindi: 'hindi'
        };
        
        // Mappage des styles
        const styleMap = {
            standard: 'de manière standard et naturelle',
            formal: 'de manière formelle et respectueuse',
            casual: 'de manière décontractée et familière',
            literary: 'avec un style littéraire et élégant',
            professional: 'avec un ton professionnel et technique',
            creative: 'avec créativité et expressivité'
        };
        
        // Créer le message de chargement
        const loadingMessage = ModernComponents.createInfoMessage({
            title: '🌐 Traduction en cours...',
            description: `**Texte:** ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n**De:** ${sourceLang === 'auto' ? '🔍 Auto-détection' : languageMap[sourceLang]}\n**Vers:** ${languageMap[targetLang]}\n**Style:** ${style}`,
            fields: [
                {
                    name: '⏳ Statut',
                    value: '🔄 L\'IA traduit votre texte...'
                }
            ],
            color: '#4dabf7'
        });
        
        await interaction.editReply(loadingMessage);
        
        try {
            const startTime = Date.now();
            
            // Construire le prompt de traduction
            let prompt;
            if (sourceLang === 'auto') {
                prompt = `Traduis le texte suivant en ${languageMap[targetLang]} ${styleMap[style]}. Détecte automatiquement la langue source et fournis une traduction précise et naturelle :\n\n"${text}"`;
            } else {
                prompt = `Traduis le texte suivant du ${languageMap[sourceLang]} vers le ${languageMap[targetLang]} ${styleMap[style]}. Fournis une traduction précise et naturelle :\n\n"${text}"`;
            }
            
            // Mapper les langues vers les codes ISO pour Hugging Face
            const langCodeMap = {
                'french': 'fr',
                'english': 'en',
                'spanish': 'es',
                'german': 'de',
                'italian': 'it',
                'portuguese': 'pt',
                'russian': 'ru',
                'japanese': 'ja',
                'korean': 'ko',
                'chinese': 'zh',
                'arabic': 'ar',
                'hindi': 'hi'
            };
            
            const targetCode = langCodeMap[targetLang];
            
            // Utiliser LibreTranslate (API gratuite et open source)
            const response = await axios.post(
                'https://libretranslate.de/translate',
                {
                    q: text,
                    source: sourceLang === 'auto' ? 'auto' : langCodeMap[sourceLang] || 'en',
                    target: targetCode,
                    format: 'text'
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );
            
            const translation = response.data.translatedText || text;
            const endTime = Date.now();
            const translationTime = endTime - startTime;
            
            // Détecter la langue source si auto-détection
            let detectedLang = sourceLang;
            if (sourceLang === 'auto') {
                // Demander à l'IA de détecter la langue
                try {
                    const detectResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: 'gpt-3.5-turbo',
                        messages: [
                            {
                                role: 'user',
                                content: `Détecte la langue de ce texte et réponds uniquement par le nom de la langue en français : "${text.substring(0, 200)}"`
                            }
                        ],
                        max_tokens: 50,
                        temperature: 0
                    }, {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    detectedLang = response.data.choices[0].message.content.toLowerCase().trim();
                } catch (error) {
                    detectedLang = 'Langue détectée';
                }
            }
            
            // Diviser la traduction si elle est trop longue
            const chunks = ModernComponents.splitLongText(translation, 1800);
            
            // Créer le message de succès
            const successMessage = ModernComponents.createSuccessMessage({
                title: '🌐 Traduction terminée !',
                description: `**Langue source:** ${sourceLang === 'auto' ? `🔍 ${detectedLang}` : languageMap[sourceLang]}\n**Langue cible:** ${languageMap[targetLang]}\n**Style:** ${style} • **Temps:** ${translationTime}ms`,
                fields: [
                    {
                        name: '📝 Texte original',
                        value: `\`\`\`${text.substring(0, 500)}${text.length > 500 ? '...' : ''}\`\`\``
                    },
                    {
                        name: '🌐 Traduction',
                        value: chunks[0]
                    }
                ],
                buttons: [
                    {
                        customId: `translate_reverse_${Date.now()}`,
                        label: '🔄 Traduction inverse',
                        style: 2
                    },
                    {
                        customId: `translate_alternative_${Date.now()}`,
                        label: '🎲 Alternative',
                        style: 1
                    },
                    {
                        customId: `translate_explain_${Date.now()}`,
                        label: '💡 Expliquer',
                        style: 2
                    }
                ]
            });
            
            await interaction.editReply(successMessage);
            
            // Envoyer les chunks supplémentaires si nécessaire
            if (chunks.length > 1) {
                for (let i = 1; i < chunks.length; i++) {
                    const followUpMessage = ModernComponents.createContainer({
                        components: [
                            ModernComponents.createTextDisplay({
                                content: `**Suite de la traduction:**\n${chunks[i]}`,
                                style: 'paragraph'
                            })
                        ]
                    });
                    
                    await interaction.followUp({ ...followUpMessage, ephemeral: isPrivate });
                }
            }
            
        } catch (error) {
            console.error('Erreur lors de la traduction:', error);
            
            let errorTitle = '❌ Erreur de traduction';
            let errorDescription = 'Une erreur est survenue lors de la traduction.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorTitle = '🔑 Erreur d\'authentification';
                    errorDescription = 'Clé API invalide ou expirée.';
                } else if (error.response.status === 429) {
                    errorTitle = '⏰ Limite de taux atteinte';
                    errorDescription = 'Trop de requêtes. Veuillez réessayer dans quelques minutes.';
                } else if (error.response.status === 500) {
                    errorTitle = '🔧 Erreur du serveur IA';
                    errorDescription = 'Le service de traduction rencontre des difficultés techniques.';
                }
            } else if (error.code === 'ECONNABORTED') {
                errorTitle = '⏱️ Timeout';
                errorDescription = 'La traduction a pris trop de temps. Veuillez réessayer.';
            }
            
            const errorMessage = ModernComponents.createErrorMessage({
                title: errorTitle,
                description: errorDescription,
                fields: [
                    {
                        name: '🔧 Détails techniques',
                        value: `**Langues:** ${sourceLang} → ${targetLang}\n**Style:** ${style}\n**Erreur:** ${error.message || 'Erreur inconnue'}`
                    },
                    {
                        name: '💡 Solutions',
                        value: '• Vérifiez que le texte est dans la bonne langue\n• Essayez un style différent\n• Réessayez dans quelques minutes'
                    }
                ],
                buttons: [
                    {
                        customId: `translate_retry_${Date.now()}`,
                        label: '🔄 Réessayer',
                        style: 2
                    }
                ]
            });
            
            await interaction.editReply(errorMessage);
        }
    }
};