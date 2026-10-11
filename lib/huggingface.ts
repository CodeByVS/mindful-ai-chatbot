import { HfInference } from '@huggingface/inference';

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

// Env vars are read lazily at runtime, not at module load time,
// so that `next build` succeeds without them being set.

const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2';

const HF_MODEL_ID =
  process.env.HF_MODEL_ID ?? 'meta-llama/Meta-Llama-3-8B-Instruct';

// ---------------------------------------------------------------------------
// Lazy-initialised HfInference client
// ---------------------------------------------------------------------------

let hfClient: HfInference | null = null;

function getClient(): HfInference {
  if (!hfClient) {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error(
        'Missing HF_TOKEN environment variable. ' +
          'Set it in your .env.local or Vercel project settings.',
      );
    }
    hfClient = new HfInference(token);
  }
  return hfClient;
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

/**
 * Generates a 384-dimensional embedding vector for the given text using the
 * configured Hugging Face embedding model.
 *
 * @param text - The input text to embed.
 * @returns The embedding vector as `number[]`.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text.');
  }

  try {
    const hf = getClient();

    const result = await hf.featureExtraction({
      model: HF_EMBEDDING_MODEL,
      inputs: text,
    });

    // The API may return a nested array or a flat array depending on the
    // model.  Normalise to a flat number[].
    const embedding = Array.isArray(result[0])
      ? (result[0] as number[])
      : (result as number[]);

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Received empty embedding from Hugging Face.');
    }

    return embedding;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown embedding error';
    console.error('[HuggingFace] Embedding generation failed:', message);
    throw new Error(`Embedding generation failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Streaming chat completion
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Returns a human-friendly name of the model currently answering queries.
 */
export function getActiveModelName(usedModel?: string): string {
  if (process.env.GROQ_API_KEY?.trim()) {
    const model = usedModel || process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
    return `${model} (Groq)`;
  }
  return `${process.env.HF_MODEL_ID ?? 'Meta-Llama-3-8B-Instruct'} (Hugging Face)`;
}

/**
 * Streams chat completion tokens from Groq (free, high-speed LLM).
 */
async function* streamGroqCompletion(
  messages: ChatMessage[],
  onModelSelected?: (modelName: string) => void,
): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const configured = process.env.GROQ_MODEL?.trim();
  const candidates = [
    ...(configured && configured !== 'llama-3.3-70b-versatile' ? [configured] : []),
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
  ];

  let res: Response | null = null;
  let selectedModel = '';

  for (const model of candidates) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        res = response;
        selectedModel = model;
        if (onModelSelected) onModelSelected(model);
        break;
      }

      console.warn(`[Groq] Model ${model} returned status ${response.status}, trying fallback...`);
    } catch (err) {
      console.warn(`[Groq] Failed with model ${model}:`, err);
    }
  }

  if (!res || !res.ok) {
    throw new Error('Groq models are temporarily busy or unavailable. Please try again shortly.');
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No stream response from Groq');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            yield token;
          }
        } catch {
          // ignore parse error on partial lines
        }
      }
    }
  }
}

/**
 * Streams chat completion tokens from either Groq or Hugging Face.
 *
 * @param messages - Array of system, user, and assistant messages in chat format.
 * @yields Individual string tokens as they arrive from the model.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  onModelSelected?: (modelName: string) => void,
): AsyncGenerator<string> {
  if (!messages || messages.length === 0) {
    throw new Error('Cannot run chat completion with empty messages.');
  }

  // Priority 1: Groq (if GROQ_API_KEY is configured)
  if (process.env.GROQ_API_KEY?.trim()) {
    yield* streamGroqCompletion(messages, onModelSelected);
    return;
  }

  // Priority 2: Hugging Face
  try {
    const hf = getClient();

    const stream = hf.chatCompletionStream({
      model: HF_MODEL_ID,
      messages: messages as any,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) {
        yield token;
      }
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown chat completion error';
    console.error('[HuggingFace] Chat completion failed:', message);

    if (message.includes('no remaining credits')) {
      throw new Error(
        'Hugging Face has no remaining credits for Inference Providers. You can either:\n' +
        '1. Add a free GROQ_API_KEY in .env.local (Get one free at https://console.groq.com/keys)\n' +
        '2. Add free provider keys in your Hugging Face settings at https://hf.co/settings/inference-providers\n' +
        '3. Add credits at https://hf.co/settings/billing'
      );
    }

    throw new Error(`Chat completion failed: ${message}`);
  }
}

