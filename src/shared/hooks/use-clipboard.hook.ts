import { useCallback, useState } from 'react';

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        if (!document.execCommand('copy')) return false;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
    return true;
  }, []);

  return { copy, copied };
}
