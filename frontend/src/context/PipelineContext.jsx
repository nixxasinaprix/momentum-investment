import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PIPELINE_PARAMS } from "../lib/pipelineDefaults";

const STORAGE_KEY = "momentum_pipeline_params";

function readStoredParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PIPELINE_PARAMS;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? { ...DEFAULT_PIPELINE_PARAMS, ...parsed }
      : DEFAULT_PIPELINE_PARAMS;
  } catch {
    return DEFAULT_PIPELINE_PARAMS;
  }
}

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
  const [params, setParamsState] = useState(() => readStoredParams());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch {
      // Ignore storage errors
    }
  }, [params]);

  const setParams = useCallback((updater) => {
    setParamsState((prev) =>
      typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
    );
  }, []);

  const resetParams = useCallback(() => {
    setParamsState(DEFAULT_PIPELINE_PARAMS);
  }, []);

  return (
    <PipelineContext.Provider value={{ params, setParams, resetParams }}>
      {children}
    </PipelineContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePipelineParams() {
  const ctx = useContext(PipelineContext);
  if (!ctx) {
    throw new Error("usePipelineParams must be used within a PipelineProvider");
  }
  return ctx;
}
