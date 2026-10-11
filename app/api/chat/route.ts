import { streamChatCompletion, getActiveModelName } from '@/lib/huggingface';
import { queryText } from '@/lib/pinecone';
import { buildChatMessages } from '@/lib/prompts';
import type { ChatErrorResponse, ChatRequest } from '@/types/chat';

// ---------------------------------------------------------------------------
// Vercel serverless config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse & validate request body -----------------------------------
    let body: ChatRequest;

    try {
      body = (await request.json()) as ChatRequest;
    } catch {
      return errorResponse('Invalid JSON in request body.', 'INVALID_JSON', 400);
    }

    if (
      !body.messages ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return errorResponse(
        'Request must include a non-empty "messages" array.',
        'INVALID_MESSAGES',
        400,
      );
    }

    // 2. Extract the latest user message ---------------------------------
    const latestUserMessage = [...body.messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!latestUserMessage || !latestUserMessage.content.trim()) {
      return errorResponse(
        'No valid user message found in the messages array.',
        'NO_USER_MESSAGE',
        400,
      );
    }

    const userText = latestUserMessage.content.trim();

    // 3. Retrieve relevant context from Pinecone -------------------------
    let contextTexts: string[] = [];

    try {
      const results = await queryText(userText, 5);
      contextTexts = results.map((r) => r.text);
    } catch (error: unknown) {
      // Non-fatal — we can still respond without context.
      const msg =
        error instanceof Error ? error.message : 'Vector query failed';
      console.error('[chat/route] Pinecone query error (non-fatal):', msg);
    }

    // 4. Build the structured chat messages -------------------------------
    const chatMessages = buildChatMessages(contextTexts, body.messages);

    // 5. Create a streaming response ------------------------------------
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamChatCompletion(chatMessages)) {
            controller.enqueue(encoder.encode(token));
          }
        } catch (error: unknown) {
          const msg =
            error instanceof Error
              ? error.message
              : 'An error occurred while generating a response.';
          console.error('[chat/route] Stream error:', msg);
          controller.enqueue(
            encoder.encode(
              `\n\n⚠️ **Error**: ${msg}`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Model-Name': getActiveModelName(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('[chat/route] Unhandled error:', message);
    return errorResponse(
      'An unexpected error occurred. Please try again later.',
      'INTERNAL_ERROR',
      500,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(
  error: string,
  code: string,
  status: number,
): Response {
  const body: ChatErrorResponse = { error, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
