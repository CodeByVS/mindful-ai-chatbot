import {
  Sparkles,
  ShieldQuestion,
  HeartPulse,
  BookOpen,
  Leaf,
} from 'lucide-react';

interface EmptyStateProps {
  onSuggestionClick: (question: string) => void;
}

const suggestions = [
  {
    icon: ShieldQuestion,
    text: 'What are some techniques for managing anxiety?',
    color: 'text-primary',
  },
  {
    icon: HeartPulse,
    text: 'How can I build better mental resilience?',
    color: 'text-danger',
  },
  {
    icon: BookOpen,
    text: 'What is positive psychology?',
    color: 'text-accent',
  },
  {
    icon: Leaf,
    text: 'How does mindfulness help with stress?',
    color: 'text-success',
  },
];

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        {/* Animated icon */}
        <div className="mb-6 inline-flex items-center justify-center">
          <div className="relative">
            <div className="gradient-primary flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl shadow-primary/30">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            {/* Glow ring */}
            <div className="absolute -inset-2 -z-10 rounded-3xl bg-primary/10 blur-xl" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="gradient-text font-[family-name:var(--font-outfit)] text-4xl font-bold tracking-tight sm:text-5xl">
          MindfulAI
        </h1>

        <p className="mt-3 text-lg text-text-muted">
          Your compassionate mental health companion
        </p>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-text-dim">
          I can help you explore evidence-based techniques for managing stress,
          building emotional resilience, practicing mindfulness, and
          understanding positive psychology. Ask me anything.
        </p>

        {/* Suggestion cards */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s.text}
              onClick={() => onSuggestionClick(s.text)}
              className="glass group flex items-start gap-3 rounded-xl px-4 py-3.5 text-left
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:border-primary/20
                         hover:shadow-lg hover:shadow-primary/5
                         active:scale-[0.98]"
            >
              <s.icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${s.color} transition-transform duration-200 group-hover:scale-110`}
              />
              <span className="text-sm leading-snug text-text-muted transition-colors group-hover:text-text">
                {s.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
