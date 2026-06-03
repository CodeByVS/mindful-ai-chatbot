import type { RefObject } from 'react';
import type { Message } from '@/types/chat';
import { Brain, Trash2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onClear: () => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export default function ChatContainer({
  messages,
  isLoading,
  onClear,
  messagesEndRef,
}: ChatContainerProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="glass sticky top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Gradient icon circle */}
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-primary/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-outfit)] text-lg font-semibold tracking-tight text-text">
              MindfulAI
            </h1>
            <p className="text-xs text-text-muted">
              Your mental health companion
            </p>
          </div>
        </div>

        <button
          onClick={onClear}
          aria-label="Clear conversation"
          className="group flex h-9 w-9 items-center justify-center rounded-lg
                     transition-all duration-200
                     hover:bg-surface-lighter active:scale-95"
        >
          <Trash2 className="h-4 w-4 text-text-dim transition-colors group-hover:text-danger" />
        </button>
      </header>

      {/* ── Messages area ── */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-1">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <div className="message-enter flex items-start gap-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-lighter">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
