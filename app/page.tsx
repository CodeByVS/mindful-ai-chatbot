'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '@/types/chat';
import { generateId } from '@/lib/utils';
import ChatContainer from '@/components/chat/ChatContainer';
import EmptyState from '@/components/chat/EmptyState';
import ChatInput from '@/components/chat/ChatInput';
import ErrorBanner from '@/components/chat/ErrorBanner';

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || isLoading) return;

      setError(null);

      // 1. Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsLoading(true);

      // 2. Create placeholder assistant message
      const assistantId = generateId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // 3. Call the streaming API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Server responded with ${response.status}: ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error('No response body received');
        }

        // 4. Stream chunks
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update assistant message content in real-time
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Something went wrong';
        setError(errorMessage);

        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter(
            (msg) => !(msg.id === assistantId && msg.content === '')
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleSuggestionClick = useCallback(
    (question: string) => {
      setInput(question);
      handleSend(question);
    },
    [handleSend]
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      {/* Error Banner */}
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <ChatContainer
            messages={messages}
            isLoading={isLoading}
            onClear={handleClear}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        isLoading={isLoading}
      />
    </main>
  );
}
