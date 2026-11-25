import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const RESPONSE_CACHE = new Map();
const DEFAULT_TTL_MS = 3 * 60 * 1000;

export function clearApiCache() {
  RESPONSE_CACHE.clear();
}

function readCache(key) {
  if (!key) return null;
  const hit = RESPONSE_CACHE.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }
  return null;
}

export function useCachedApi(path, { enabled = true, ttlMs = DEFAULT_TTL_MS } = {}) {
  const { token } = useAuth();
  const cacheKey = path && token && enabled ? `${token.slice(-12)}:${path}` : null;
  const [refreshTick, setRefreshTick] = useState(0);
  const [state, setState] = useState({
    key: null,
    data: null,
    error: null,
    settled: false,
  });

  useEffect(() => {
    if (!cacheKey) return;

    const hit = refreshTick === 0 ? readCache(cacheKey) : null;
    if (hit !== null) {
      return;
    }

    let active = true;
    api(path, { token })
      .then((result) => {
        RESPONSE_CACHE.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + ttlMs,
        });
        if (active) {
          setState({ key: cacheKey, data: result, error: null, settled: true });
        }
      })
      .catch((err) => {
        if (active) {
          setState({
            key: cacheKey,
            data: null,
            error: err.message || "Failed to load data",
            settled: true,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [cacheKey, path, token, ttlMs, refreshTick]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      RESPONSE_CACHE.delete(cacheKey);
    }
    setState({ key: cacheKey, data: null, error: null, settled: false });
    setRefreshTick((t) => t + 1);
  }, [cacheKey]);

  const cachedValue = readCache(cacheKey);
  const data = cachedValue !== null ? cachedValue : state.key === cacheKey ? state.data : null;
  const error = cachedValue === null && state.key === cacheKey ? state.error : null;
  const loading = Boolean(cacheKey) && cachedValue === null && !(state.key === cacheKey && state.settled);

  return { data, loading, error, refetch };
}
