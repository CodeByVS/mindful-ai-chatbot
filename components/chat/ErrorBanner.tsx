import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="slide-in-top relative z-30 flex items-center gap-3 border-b border-danger/15
                 bg-gradient-to-r from-red-50 via-rose-50 to-red-50
                 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
      <p className="flex-1 text-sm text-danger">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="flex h-7 w-7 items-center justify-center rounded-md
                   transition-colors duration-150
                   hover:bg-danger/10 active:scale-95"
      >
        <X className="h-4 w-4 text-danger/80" />
      </button>
    </div>
  );
}
