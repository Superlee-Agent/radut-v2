interface License {
  licenseTermsId?: string;
  terms?: {
    derivativesAllowed?: boolean;
    [key: string]: any;
  };
  derivativesAllowed?: boolean;
  [key: string]: any;
}

interface SearchResult {
  ipId?: string;
  title?: string;
  name?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  ownerAddress?: string;
  isDerivative?: boolean;
  score?: number;
  licenses?: License[];
  [key: string]: any;
}

interface SearchResultsGridProps {
  searchResults: SearchResult[];
  ownerDomains: Record<string, { domain: string | null; loading: boolean }>;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
  getRemixTypes: (
    asset: SearchResult,
  ) => Array<{ type: "paid" | "free"; hasAttribution: boolean }>;
  allowsDerivatives: (asset: SearchResult) => boolean;
  truncateAddressDisplay: (address: string) => string;
  isLoadingOwnerAssets?: boolean;
  onAssetClick?: (asset: SearchResult) => void;
  onOwnerClick?: (ownerAddress: string, ownerDomain?: string | null) => void;
}

export const SearchResultsGrid = ({
  searchResults,
  ownerDomains,
  hoveredIndex,
  setHoveredIndex,
  getRemixTypes,
  allowsDerivatives: _allowsDerivatives,
  truncateAddressDisplay,
  isLoadingOwnerAssets = false,
  onAssetClick,
  onOwnerClick,
}: SearchResultsGridProps) => {
  return (
    <div className="w-full">
      {isLoadingOwnerAssets ? (
        <div className="flex items-center justify-center h-full gap-3">
          <div className="w-4 h-4 rounded-full bg-[#FF4DA6] animate-bounce" />
          <span className="text-slate-400">Loading owner assets...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-max">
          {searchResults.map((asset, idx) => {
            const ownerLower = asset.ownerAddress?.toLowerCase() || "";
            const domainInfo = ownerDomains[ownerLower];
            const displayDomain = domainInfo?.domain;
            const displayText =
              displayDomain ||
              (asset.ownerAddress
                ? truncateAddressDisplay(asset.ownerAddress)
                : "Unknown");
            const remixTypes = getRemixTypes(asset);

            return (
              <div
                key={asset.ipId || idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group flex flex-col h-full cursor-pointer rounded-xl overflow-hidden bg-slate-950/50 border border-slate-800/50 transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/50"
              >
                {/* Thumbnail Container */}
                <div
                  className="relative w-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-xl overflow-hidden flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 flex-shrink-0 hover:-translate-y-0.5"
                  onClick={() => onAssetClick?.(asset)}
                >
                  {asset.mediaUrl ? (
                    asset.mediaType?.startsWith("video") ? (
                      <div className="w-full h-full relative group/video">
                        <video
                          key={asset.ipId}
                          src={asset.mediaUrl}
                          poster={asset.thumbnailUrl}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          playsInline
                        />
                        {/* Play button overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover/video:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover/video:opacity-100">
                          <div className="w-16 h-16 rounded-full bg-[#FF4DA6] flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                            <svg
                              className="w-8 h-8 text-white fill-current ml-1"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 3v18h18V3H3zm9 14V7l5 5-5 5z" />
                            </svg>
                          </div>
                        </div>
                        {/* Video badge */}
                        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-white">
                          VIDEO
                        </div>
                      </div>
                    ) : asset.mediaType?.startsWith("audio") ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-purple-900/80 via-purple-800/40 to-slate-900 cursor-pointer hover:scale-102 transition-transform">
                        <svg
                          className="w-14 h-14 text-purple-300 hover:scale-110 transition-transform"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        <span className="text-xs text-purple-200 font-semibold">
                          AUDIO
                        </span>
                      </div>
                    ) : (
                      <img
                        src={asset.mediaUrl}
                        alt={asset.title || asset.name || "IP Asset"}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onClick={() => onAssetClick?.(asset)}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const parent = img.parentElement;
                          if (parent && parent.querySelector("img") === img) {
                            img.replaceWith(
                              Object.assign(document.createElement("div"), {
                                className:
                                  "w-full h-full flex flex-col items-center justify-center p-4 text-slate-300 bg-gradient-to-br from-slate-800/80 to-slate-900 relative group/fallback",
                                innerHTML: `
                                <div class="absolute inset-0 opacity-5">
                                  <div class="absolute inset-0 bg-gradient-to-br from-[#FF4DA6] to-transparent"></div>
                                </div>
                                <div class="relative z-10 w-full h-full flex flex-col items-center justify-center gap-3">
                                  <svg class="w-10 h-10 text-slate-500 group-hover/fallback:text-[#FF4DA6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <div class="text-center space-y-1 flex-1 flex flex-col justify-center">
                                    <p class="text-xs font-semibold text-slate-200">Image failed to load</p>
                                    <p class="text-[0.65rem] text-slate-400">Try viewing full details</p>
                                  </div>
                                </div>
                              `,
                              }),
                            );
                          }
                        }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-300 bg-gradient-to-br from-slate-800/80 to-slate-900 relative group/fallback">
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FF4DA6] to-transparent" />
                      </div>

                      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-3">
                        {/* Icon */}
                        <svg
                          className="w-10 h-10 text-slate-500 group-hover/fallback:text-[#FF4DA6] transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="m4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>

                        {/* Title for missing image */}
                        <div className="text-center space-y-1 flex-1 flex flex-col justify-center">
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-2">
                            {asset.title || asset.name || "Asset"}
                          </h4>
                          <p className="text-[0.65rem] text-slate-400">
                            No media available
                          </p>
                        </div>

                        {/* Media Type */}
                        {asset.mediaType && (
                          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-semibold">
                            {asset.mediaType
                              .replace("video/", "")
                              .replace("audio/", "")
                              .replace("image/", "")
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {hoveredIndex === idx && (
                    <div className="absolute inset-0 ring-2 ring-[#FF4DA6]/60 rounded-xl pointer-events-none" />
                  )}

                  {/* Remix Type Badges - Top Right */}
                  {remixTypes.length > 0 && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {remixTypes.map((remixTypeInfo) => (
                        <span
                          key={remixTypeInfo.type}
                          className="text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap backdrop-blur-sm bg-slate-900/80 border"
                          style={{
                            backgroundColor:
                              remixTypeInfo.type === "paid"
                                ? "rgba(34, 197, 94, 0.2)"
                                : "rgba(59, 130, 246, 0.2)",
                            borderColor:
                              remixTypeInfo.type === "paid"
                                ? "rgb(134, 239, 172)"
                                : "rgb(147, 197, 253)",
                            color:
                              remixTypeInfo.type === "paid"
                                ? "rgb(134, 239, 172)"
                                : "rgb(147, 197, 253)",
                          }}
                        >
                          {remixTypeInfo.type === "paid"
                            ? "💰 Paid"
                            : "🆓 Free"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="pt-3 px-4 pb-4 space-y-3 flex flex-col flex-grow">
                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-100 line-clamp-2 group-hover:text-[#FF4DA6] transition-colors duration-200">
                    {asset.title || asset.name || "Untitled Asset"}
                  </h3>

                  {/* Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap backdrop-blur-sm transition-all ${
                        asset.isDerivative
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {asset.isDerivative ? "🔄 Remix" : "✨ Original"}
                    </span>

                    {asset.score !== undefined && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#FF4DA6]/20 text-[#FF4DA6] border border-[#FF4DA6]/30 font-semibold whitespace-nowrap backdrop-blur-sm">
                        {(asset.score * 100).toFixed(0)}% Match
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {asset.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {asset.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-slate-500 space-y-2 mt-auto">
                    {asset.mediaType && (
                      <p className="capitalize text-xs text-slate-400 font-semibold">
                        {asset.mediaType
                          .replace("video/", "")
                          .replace("audio/", "")
                          .replace("image/", "")
                          .toUpperCase()}
                      </p>
                    )}

                    {asset.ownerAddress && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOwnerClick?.(
                              asset.ownerAddress,
                              displayDomain || null,
                            );
                          }}
                          className="font-mono text-[0.7rem] px-2 py-1 rounded w-full border transition-all duration-200 bg-gradient-to-r from-[#FF4DA6]/20 to-[#FF4DA6]/10 text-[#FF4DA6] border-[#FF4DA6]/30 hover:from-[#FF4DA6]/30 hover:to-[#FF4DA6]/20 hover:border-[#FF4DA6]/50 cursor-pointer hover:bg-[#FF4DA6]/25 active:scale-95 text-center truncate"
                          title={`View all assets by ${displayText}`}
                        >
                          {displayText}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
