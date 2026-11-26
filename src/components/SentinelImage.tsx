import { useState } from 'react';
import { Shield } from 'lucide-react';

interface SentinelImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SentinelImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: SentinelImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#131B2E] via-[#0E1524] to-[#090D16] text-[#94A3B8] ${className}`}
      >
        <Shield className="h-6 w-6 text-[#06B6D4]/70" aria-hidden="true" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-[#94A3B8]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
