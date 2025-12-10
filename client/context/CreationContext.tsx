import React, {
  createContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ResultType } from "@/types/generation";

export interface Creation {
  id: string;
  url: string;
  type: ResultType;
  timestamp: number;
  prompt: string;
  walletAddress: string; // Wallet address (required for wallet-only mode)
  remixType?: "paid" | "free" | null;
  parentAsset?: any;
  originalUrl?: string;
  registeredByWallet?: string;
  registeredIpId?: string; // Child IP ID from Story Protocol registration
  watermarkedUrl?: string; // Watermarked version for paid remix - stored in Supabase
  childIpId?: string; // Child IP ID - marks as registered
  isUploadingUrl?: boolean; // Track if watermarked/original URL is still uploading to Supabase
}

interface CreationContextType {
  resultUrl: string | null;
  setResultUrl: (url: string | null) => void;
  resultType: ResultType;
  setResultType: (type: ResultType) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchError: string | null;
  setFetchError: (error: string | null) => void;
  creations: Creation[];
  addCreation: (
    url: string,
    type: ResultType,
    prompt: string,
    walletAddress: string,
    remixType?: "paid" | "free" | null,
    parentAsset?: any,
    originalUrl?: string,
    watermarkedUrl?: string,
  ) => void;
  updateCreationWithOriginalUrl: (
    id: string,
    originalUrl: string,
    registeredByWallet?: string,
    registeredIpId?: string,
  ) => void;
  updateCreationUploadStatus: (id: string, isUploading: boolean) => void;
  getRegisteredIpIdsForWallet: (walletAddress: string) => string[];
  isCreationUnlockedByWallet: (
    creationId: string,
    walletAddress: string,
  ) => boolean;
  removeCreation: (id: string) => void;
  clearCreations: () => void;
  refreshWalletCreations: (walletAddress: string) => Promise<void>;
  originalPrompt: string;
  setOriginalPrompt: (prompt: string) => void;
  setUserIdentifier: (walletAddress: string | null) => void;
}

export const CreationContext = createContext<CreationContextType | undefined>(
  undefined,
);

const RESULT_URL_KEY = "current_result_url";
const RESULT_TYPE_KEY = "current_result_type";
const ORIGINAL_PROMPT_KEY = "original_prompt";

/**
 * Clear all cache keys from localStorage
 * Called when wallet disconnects or switches
 */
const clearAllCache = () => {
  localStorage.removeItem(RESULT_URL_KEY);
  localStorage.removeItem(RESULT_TYPE_KEY);
  localStorage.removeItem(ORIGINAL_PROMPT_KEY);
  console.log("[CreationContext] All cache cleared from localStorage");
};

