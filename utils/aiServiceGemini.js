const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;
let modelName = null;
let modelCandidates = [];

function initModel() {
  const cfgList = (process.env.GEMINI_MODEL_LIST || '').split(',').map(s => s.trim()).filter(Boolean);
  const primary = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const defaults = ['gemini-2.5-flash', 'gemini-3.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
  modelCandidates = [...(cfgList.length ? cfgList : [primary, ...defaults])].filter((v, i, a) => v && a.indexOf(v) === i);
  if (!API_KEY) return;
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    // premier essai paresseux: on sélectionnera le modèle au premier appel
  } catch (e) {
    console.error('[Gemini] Initialization error:', e?.message || e);
  }
}
initModel();

async function ask(question, context = '') {
  if (!genAI) {
    throw new Error('Gemini API key missing or invalid');
  }
  const prompt = [
    'You are an assistant integrated in a Discord bot. Be concise and helpful.',
    context ? `Context: ${context}` : '',
    `Question: ${question}`
  ].filter(Boolean).join('\n\n');

  const tryOrder = [...modelCandidates];
  if (tryOrder.length === 0) {
    modelCandidates = ['gemini-2.5-flash', 'gemini-3.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    tryOrder.push(...modelCandidates);
  }
  for (const candidate of tryOrder) {
    try {
      if (!model || modelName !== candidate) {
        modelName = candidate;
        model = genAI.getGenerativeModel({ model: modelName });
      }
      const result = await model.generateContent(prompt);
      const res = (typeof result?.response?.text === 'function'
        ? result.response.text()
        : (result?.response?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('\n')) || '';
      return (res && res.trim()) || 'I cannot answer this right now.';
    } catch (err) {
      console.warn(`[Gemini] Model failed: ${candidate} -> ${err?.status || ''} ${err?.statusText || err?.message || err}`);
      continue;
    }
  }
  if (process.env.AI_FALLBACK_OPENAI === 'true' && process.env.OPENAI_API_KEY) {
    const OpenAIService = require('./aiService');
    return await OpenAIService.generateResponse(question, null);
  }
  throw new Error('All configured Gemini models failed');
}

async function generateResponse(question, _userId) {
  return ask(question, '');
}

module.exports = { ask, generateResponse };

