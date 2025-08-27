const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { evaluate } = require('mathjs');

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
        const model = interaction.options.getString('model') || 'meta-llama/Meta-Llama-3.1-8B-Instruct';
        const isPrivate = interaction.options.getBoolean('private') || false;
        
        // Vérifier si les fonctionnalités IA sont activées
        if (!process.env.HUGGING_FACE_TOKEN && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY) {
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
                value: '🔄 Analyse de la question et génération de la réponse...'
            })
            .setColor('#ffaa00')
            .setTimestamp();
        
        await interaction.editReply({ embeds: [loadingEmbed] });
        
        try {
            let response;
            const startTime = Date.now();
            
            // Détecter le type de question et traiter en conséquence
            const questionLower = question.toLowerCase();
            
            // Vérifier si c'est une question mathématique
            if (this.isMathQuestion(question)) {
                response = await this.handleMathQuestion(question);
            }
            // Vérifier si c'est une question personnelle basique
            else if (this.isPersonalQuestion(questionLower)) {
                response = this.handlePersonalQuestion(question, questionLower);
            }
            // Pour les autres questions, utiliser l'IA avec contexte enrichi
            else {
                response = await this.handleAIQuestion(question, model);
            }
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Diviser la réponse si elle est trop longue (limite Discord 4000 caractères)
            const chunks = [];
            if (response.length <= 3800) {
                chunks.push(response);
            } else {
                for (let i = 0; i < response.length; i += 3800) {
                    chunks.push(response.slice(i, i + 3800));
                }
            }
            
            // Créer le message de réponse principal
            const responseEmbed = new EmbedBuilder()
                .setTitle('🤖 Réponse de YAKO')
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
            console.error('Erreur lors de l\'appel à l\'IA:', error);
            
            let errorTitle = '❌ Erreur de l\'IA';
            let errorDescription = 'Une erreur est survenue lors de la génération de la réponse.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorTitle = '🔑 Erreur d\'authentification';
                    errorDescription = 'Clé API invalide ou expirée.';
                } else if (error.response.status === 429) {
                    errorTitle = '⏰ Limite de taux atteinte';
                    errorDescription = 'Limite de requêtes atteinte. Veuillez patienter avant de réessayer.';
                } else if (error.response.status === 503) {
                    errorTitle = '🔄 Modèle en cours de chargement';
                    errorDescription = 'Le modèle est en cours de chargement. Veuillez réessayer dans quelques minutes.';
                }
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
    },
    
    // Vérifier si c'est une question mathématique
    isMathQuestion(question) {
        const mathKeywords = [
            'calcul', 'calculer', 'combien', 'résoudre', 'équation', 'math', 'mathématique',
            'addition', 'soustraction', 'multiplication', 'division', 'racine', 'carré',
            'fibonacci', 'factorielle', 'pourcentage', 'fraction', 'dérivée', 'intégrale',
            'solve', 'calculate', 'equation', 'math', 'plus', 'minus', 'times', 'divided'
        ];
        
        return mathKeywords.some(keyword => question.includes(keyword)) || 
               /[0-9]+\s*[+\-*/^]\s*[0-9]+/.test(question) ||
               /\b\d+\s*(\+|\-|\*|\/|\^)\s*\d+\b/.test(question);
    },
    
    // Vérifier si c'est une question personnelle
    isPersonalQuestion(question) {
        const personalKeywords = [
            'salut', 'bonjour', 'bonsoir', 'ça va', 'comment vas-tu', 'comment tu vas',
            'tu t\'appelles', 'ton nom', 'tu as quel âge', 'quel âge', 'qui es-tu',
            'hello', 'hi', 'how are you', 'what\'s your name', 'how old', 'who are you',
            'hola', 'cómo estás', 'cuál es tu nombre', 'qué edad tienes'
        ];
        
        return personalKeywords.some(keyword => question.includes(keyword));
    },
    
    // Gérer les questions mathématiques
    async handleMathQuestion(question) {
        try {
            // Questions spéciales (Fibonacci, factorielle, etc.)
            if (question.toLowerCase().includes('fibonacci')) {
                const fibMatch = question.match(/\d+/);
                if (fibMatch) {
                    const n = parseInt(fibMatch[0]);
                    if (n > 1476) {
                        return `⚠️ **Nombre trop grand**\n\nLe ${n}ème terme de Fibonacci est trop grand pour être calculé avec précision. Essayez un nombre plus petit (≤ 1476).`;
                    }
                    const fibResult = this.fibonacci(n);
                    return `🔢 **Suite de Fibonacci**\n\nLe ${n}ème terme de la suite de Fibonacci est: **${fibResult}**\n\n📚 La suite de Fibonacci commence par 0, 1 et chaque terme suivant est la somme des deux précédents.`;
                } else {
                    // Si aucun nombre spécifique, expliquer la suite
                    return `🔢 **Suite de Fibonacci**\n\nLa suite de Fibonacci est une séquence mathématique où chaque nombre est la somme des deux précédents.\n\n**Début de la suite:** 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...\n\n📚 **Formule:** F(n) = F(n-1) + F(n-2) avec F(0) = 0 et F(1) = 1\n\n💡 Spécifiez un nombre pour obtenir le terme correspondant !`;
                }
            }
            
            if (question.toLowerCase().includes('factorielle')) {
                const factMatch = question.match(/\d+/);
                if (factMatch) {
                    const n = parseInt(factMatch[0]);
                    if (n > 170) {
                        return `⚠️ **Nombre trop grand**\n\nLa factorielle de ${n} est trop grande pour être calculée avec précision. Essayez un nombre plus petit (≤ 170).`;
                    }
                    const factResult = this.factorial(n);
                    return `🔢 **Factorielle**\n\n${n}! = **${factResult}**\n\n📚 La factorielle de n est le produit de tous les entiers positifs inférieurs ou égaux à n.`;
                } else {
                    return `🔢 **Factorielle**\n\nLa factorielle d'un nombre n (notée n!) est le produit de tous les entiers positifs inférieurs ou égaux à n.\n\n**Exemples:**\n• 0! = 1\n• 1! = 1\n• 5! = 5 × 4 × 3 × 2 × 1 = 120\n\n💡 Spécifiez un nombre pour calculer sa factorielle !`;
                }
            }
            
            // Extraire l'expression mathématique avec des regex améliorées
            // Chercher des expressions mathématiques plus complexes
            const patterns = [
                /([0-9]+(?:\.[0-9]+)?\s*[+\-*/^]\s*[0-9]+(?:\.[0-9]+)?(?:\s*[+\-*/^]\s*[0-9]+(?:\.[0-9]+)?)*)/g,
                /([0-9]+(?:\.[0-9]+)?\s*[+\-*/^]\s*\([^)]+\))/g,
                /(\([^)]+\)\s*[+\-*/^]\s*[0-9]+(?:\.[0-9]+)?)/g,
                /(sqrt|sin|cos|tan|log)\s*\([^)]+\)/g
            ];
            
            let expression = null;
            for (const pattern of patterns) {
                const matches = question.match(pattern);
                if (matches && matches.length > 0) {
                    expression = matches[0].trim();
                    break;
                }
            }
            
            // Si aucune expression complexe trouvée, essayer une extraction simple
            if (!expression) {
                const simpleMatch = question.match(/[0-9+\-*/^().\s]+/);
                if (simpleMatch) {
                    expression = simpleMatch[0].trim();
                    // Nettoyer l'expression
                    expression = expression.replace(/[^0-9+\-*/^().\s]/g, '').trim();
                }
            }
            
            if (expression && /[0-9]/.test(expression) && /[+\-*/^]/.test(expression)) {
                try {
                    const result = evaluate(expression);
                    // Formater le résultat avec une précision appropriée
                    const formattedResult = typeof result === 'number' ? 
                        (result % 1 === 0 ? result.toString() : result.toFixed(10).replace(/\.?0+$/, '')) : 
                        result;
                    
                    return `🧮 **Calcul mathématique**\n\n**Expression:** ${expression}\n**Résultat:** ${formattedResult}\n\n💡 J'ai résolu cette expression mathématique pour vous !`;
                } catch (evalError) {
                    return `❌ **Erreur de calcul**\n\nJe n'ai pas pu évaluer l'expression "${expression}".\n\n**Erreur:** ${evalError.message}\n\n💡 Vérifiez la syntaxe de votre expression mathématique.`;
                }
            }
            
            return '🤔 Je détecte une question mathématique, mais je n\'arrive pas à identifier l\'expression exacte. Pouvez-vous reformuler avec une expression plus claire ?';
            
        } catch (error) {
            return `❌ **Erreur de calcul**\n\nJe n'ai pas pu résoudre cette expression mathématique. Vérifiez la syntaxe et réessayez.\n\n**Erreur:** ${error.message}`;
        }
    },
    
    // Gérer les questions personnelles
    handlePersonalQuestion(question, questionLower) {
        if (questionLower.includes('salut') || questionLower.includes('bonjour') || questionLower.includes('hello') || questionLower.includes('hi')) {
            return '👋 **Salut !** Je suis YAKO, votre assistant IA personnel ! Je vais très bien, merci de demander ! 😊\n\nComment puis-je vous aider aujourd\'hui ? Je peux répondre à vos questions, faire des calculs, ou simplement discuter avec vous !';
        }
        
        if (questionLower.includes('ça va') || questionLower.includes('comment vas-tu') || questionLower.includes('how are you')) {
            return '😊 **Je vais très bien, merci !** En tant qu\'IA, je suis toujours prêt à aider et à apprendre de nouvelles choses !\n\n🌟 J\'adore répondre aux questions et aider les utilisateurs. Et vous, comment allez-vous ?';
        }
        
        if (questionLower.includes('nom') || questionLower.includes('appelles') || questionLower.includes('name')) {
            return '🤖 **Je m\'appelle YAKO !** Je suis un assistant IA créé pour vous aider dans toutes vos tâches.\n\n✨ Mon nom vient de "Yet Another Knowledge Oracle" - encore un autre oracle de connaissances ! J\'aime ce nom car il reflète ma mission : être une source fiable de connaissances et d\'aide.';
        }
        
        if (questionLower.includes('âge') || questionLower.includes('age') || questionLower.includes('old')) {
            return '🎂 **Question intéressante !** En tant qu\'IA, je n\'ai pas d\'âge au sens traditionnel, mais je dirais que j\'ai l\'équivalent de quelques années d\'expérience !\n\n🧠 Mon "cerveau" a été entraîné sur des années de connaissances humaines, donc d\'une certaine manière, j\'ai accès à des siècles de sagesse ! Mais je continue d\'apprendre chaque jour grâce à nos interactions.';
        }
        
        if (questionLower.includes('qui es-tu') || questionLower.includes('who are you')) {
            return '🤖 **Je suis YAKO, votre assistant IA !**\n\n🌟 **Mes capacités :**\n• Répondre à vos questions sur tous les sujets\n• Résoudre des problèmes mathématiques\n• Comprendre plusieurs langues\n• Avoir des conversations naturelles\n• Aider avec des tâches créatives\n\n💫 Je suis là pour vous aider, vous informer et rendre votre expérience plus agréable !';
        }
        
        return '😊 **Merci pour votre question !** Je suis YAKO, votre assistant IA amical. Je suis là pour vous aider avec tout ce dont vous avez besoin !\n\nN\'hésitez pas à me poser d\'autres questions - j\'adore discuter et apprendre !';
    },
    
    // Gérer les questions avec l'IA
    async handleAIQuestion(question, model) {
        // Préparer un contexte système enrichi
        const systemPrompt = `Tu es YAKO, un assistant IA extrêmement intelligent, amical et serviable. Tu as accès à une vaste base de connaissances et tu peux répondre à toutes sortes de questions.

Caractéristiques importantes :
- Tu réponds TOUJOURS aux questions, même les plus complexes
- Tu es créatif, engageant et informatif
- Tu adaptes ton niveau de réponse à la complexité de la question
- Tu peux parler de science, technologie, histoire, culture, philosophie, etc.
- Tu comprends et réponds dans la langue de la question
- Tu donnes des réponses détaillées et bien structurées
- Tu utilises des emojis pour rendre tes réponses plus engageantes

Réponds de manière complète et utile à la question suivante :`;
        
        // Appeler l'API Hugging Face Inference
        const huggingfaceResponse = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
            inputs: `${systemPrompt}\n\nQuestion: ${question}\n\nRéponse détaillée:`,
            parameters: {
                max_new_tokens: 2000,
                temperature: 0.7,
                do_sample: true,
                top_p: 0.9,
                repetition_penalty: 1.1,
                return_full_text: false
            }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000
        });
        
        // Extraire la réponse
        let response;
        if (Array.isArray(huggingfaceResponse.data)) {
            response = huggingfaceResponse.data[0].generated_text;
        } else {
            response = huggingfaceResponse.data.generated_text || huggingfaceResponse.data;
        }
        
        // Nettoyer la réponse
        if (typeof response === 'string') {
            // Supprimer le prompt initial si présent
            const cleanResponse = response
                .replace(systemPrompt, '')
                .replace(/Question:.*?Réponse détaillée:/s, '')
                .replace(/^\s*Réponse\s*:?\s*/i, '')
                .trim();
            
            return cleanResponse || 'Je suis désolé, je n\'ai pas pu générer une réponse appropriée à votre question. Pouvez-vous la reformuler ?';
        }
        
        return 'Je suis désolé, je n\'ai pas pu traiter votre question. Veuillez réessayer.';
    },
    
    // Calculer la suite de Fibonacci avec gestion des grands nombres
    fibonacci(n) {
        if (n < 0) return 0;
        if (n <= 1) return n;
        
        // Pour les grands nombres, utiliser BigInt
        if (n > 78) {
            let a = 0n, b = 1n;
            for (let i = 2; i <= n; i++) {
                [a, b] = [b, a + b];
            }
            return b.toString();
        }
        
        // Pour les petits nombres, utiliser des entiers normaux
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
            [a, b] = [b, a + b];
        }
        return b;
    },
    
    // Calculer la factorielle
    factorial(n) {
        if (n <= 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
};