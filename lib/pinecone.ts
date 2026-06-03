import { Pinecone } from '@pinecone-database/pinecone';

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

// Env vars are read lazily at runtime, not at module load time,
// so that `next build` succeeds without them being set.

// ---------------------------------------------------------------------------
// Lazy-initialised Pinecone client & index
// ---------------------------------------------------------------------------

let pineconeClient: Pinecone | null = null;

function getClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing PINECONE_API_KEY environment variable. ' +
          'Set it in your .env.local or Vercel project settings.',
      );
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

function getIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    throw new Error(
      'Missing PINECONE_INDEX_NAME environment variable. ' +
        'Set it in your .env.local or Vercel project settings.',
    );
  }
  return getClient().index(indexName);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface VectorResult {
  text: string;
  score: number;
}

/**
 * Queries the Pinecone index using raw text. Pinecone handles embedding generation
 * automatically using its integrated llama-text-embed-v2 model.
 *
 * @param text  - The query text to search for.
 * @param topK  - Number of results to return (default 5).
 * @returns An array of { text, score } objects sorted by relevance.
 */
export async function queryText(
  text: string,
  topK: number = 5,
): Promise<VectorResult[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot query Pinecone with empty text.');
  }

  try {
    const index = getIndex();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000); // 15 s timeout

    try {
      const searchResponse = await index.namespace('default').searchRecords({
        query: {
          inputs: { text },
          topK,
        },
      });

      clearTimeout(timeout);

      if (!searchResponse.result || !searchResponse.result.hits) {
        return [];
      }

      return searchResponse.result.hits
        .filter((hit) => {
          const fields = hit.fields as Record<string, any> | undefined;
          return fields !== undefined && typeof fields['text'] === 'string';
        })
        .map((hit) => {
          const fields = hit.fields as Record<string, any>;
          return {
            text: fields['text'] as string,
            score: hit._score ?? 0,
          };
        });
    } catch (innerError: unknown) {
      clearTimeout(timeout);
      throw innerError;
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[Pinecone] Query timed out after 15 s');
      throw new Error('Pinecone query timed out. Please try again.');
    }

    const message =
      error instanceof Error ? error.message : 'Unknown Pinecone error';
    console.error('[Pinecone] Query failed:', message);
    throw new Error(`Pinecone query failed: ${message}`);
  }
}
