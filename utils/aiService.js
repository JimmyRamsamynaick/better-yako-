// utils/aiService.js
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class AIService {
    static async ask(question, context = '') {
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Tu es un assistant IA intégré dans un bot Discord. Réponds de manière utile et concise. Si c'est approprié, utilise des emojis Discord."
                    },
                    {
                        role: "user",
                        content: `${context ? `Contexte: ${context}\n\n` : ''}Question: ${question}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Erreur AI:', error);
            return "Désolé, je ne peux pas répondre à cette question pour le moment. 😅";
        }
    }
}

module.exports = AIService;