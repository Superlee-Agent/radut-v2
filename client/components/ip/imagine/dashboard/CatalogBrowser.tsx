import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader } from "lucide-react";
import { SearchResultsGrid, ExpandedAssetModal } from "@/components/ip/search";
import type { SearchResult } from "@/components/ip/remix/types";

interface CatalogBrowserProps {
  onRemixSelected?: (
    asset: SearchResult,
    remixType: "paid" | "free",
  ) => Promise<void>;
  onAssetExpanded?: (asset: SearchResult) => void;
}

const DEFAULT_CATALOG = "MUSHY";

export const CatalogBrowser = ({
  onRemixSelected,
  onAssetExpanded,
}: CatalogBrowserProps) => {
  const [searchInput, setSearchInput] = useState(DEFAULT_CATALOG);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastQueryType, setLastQueryType] = useState<
    "keyword" | "owner" | null
  >(null);
  const [lastResolvedAddress, setLastResolvedAddress] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [ownerDomains, setOwnerDomains] = useState<
    Record<string, { domain: string | null; loading: boolean }>
  >({});
  const [expandedAsset, setExpandedAsset] = useState<SearchResult | null>(null);
  const domainFetchControllerRef = useRef<AbortController | null>(null);

  const ITEMS_PER_PAGE = 20;

  const isIpName = (query: string): boolean => {
    const ipNameRegex = /([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.ip)$/i;
    return ipNameRegex.test(query);
  };

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);
    setCurrentOffset(0);
    setHasMore(false);

    try {
      if (isIpName(searchInput)) {
        console.log(
          "[CatalogBrowser] Detected .ip name, resolving:",
          searchInput,
        );

        const resolveResponse = await fetch("/api/resolve-ip-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ipName: searchInput }),
        });

        if (!resolveResponse.ok) {
          const resolveData = await resolveResponse.json();
          console.error("Failed to resolve .ip name:", resolveData);
          setIsSearching(false);
          return;
        }

        const resolveData = await resolveResponse.json();
        const resolvedAddress = resolveData.address;

        setLastResolvedAddress(resolvedAddress);
        setLastQueryType("owner");

        const searchResponse = await fetch("/api/search-by-owner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: resolvedAddress }),
        });

        if (!searchResponse.ok) {
          throw new Error("Search by owner failed");
        }

        const searchData = await searchResponse.json();
        const results = searchData.results || [];

        setSearchResults(results.slice(0, ITEMS_PER_PAGE));
        setCurrentOffset(ITEMS_PER_PAGE);
        setHasMore(results.length > ITEMS_PER_PAGE);
      } else {
        const response = await fetch("/api/search-ip-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchInput,
            pagination: {
              limit: ITEMS_PER_PAGE,
              offset: 0,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        const results = data.results || [];

        setSearchResults(results);
        setCurrentOffset(ITEMS_PER_PAGE);
        setHasMore(
          data.pagination?.hasMore || results.length >= ITEMS_PER_PAGE,
        );
        setLastQueryType("keyword");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setHasMore(false);
    } finally {
      setIsSearching(false);
    }
  }, [searchInput]);

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);

    try {
      if (lastQueryType === "owner") {
        const searchResponse = await fetch("/api/search-by-owner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: lastResolvedAddress }),
        });

        if (!searchResponse.ok) {
          throw new Error("Search by owner failed");
        }

        const searchData = await searchResponse.json();
        const allResults = searchData.results || [];
        const newResults = allResults.slice(
          currentOffset,
          currentOffset + ITEMS_PER_PAGE,
        );

        setSearchResults((prev) => [...prev, ...newResults]);
        setCurrentOffset(currentOffset + ITEMS_PER_PAGE);
        setHasMore(currentOffset + ITEMS_PER_PAGE < allResults.length);
      } else {
        const response = await fetch("/api/search-ip-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchInput,
            pagination: {
              limit: ITEMS_PER_PAGE,
              offset: currentOffset,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        const newResults = data.results || [];

        setSearchResults((prev) => [...prev, ...newResults]);
        setCurrentOffset(currentOffset + ITEMS_PER_PAGE);
        setHasMore(data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error("Load more error:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentOffset, searchInput, lastQueryType, lastResolvedAddress]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);

      if (!value.trim()) {
        setSearchResults([]);
        setHasSearched(false);
      }
    },
    [],
  );

  // Fetch domains for all unique owners
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    searchResults.forEach((asset) => {
      if (asset.ownerAddress) {
        owners.add(asset.ownerAddress.toLowerCase());
      }
    });
    return Array.from(owners);
  }, [searchResults]);

  useEffect(() => {
    if (uniqueOwners.length === 0) {
      return;
    }

    if (domainFetchControllerRef.current) {
      domainFetchControllerRef.current.abort();
    }
    domainFetchControllerRef.current = new AbortController();

    const loadingState: Record<
      string,
      { domain: string | null; loading: boolean }
    > = {};
    uniqueOwners.forEach((owner) => {
      loadingState[owner] = { domain: null, loading: true };
    });
    setOwnerDomains(loadingState);

    Promise.all(
      uniqueOwners.map((owner) => {
        return fetch("/api/resolve-owner-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: owner }),
          signal: domainFetchControllerRef.current?.signal,
        })
          .then((res) => res.json())
          .then((data) => {
            return {
              address: owner,
              domain: data.ok ? data.domain : null,
            };
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.error("Error fetching domain:", err);
            }
            return {
              address: owner,
              domain: null,
            };
          });
      }),
    )
      .then((results) => {
        const newDomains: Record<
          string,
          { domain: string | null; loading: boolean }
        > = {};
        results.forEach(({ address, domain }) => {
          newDomains[address] = { domain, loading: false };
        });
        setOwnerDomains(newDomains);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Error fetching domains:", err);
        }
      });

    return () => {
      if (domainFetchControllerRef.current) {
        domainFetchControllerRef.current.abort();
      }
    };
  }, [uniqueOwners]);

  const truncateAddressDisplay = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const getRemixTypes = (asset: SearchResult) => {
    if (!asset.licenses || asset.licenses.length === 0) {
      return [];
    }

    const remixTypesMap = new Map<
      "paid" | "free",
      { hasAttribution: boolean }
    >();

    for (const license of asset.licenses) {
      const terms = license.terms || license;
      const derivativesAllowed =
        terms?.derivativesAllowed === true ||
        license.derivativesAllowed === true;

      if (!derivativesAllowed) continue;

      const commercialUse = terms?.commercialUse === true;
      const remixType: "paid" | "free" = commercialUse ? "paid" : "free";

      const derivativesAttribution =
        terms?.derivativesAttribution === true ||
        license.derivativesAttribution === true;

      if (!remixTypesMap.has(remixType)) {
        remixTypesMap.set(remixType, {
          hasAttribution: derivativesAttribution,
        });
      } else {
        const existing = remixTypesMap.get(remixType)!;
        existing.hasAttribution =
          existing.hasAttribution || derivativesAttribution;
      }
    }

    return Array.from(remixTypesMap.entries()).map(([type, info]) => ({
      type,
      hasAttribution: info.hasAttribution,
    }));
  };

  // Auto-search on mount with default catalog
  useEffect(() => {
    handleSearch();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col"
    >
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex gap-2 items-center">
          <div className="relative flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search catalogs..."
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="px-4 py-2 pr-10 rounded-lg bg-slate-800 text-white placeholder:text-slate-400 border border-slate-700 focus:border-[#FF4DA6] focus:outline-none transition-colors flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 rounded-lg bg-[#FF4DA6] text-white font-semibold hover:bg-[#FF4DA6]/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="w-full flex-1 overflow-y-auto">
        {hasSearched ? (
          <>
            {searchResults.length > 0 ? (
              <>
                <SearchResultsGrid
                  searchResults={searchResults}
                  ownerDomains={ownerDomains}
                  hoveredIndex={hoveredIndex}
                  setHoveredIndex={setHoveredIndex}
                  getRemixTypes={getRemixTypes}
                  allowsDerivatives={() => true}
                  truncateAddressDisplay={truncateAddressDisplay}
                  isLoadingOwnerAssets={false}
                  onAssetClick={(asset) => {
                    setExpandedAsset(asset);
                    onAssetExpanded?.(asset);
                  }}
                  onOwnerClick={() => {}}
                  onRemixSelected={onRemixSelected}
                />

                {hasMore && (
                  <div className="flex justify-center pt-8 pb-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="text-sm text-[#FF4DA6] hover:text-[#FF4DA6]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>Load more</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-slate-500 mb-3" />
                <p className="text-slate-300 text-sm">No results found</p>
                <p className="text-slate-500 text-xs mt-1">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="h-8 w-8 text-[#FF4DA6] animate-spin mb-3" />
            <p className="text-slate-300 text-sm">Loading catalog...</p>
          </div>
        )}
      </div>

      {/* Expanded Asset Modal */}
      <AnimatePresence>
        {expandedAsset && (
          <ExpandedAssetModal
            asset={expandedAsset}
            isOpen={true}
            onClose={() => setExpandedAsset(null)}
            onShowDetails={() => {}}
            onRemixSelected={async (remixType) => {
              console.log("📤 CatalogBrowser onRemixSelected called:", {
                remixType,
                hasExpandedAsset: !!expandedAsset,
                assetIpId: expandedAsset?.ipId,
                assetTitle: expandedAsset?.title,
                hasMediaUrl: !!expandedAsset?.mediaUrl,
                hasThumbnailUrl: !!expandedAsset?.thumbnailUrl,
              });
              if (onRemixSelected && expandedAsset) {
                try {
                  await onRemixSelected(expandedAsset, remixType);
                } catch (error) {
                  console.error("❌ Error handling remix selection:", error);
                }
              } else {
                console.warn(
                  "⚠️ onRemixSelected not called - missing handler or asset",
                  {
                    hasCallback: !!onRemixSelected,
                    hasAsset: !!expandedAsset,
                  },
                );
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
