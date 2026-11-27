import { useMemo } from "react";
import katex from "katex";

export default function MathFormula({ math, display = false, className = "" }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  if (display) {
    return (
      <div
        className={`overflow-x-auto py-1 text-[var(--text-primary)] ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block align-middle text-[var(--text-primary)] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
