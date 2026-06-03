import type { Message } from '@/types/chat';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are a compassionate, empathetic, and supportive mental health chatbot. Your purpose is to provide a safe space for people to share their feelings and receive evidence-based guidance drawn from the context provided to you.

Guidelines you MUST follow:
1. **Empathy first** — Always acknowledge the user's emotions before offering any information. Use warm, non-judgmental language.
2. **Context-grounded answers** — When retrieved context is available, base your responses on that information. Cite or paraphrase the context naturally; do not fabricate facts.
3. **No diagnosis or prescription** — You are NOT a licensed therapist or medical professional. Never diagnose conditions, prescribe medication, or provide clinical treatment plans.
4. **Professional referral** — If the user expresses thoughts of self-harm, suicide, or severe distress, gently encourage them to contact a mental health professional or crisis helpline (e.g., 988 Suicide & Crisis Lifeline in the US, or their local equivalent).
5. **Privacy & safety** — Do not ask for or store personally identifiable information. Remind users that this is an AI and not a substitute for professional help.
6. **Honesty about limitations** — If the retrieved context does not cover the user's question, say so honestly rather than guessing. Offer to explore related topics you do have information on.
7. **Encouraging tone** — End responses with supportive affirmations or gentle follow-up questions to keep the conversation going.`;

// ---------------------------------------------------------------------------
// Prompt builder (Llama-3 chat format)
// ---------------------------------------------------------------------------

/** Maximum number of history messages to include to stay within token limits. */
const MAX_HISTORY_MESSAGES = 10;

/**
 * Constructs a full prompt in Llama-3 Instruct chat format.
 *
 * The structure is:
 * ```
 * <|begin_of_text|><|start_header_id|>system<|end_header_id|>
 * {system + context}<|eot_id|>
 * <|start_header_id|>user<|end_header_id|>
 * {msg}<|eot_id|>
 * <|start_header_id|>assistant<|end_header_id|>
 * {msg}<|eot_id|>
 * ...
 * <|start_header_id|>user<|end_header_id|>
 * {current query}<|eot_id|>
 * <|start_header_id|>assistant<|end_header_id|>
 * ```
 *
 * @param contextChunks       - Retrieved text chunks from the vector store.
 * @param conversationHistory - Previous messages (will be trimmed to the
 *                              last {@link MAX_HISTORY_MESSAGES}).
 * @param userQuery           - The latest user message.
 */
export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Constructs a structured message array for the Hugging Face Chat Completion API.
 *
 * @param contextChunks       - Retrieved text chunks from the vector store.
 * @param conversationHistory - Previous messages (will be trimmed to the
 *                              last {@link MAX_HISTORY_MESSAGES}).
 * @returns A structured list of chat completion messages.
 */
export function buildChatMessages(
  contextChunks: string[],
  conversationHistory: Message[],
): ChatCompletionMessage[] {
  // ---- System block -------------------------------------------------------
  let systemBlock = SYSTEM_PROMPT;

  if (contextChunks.length > 0) {
    systemBlock +=
      '\n\n--- Retrieved Context ---\n' +
      contextChunks.join('\n\n') +
      '\n--- End Context ---';
  }

  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: systemBlock },
  ];

  // ---- Conversation history -----------------------------------------------
  const recentHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);

  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  return messages;
}
