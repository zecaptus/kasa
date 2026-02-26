import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Interface ──────────────────────────────────────────────────────────────────

export interface AiProvider {
  generate(prompt: string): Promise<string>;
}

// ─── Gemini provider (multi-model fallback) ─────────────────────────────────────

const GEMINI_MODELS = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;

export function createGeminiProvider(apiKey: string): AiProvider {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async generate(prompt: string): Promise<string> {
      let lastError: unknown;

      for (const modelName of GEMINI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          console.log(`[aiProvider] Gemini success with model: ${modelName}`);
          return result.response.text();
        } catch (err) {
          lastError = err;
          console.warn(
            `[aiProvider] Gemini ${modelName} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      throw lastError;
    },
  };
}

// ─── Groq provider (native fetch) ──────────────────────────────────────────────

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callGroqApi(apiKey: string, prompt: string): Promise<GroqResponse> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq API error ${response.status}: ${body}`);
  }

  return (await response.json()) as GroqResponse;
}

export function createGroqProvider(apiKey: string): AiProvider {
  return {
    async generate(prompt: string): Promise<string> {
      const data = await callGroqApi(apiKey, prompt);
      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned an empty response');
      }
      return content;
    },
  };
}

// ─── Fallback provider ─────────────────────────────────────────────────────────

async function tryPrimaryThenFallback(
  primary: AiProvider,
  fallback: AiProvider | undefined,
  prompt: string,
): Promise<string> {
  try {
    return await primary.generate(prompt);
  } catch (err) {
    if (!fallback) throw err;
    console.warn(
      '[aiProvider] All Gemini models failed, falling back to Groq:',
      err instanceof Error ? err.message : err,
    );
    return fallback.generate(prompt);
  }
}

export function createFallbackProvider(
  geminiKey: string | undefined,
  groqKey: string | undefined,
): AiProvider {
  if (!geminiKey && !groqKey) {
    throw new Error(
      'At least one AI provider key must be configured (GEMINI_API_KEY or GROQ_API_KEY)',
    );
  }

  const primary = geminiKey ? createGeminiProvider(geminiKey) : undefined;
  const fallback = groqKey ? createGroqProvider(groqKey) : undefined;

  return {
    async generate(prompt: string): Promise<string> {
      if (primary) {
        return tryPrimaryThenFallback(primary, fallback, prompt);
      }
      return (fallback as AiProvider).generate(prompt);
    },
  };
}
