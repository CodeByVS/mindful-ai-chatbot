'use client';

import { useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="border-t border-surface-border bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        {/* Textarea wrapper */}
        <div className="glass flex-1 rounded-2xl px-4 py-3 transition-all duration-200 focus-within:border-primary/30 focus-within:shadow-lg focus-within:shadow-primary/5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind…"
            disabled={isLoading}
            rows={1}
            className="scrollbar-thin w-full resize-none bg-transparent text-[0.935rem]
                       leading-relaxed text-text placeholder-text-dim
                       outline-none disabled:opacity-50"
          />
        </div>

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className="gradient-primary flex h-11 w-11 shrink-0 items-center justify-center
                     rounded-xl shadow-lg shadow-primary/25
                     transition-all duration-200
                     hover:shadow-xl hover:shadow-primary/30
                     active:scale-95
                     disabled:opacity-40 disabled:shadow-none disabled:hover:shadow-none"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <SendHorizontal className="h-5 w-5 text-white" />
          )}
        </button>
      </div>

      {/* Hint text */}
      <p className="mx-auto mt-2 max-w-3xl text-center text-[0.68rem] text-text-dim">
        MindfulAI provides general information, not professional medical advice.
      </p>
    </div>
  );
}
