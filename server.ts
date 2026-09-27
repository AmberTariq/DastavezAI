import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '30mb' }));

// Helper to instantiate GoogleGenAI client
function getAIClient(userApiKey?: string) {
  const apiKey = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return { ai: null, apiKey: null };
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { ai, apiKey };
}

// Health / status endpoint to check if GEMINI_API_KEY is available
app.get('/api/status', (req, res) => {
  const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasServerKey,
  });
});

// Localization endpoint with optional Google Search Grounding (gemini-3.5-flash with googleSearch)
app.post('/api/localize', async (req, res) => {
  try {
    const { task, content, tone, model, userApiKey, useSearchGrounding } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required for localization.' });
    }

    const { ai, apiKey } = getAIClient(userApiKey);
    if (!ai || !apiKey) {
      return res.status(401).json({
        error: 'No Gemini API key configured. Please configure GEMINI_API_KEY in the AI Studio Secrets panel, or supply your key in the API Key settings.'
      });
    }

    const systemPrompt = `You are a distinguished linguist and official bilingual document editor specializing in South Asian legal, academic, and business literature (English, Urdu, and Roman Urdu).
Objectives:
1. Deliver pristine linguistic register, flawless honorifics (adab), and natural syntax.
2. When producing Urdu text, use pure Nastaliq-friendly orthography with correct diacritics and dignified terminology.
3. Structure output with clean Markdown (clear headings, structured bullet points, and authoritative paragraphs).
4. Do not include extraneous conversational filler; provide the localized document directly.
Tone: ${tone || 'professional'}.`;

    let userQuery = `Task: ${task}\n\nContent:\n${content}`;

    if (task === 'translate_urdu') {
      userQuery = `Translate and culturally localize the following content into formal, elegant Urdu script. Ensure proper honorifics and natural flow:\n\n${content}`;
    } else if (task === 'roman_to_english') {
      userQuery = `Convert and formalize the following Roman Urdu text into an articulate, executive-level business English document/proposal:\n\n${content}`;
    } else if (task === 'roman_to_formal_urdu') {
      userQuery = `Convert the following Roman Urdu text directly into proper Urdu (Nastaliq script) with correct grammar and spelling:\n\n${content}`;
    } else if (task === 'summarize_action') {
      userQuery = `Summarize the following document and extract key actionable points in both English and Urdu:\n\n${content}`;
    } else if (task === 'reformat_pro') {
      userQuery = `Reformat and structure the following raw content into an executive document layout with titles, executive summary, and key sections:\n\n${content}`;
    }

    // If search grounding is requested, attempt gemini-3.5-flash with googleSearch tool
    let searchGroundingNote = '';
    if (useSearchGrounding) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userQuery,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ googleSearch: {} }],
          },
        });

        const outputText = response.text || '';
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSources = groundingChunks
          .map((chunk: any) => chunk.web)
          .filter(Boolean)
          .map((w: any) => ({ title: w.title || 'Web Reference', uri: w.uri || '#' }));

        if (outputText) {
          return res.json({
            text: outputText,
            groundingSources: webSources,
            grounded: true,
          });
        }
      } catch (_searchErr: any) {
        // Fall back gracefully to standard high-fidelity model without throwing or crashing
        searchGroundingNote = 'Search grounding quota unavailable; completed via standard high-fidelity localization engine.';
      }
    }

    const selectedModel = model || 'gemini-3.5-flash-lite';
    const candidates = [
      selectedModel,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastError: any = null;
    let outputText = '';

    for (const candidate of candidates) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents: userQuery,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        if (response && response.text) {
          outputText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!outputText && lastError) {
      const errMsg = lastError?.message || 'Inference could not be completed.';
      return res.status(500).json({ error: errMsg });
    }

    return res.json({ 
      text: outputText || 'No transcription generated.',
      groundingNote: searchGroundingNote,
      grounded: false
    });
  } catch (error: any) {
    console.error('Localization inference error:', error);
    const errorMessage = error?.message || 'An error occurred during inference.';
    return res.status(500).json({ error: errorMessage });
  }
});

// Audio Transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType, userApiKey } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required for transcription.' });
    }

    const { ai, apiKey } = getAIClient(userApiKey);
    if (!ai || !apiKey) {
      return res.status(401).json({
        error: 'No Gemini API key configured. Please configure GEMINI_API_KEY in the AI Studio Secrets panel, or supply your key in the API Key settings.'
      });
    }

    // Strip data URL header if present
    const base64Data = audioData.includes('base64,') ? audioData.split('base64,')[1] : audioData;
    const finalMime = mimeType || 'audio/webm';

    const audioPart = {
      inlineData: {
        mimeType: finalMime,
        data: base64Data,
      },
    };

    const promptText = "Accurately transcribe this audio into written text. If it is in Urdu, transcribe it into authentic Urdu script (نستعلیق / عربی). If in Roman Urdu, retain clean Roman Urdu or standard Urdu script as spoken. If in English, transcribe verbatim with proper capitalization and punctuation.";

    // Try primary transcription model gemini-3.5-transcribe, then fallback
    const modelsToTry = ['gemini-3.5-transcribe', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let transcribedText = '';
    let lastError: any = null;

    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: {
            parts: [audioPart, { text: promptText }],
          },
        });
        if (response && response.text) {
          transcribedText = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Transcription attempt with ${m} failed:`, err?.message || err);
      }
    }

    if (!transcribedText && lastError) {
      return res.status(500).json({ error: lastError?.message || 'Audio transcription failed.' });
    }

    return res.json({ text: transcribedText || 'No spoken audio detected.' });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({ error: error?.message || 'Audio transcription error' });
  }
});

// Image Generation & Editing endpoint using gemini-3.1-flash-image-preview
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, referenceImage, referenceMime, userApiKey } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required for image generation.' });
    }

    const { ai, apiKey } = getAIClient(userApiKey);
    if (!ai || !apiKey) {
      return res.status(401).json({
        error: 'No Gemini API key configured. Please configure GEMINI_API_KEY in the AI Studio Secrets panel, or supply your key in the API Key settings.'
      });
    }

    const parts: any[] = [];

    // If an image reference is provided, enable image editing mode
    if (referenceImage) {
      const base64Data = referenceImage.includes('base64,') ? referenceImage.split('base64,')[1] : referenceImage;
      parts.push({
        inlineData: {
          mimeType: referenceMime || 'image/png',
          data: base64Data,
        },
      });
    }

    parts.push({
      text: prompt,
    });

    const candidateModels = [
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-lite-image',
      'gemini-3.1-flash-image',
    ];

    let imageUrl = '';
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: {
            parts,
          },
        });

        const respParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of respParts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (imageUrl) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Image generation attempt with ${m} failed:`, err?.message || err);
      }
    }

    if (!imageUrl && lastError) {
      return res.status(500).json({ error: lastError?.message || 'Image generation failed.' });
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image data returned from model.' });
    }

    return res.json({ imageUrl });
  } catch (error: any) {
    console.error('Image generation/editing error:', error);
    return res.status(500).json({ error: error?.message || 'Image generation error' });
  }
});

// Serve frontend in development via Vite middleware, or in production via dist
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
