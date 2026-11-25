import { useCallback, useEffect, useState } from "react";

const WATCHLIST_KEY = "momentum_watchlist";

function readWatchlist() {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => readWatchlist());

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      // Ignore storage quota errors
    }
  }, [watchlist]);

  const isWatched = useCallback(
    (symbol) => watchlist.includes(symbol),
    [watchlist]
  );

  const toggleWatchlist = useCallback((symbol) => {
    setWatchlist((prev) =>
      prev.includes(symbol)
        ? prev.filter((item) => item !== symbol)
        : [...prev, symbol]
    );
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return { watchlist, isWatched, toggleWatchlist, clearWatchlist };
}
