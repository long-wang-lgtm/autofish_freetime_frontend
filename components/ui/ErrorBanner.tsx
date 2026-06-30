'use client';

interface ErrorBannerProps {
  message: string;
  variant: 'banner' | 'inline';
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, variant, onRetry, onDismiss }: ErrorBannerProps) {
  const isBanner = variant === 'banner';

  return (
    <div
      className={
        isBanner
          ? 'bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3'
          : 'bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2'
      }
      role="alert"
    >
      <svg
        width={isBanner ? 20 : 16}
        height={isBanner ? 20 : 16}
        viewBox="0 0 20 20"
        fill="currentColor"
        className={
          isBanner
            ? 'text-red-500 flex-shrink-0 mt-0.5'
            : 'text-red-500 flex-shrink-0 mt-0.5'
        }
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      <p className={isBanner ? 'text-sm text-red-700 flex-1' : 'text-sm text-red-600 flex-1'}>
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className={
            isBanner
              ? 'text-sm text-red-700 font-medium hover:text-red-800 ml-2 flex-shrink-0'
              : 'text-sm text-red-600 font-medium hover:text-red-800 ml-2 flex-shrink-0'
          }
        >
          重试
        </button>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="关闭错误提示"
        >
          <svg
            width={isBanner ? 20 : 16}
            height={isBanner ? 20 : 16}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}
