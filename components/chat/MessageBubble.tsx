import type { Message } from '@/types/chat';
import { cn, formatTimestamp } from '@/lib/utils';
import { User, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'message-enter flex items-start gap-3 py-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser
            ? 'gradient-primary shadow-lg shadow-primary/20'
            : 'bg-surface-lighter'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%]',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[0.935rem] leading-relaxed',
            isUser
              ? 'gradient-primary rounded-tr-sm text-white shadow-lg shadow-primary/10'
              : 'glass rounded-tl-sm text-text'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div>
              {/* Model indicator at the top of the answer */}
              <div className="mb-2 flex items-center gap-1.5 border-b border-surface-border/60 pb-1.5 text-[0.72rem] text-text-muted select-none">
                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                <span className="font-semibold text-text-muted">Model:</span>
                <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                  {message.model || 'Qwen 3.8 27B (Groq)'}
                </span>
              </div>

              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            'mt-1 block text-[0.7rem] text-text-dim',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