export const CreationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<ResultType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [originalPrompt, setOriginalPrompt] = useState<string>("");
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [previousWalletAddress, setPreviousWalletAddress] = useState<
    string | null
  >(null);

  // Load creations from localStorage if wallet was connected on previous session
  useEffect(() => {
    const storedResultUrl = localStorage.getItem(RESULT_URL_KEY);
    const storedResultType = localStorage.getItem(RESULT_TYPE_KEY);
    const storedPrompt = localStorage.getItem(ORIGINAL_PROMPT_KEY);

    if (storedResultUrl && walletAddress) {
      setResultUrl(storedResultUrl);
    }
    if (storedResultType && walletAddress) {
      setResultType(storedResultType as ResultType);
    }
    if (storedPrompt && walletAddress) {
      setOriginalPrompt(storedPrompt);
    }
  }, []);

  // Detect wallet switch (but NOT disconnect) - only clear cache when switching to a different wallet
  useEffect(() => {
    if (
      previousWalletAddress &&
      walletAddress &&
      previousWalletAddress !== walletAddress
    ) {
      console.log(
        `[CreationContext] Wallet switched from ${previousWalletAddress} to ${walletAddress}. Clearing cache.`,
      );
      clearAllCache();
      setResultUrl(null);
      setResultType(null);
      setOriginalPrompt("");
      setCreations([]);
      setFetchError(null);
    }

    setPreviousWalletAddress(walletAddress);
  }, [walletAddress, previousWalletAddress]);

  // Fetch wallet creations when wallet connects
  useEffect(() => {
    if (!walletAddress) {
      // Don't clear creations when wallet disconnects - user may reconnect later
      return;
    }

    const fetchCreations = async () => {
      try {
        setFetchError(null);
        const params = new URLSearchParams({
          requesting_wallet: walletAddress,
        });
        const response = await fetch(
          `/api/wallet-creations/${walletAddress}?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.creations && Array.isArray(data.creations)) {
            const validCreations = data.creations.map((c: any) => ({
              ...c,
              walletAddress: walletAddress,
            }));
            setCreations(validCreations);
            setFetchError(null);
            console.log(
              `[CreationContext] Loaded ${validCreations.length} creations from Supabase`,
            );
          }
        } else {
          const errorText = await response.text();
          const errorMsg = `Failed to fetch wallet creations: ${response.status} ${errorText.substring(0, 100)}`;
          console.error("[CreationContext]", errorMsg);
          setFetchError(errorMsg);
          // Don't clear local creations on error - keep locally added items
          console.log(
            "[CreationContext] Keeping locally cached creations due to fetch error",
          );
        }
      } catch (error: any) {
        const errorMsg = error?.message || "Failed to fetch creations";
        console.error("[CreationContext] Error fetching creations:", errorMsg);
        setFetchError(errorMsg);
        // Don't clear local creations on error - keep locally added items
        console.log(
          "[CreationContext] Keeping locally cached creations due to network error",
        );
      }
    };

    fetchCreations();
  }, [walletAddress]);

  // Save current result URL to localStorage
  useEffect(() => {
    if (walletAddress) {
      const lastResult = creations[0];
      if (lastResult?.url) {
        localStorage.setItem(RESULT_URL_KEY, lastResult.url);
      } else if (!resultUrl?.includes("data:")) {
        if (resultUrl) {
          localStorage.setItem(RESULT_URL_KEY, resultUrl);
        } else {
          localStorage.removeItem(RESULT_URL_KEY);
        }
      }
    }
  }, [resultUrl, creations, walletAddress]);

  // Save current result type to localStorage
  useEffect(() => {
    if (walletAddress) {
      const lastResult = creations[0];
      if (lastResult?.type) {
        localStorage.setItem(RESULT_TYPE_KEY, lastResult.type);
      } else if (resultType) {
        localStorage.setItem(RESULT_TYPE_KEY, resultType);
      } else {
        localStorage.removeItem(RESULT_TYPE_KEY);
      }
    }
  }, [resultType, creations, walletAddress]);

  // Save original prompt to localStorage
  useEffect(() => {
    if (walletAddress) {
      if (originalPrompt) {
        localStorage.setItem(ORIGINAL_PROMPT_KEY, originalPrompt);
      } else {
        localStorage.removeItem(ORIGINAL_PROMPT_KEY);
      }
    }
  }, [originalPrompt, walletAddress]);

  useEffect(() => {
    return () => {
      if (resultUrl && resultUrl.startsWith("blob:")) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const addCreation = useCallback(
    (
      url: string,
      type: ResultType,
      prompt: string,
      walletAddr: string,
      remixType?: "paid" | "free" | null,
      parentAsset?: any,
      originalUrl?: string,
      watermarkedUrl?: string,
    ) => {
      const now = Date.now();
      const newCreation: Creation = {
        id: `creation_${now}`,
        url,
        type,
        timestamp: now,
        prompt,
        walletAddress: walletAddr,
        remixType,
        parentAsset,
        originalUrl,
        watermarkedUrl,
      };
      setCreations((prev) => [newCreation, ...prev]);

      if (walletAddr) {
        // Sync to Supabase with retry logic
        const syncCreationToSupabase = async (retryCount = 0) => {
          try {
            const params = new URLSearchParams({
              requesting_wallet: walletAddr,
            });
            const response = await fetch(
              `/api/wallet-creations?${params.toString()}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCreation),
              },
            );

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `Failed to sync creation: ${response.status} ${errorText}`,
              );
            }

            console.log(
              `[CreationContext] Creation synced to Supabase: ${newCreation.id}`,
            );
          } catch (error: any) {
            console.warn(
              `[CreationContext] Attempt ${retryCount + 1} to sync creation failed:`,
              error?.message,
            );

            // Retry up to 3 times with exponential backoff
            if (retryCount < 3) {
              const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              setTimeout(() => {
                syncCreationToSupabase(retryCount + 1);
              }, delayMs);
            } else {
              console.error(
                `[CreationContext] Failed to sync creation after 3 retries:`,
                newCreation.id,
              );
              // Creation will be persisted locally and user can try to sync again on next connect
            }
          }
        };

        // Start sync in background
        syncCreationToSupabase();
      }
    },
    [],
  );

  const updateCreationWithOriginalUrl = useCallback(
    (
      id: string,
      originalUrl: string,
      registeredByWallet?: string,
      registeredIpId?: string,
    ) => {
      console.log(`[CreationContext] updateCreationWithOriginalUrl called:`, {
        id,
        originalUrl: originalUrl ? "provided" : "missing",
        registeredByWallet,
        registeredIpId,
      });
      setCreations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              originalUrl,
              registeredByWallet,
              registeredIpId,
              childIpId: registeredIpId,
              ...(originalUrl && { url: originalUrl }),
            };
          }
          return c;
        });

        // Sync updated creation to server with retry logic
        const updatedCreation = updated.find((c) => c.id === id);
        if (updatedCreation) {
          const syncUpdate = async (retryCount = 0) => {
            try {
              const params = new URLSearchParams({
                requesting_wallet: updatedCreation.walletAddress,
              });
              const response = await fetch(
                `/api/wallet-creations/${id}?${params.toString()}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updatedCreation),
                },
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                  `Failed to sync update: ${response.status} ${errorText}`,
                );
              }

              console.log(
                `[CreationContext] Creation update synced to Supabase: ${id}`,
              );
            } catch (error: any) {
              console.warn(
                `[CreationContext] Attempt ${retryCount + 1} to sync update failed:`,
                error?.message,
              );

              // Retry up to 3 times with exponential backoff
              if (retryCount < 3) {
                const delayMs = Math.pow(2, retryCount) * 1000;
                setTimeout(() => {
                  syncUpdate(retryCount + 1);
                }, delayMs);
              } else {
                console.error(
                  `[CreationContext] Failed to sync update after 3 retries: ${id}`,
                );
              }
            }
          };

          syncUpdate();
        }

        return updated;
      });
    },
    [],
  );

  const updateCreationUploadStatus = useCallback(
    (id: string, isUploading: boolean) => {
      setCreations((prev) => {
        return prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              isUploadingUrl: isUploading,
            };
          }
          return c;
        });
      });
    },
    [],
  );

  const getRegisteredIpIdsForWallet = useCallback(
    (walletAddr: string): string[] => {
      return creations
        .filter(
          (c) =>
            c.registeredByWallet?.toLowerCase() === walletAddr?.toLowerCase() &&
            c.registeredIpId,
        )
        .map((c) => c.registeredIpId!)
        .filter(Boolean);
    },
    [creations],
  );

  const isCreationUnlockedByWallet = useCallback(
    (creationId: string, walletAddr: string): boolean => {
      const creation = creations.find((c) => c.id === creationId);
      if (!creation || !creation.registeredByWallet) return false;
      return (
        creation.registeredByWallet.toLowerCase() ===
          walletAddr?.toLowerCase() && !!creation.originalUrl
      );
    },
    [creations],
  );

  const removeCreation = useCallback((id: string) => {
    setCreations((prev) => {
      const creation = prev.find((c) => c.id === id);
      if (creation && creation.walletAddress) {
        const params = new URLSearchParams({
          requesting_wallet: creation.walletAddress,
        });
        fetch(`/api/wallet-creations/${id}?${params.toString()}`, {
          method: "DELETE",
        }).catch((error) => {
          console.warn("Failed to delete wallet creation from server:", error);
        });
      }
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const clearCreations = useCallback(() => {
    setCreations([]);
    clearAllCache();
    setResultUrl(null);
    setResultType(null);
    setOriginalPrompt("");
  }, []);

  const refreshWalletCreations = useCallback(async (walletAddr: string) => {
    try {
      setFetchError(null);
      const params = new URLSearchParams({
        requesting_wallet: walletAddr,
      });
      const response = await fetch(
        `/api/wallet-creations/${walletAddr}?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.creations && Array.isArray(data.creations)) {
          const validCreations = data.creations.map((c: any) => ({
            ...c,
            walletAddress: walletAddr,
          }));
          setCreations(validCreations);
          setFetchError(null);
          console.log(
            `[CreationContext] Refreshed ${validCreations.length} creations from Supabase for ${walletAddr.substring(0, 6)}...`,
          );
        }
      } else if (response.status === 403) {
        console.warn(
          "[CreationContext] Unauthorized wallet access - clearing creations",
        );
        setFetchError("Unauthorized: wallet address mismatch");
        setCreations([]);
      } else {
        const errorText = await response.text();
        const errorMsg = `Failed to refresh wallet creations: ${response.status} ${errorText.substring(0, 100)}`;
        console.error("[CreationContext]", errorMsg);
        setFetchError(errorMsg);
        // Don't clear local creations on error - keep locally added items
        console.log(
          "[CreationContext] Keeping locally cached creations due to refresh error",
        );
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to refresh wallet creations";
      console.error("[CreationContext] Error refreshing creations:", errorMsg);
      setFetchError(errorMsg);
      // Don't clear local creations on error - keep locally added items
      console.log(
        "[CreationContext] Keeping locally cached creations due to network error",
      );
    }
  }, []);

  const setUserIdentifier = useCallback((walletAddr: string | null) => {
    console.log(`[CreationContext] Wallet identifier changed: ${walletAddr}`);
    setWalletAddressState(walletAddr);
  }, []);

  const contextValue = useMemo(
    () => ({
      resultUrl,
      setResultUrl,
      resultType,
      setResultType,
      isLoading,
      setIsLoading,
      loadingMessage,
      setLoadingMessage,
      error,
      setError,
      fetchError,
      setFetchError,
      creations,
      addCreation,
      updateCreationWithOriginalUrl,
      updateCreationUploadStatus,
      getRegisteredIpIdsForWallet,
      isCreationUnlockedByWallet,
      removeCreation,
      clearCreations,
      refreshWalletCreations,
      originalPrompt,
      setOriginalPrompt,
      setUserIdentifier,
    }),
    [
      resultUrl,
      resultType,
      isLoading,
      loadingMessage,
      error,
      fetchError,
      creations,
      addCreation,
      updateCreationWithOriginalUrl,
      updateCreationUploadStatus,
      getRegisteredIpIdsForWallet,
      isCreationUnlockedByWallet,
      removeCreation,
      clearCreations,
      refreshWalletCreations,
      originalPrompt,
      setUserIdentifier,
    ],
  ) as CreationContextType;

  return (
    <CreationContext.Provider value={contextValue}>
      {children}
    </CreationContext.Provider>
  );
};
