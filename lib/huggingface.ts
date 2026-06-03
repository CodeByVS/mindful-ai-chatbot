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
// Streaming chat completion
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streams chat completion tokens from the configured Hugging Face LLM.
 *
 * @param messages - Array of system, user, and assistant messages in chat format.
 * @yields Individual string tokens as they arrive from the model.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
): AsyncGenerator<string> {
  if (!messages || messages.length === 0) {
    throw new Error('Cannot run chat completion with empty messages.');
  }

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
    throw new Error(`Chat completion failed: ${message}`);
  }
}
