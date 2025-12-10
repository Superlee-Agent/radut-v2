import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader } from "lucide-react";
import type { SearchResult } from "./types";

interface AssetLifecycleInfographicProps {
  asset: SearchResult;
  isOpen: boolean;
  onClose: () => void;
}

interface AssetNode {
  ipId: string;
  title?: string;
  mediaUrl?: string;
  type: "parent" | "current" | "child";
}

export const AssetLifecycleInfographic = ({
  asset,
  isOpen,
  onClose,
}: AssetLifecycleInfographicProps) => {
  const [assetGraph, setAssetGraph] = useState<{
    parents: AssetNode[];
    current: AssetNode;
    children: AssetNode[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch asset details by IP ID
  const fetchAssetDetails = async (ipId: string): Promise<AssetNode | null> => {
    try {
      const response = await fetch("/api/get-asset-by-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipId }),
      });

      if (!response.ok) {
        console.warn(`Failed to fetch details for ${ipId}`);
        return null;
      }

      const data = await response.json();
      return {
        ipId,
        title: data.title || data.name || "Asset",
        mediaUrl: data.mediaUrl || data.media_url,
        type: "parent",
      };
    } catch (error) {
      console.error(`Error fetching asset details for ${ipId}:`, error);
      return null;
    }
  };

  // Extract parent and child information
  useEffect(() => {
    if (!isOpen || !asset.ipId) return;

    const buildGraph = async () => {
      setLoading(true);

      try {
        const parents: AssetNode[] = [];
        const children: AssetNode[] = [];

        // Fetch parent asset details
        if (
          asset.parentIpDetails?.parentIpIds &&
          Array.isArray(asset.parentIpDetails.parentIpIds)
        ) {
          const parentPromises = asset.parentIpDetails.parentIpIds.map(
            (parentId: string) => fetchAssetDetails(parentId),
          );
          const parentResults = await Promise.all(parentPromises);

          parentResults.forEach((parent) => {
            if (parent) {
              parent.type = "parent";
              parents.push(parent);
            } else {
              // Fallback if API fails
              parents.push({
                ipId: asset.parentIpDetails.parentIpIds[parents.length],
                title: `Parent ${parents.length + 1}`,
                mediaUrl: undefined,
                type: "parent",
              });
            }
          });
        }

        // Fetch child asset details
        if (asset.childIpIds && Array.isArray(asset.childIpIds)) {
          const childPromises = asset.childIpIds.map((childId: string) =>
            fetchAssetDetails(childId),
          );
          const childResults = await Promise.all(childPromises);

          childResults.forEach((child, index) => {
            if (child) {
              child.type = "child";
              children.push(child);
            } else {
              // Fallback if API fails
              children.push({
                ipId: asset.childIpIds[index],
                title: `Child ${index + 1}`,
                mediaUrl: undefined,
                type: "child",
              });
            }
          });
        }

        const current: AssetNode = {
          ipId: asset.ipId,
          title: asset.title || asset.name || "Asset",
          mediaUrl: asset.mediaUrl,
          type: "current",
        };

        setAssetGraph({
          parents,
          current,
          children,
        });
      } catch (error) {
        console.error("Error building asset graph:", error);
      } finally {
        setLoading(false);
      }
    };

    buildGraph();
  }, [isOpen, asset]);

  if (!isOpen || !assetGraph) return null;

  const { parents, current, children } = assetGraph;
  const hasParents = parents.length > 0;
  const hasChildren = children.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-slate-950/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800/50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/30 px-6 py-4 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                Asset Lifecycle
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-[#FF4DA6]/20 hover:text-[#FF4DA6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4DA6]/30"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-[#FF4DA6] animate-spin" />
                    <p className="text-slate-300">Loading lifecycle data...</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-12">
                  {/* Parents Section */}
                  {hasParents && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="w-full"
                    >
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 text-center">
                        Parent Asset{parents.length > 1 ? "s" : ""}
                      </h3>
                      <div className="flex flex-wrap justify-center gap-6">
                        {parents.map((parent, idx) => (
                          <motion.div
                            key={`parent-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + idx * 0.1 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-500/50 bg-slate-800">
                              {parent.mediaUrl ? (
                                <img
                                  src={parent.mediaUrl}
                                  alt={parent.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-slate-900/50">
                                  <span className="text-xs text-slate-400">
                                    {parent.title}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-slate-300 font-semibold line-clamp-2">
                                {parent.title}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {parent.ipId.substring(0, 8)}...
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Arrow down from parents */}
                      <div className="flex justify-center mt-8 mb-2">
                        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent" />
                      </div>
                    </motion.div>
                  )}

                  {/* Current Asset (Center) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-3 border-[#FF4DA6] bg-slate-800 shadow-lg shadow-[#FF4DA6]/20">
                      {current.mediaUrl ? (
                        <img
                          src={current.mediaUrl}
                          alt={current.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF4DA6]/20 to-slate-900/50">
                          <span className="text-xs text-slate-400 text-center px-4">
                            {current.title}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg text-slate-100 font-bold line-clamp-2">
                        {current.title}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {current.ipId.substring(0, 8)}...
                      </p>
                      <div className="mt-2 px-3 py-1 rounded-full bg-[#FF4DA6]/20 border border-[#FF4DA6]/50 text-xs text-[#FF4DA6] font-semibold">
                        Current Asset
                      </div>
                    </div>
                  </motion.div>

                  {/* Children Section */}
                  {hasChildren && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="w-full"
                    >
                      {/* Arrow down to children */}
                      <div className="flex justify-center mb-8 mt-2">
                        <div className="w-1 h-8 bg-gradient-to-b from-transparent to-emerald-500" />
                      </div>

                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 text-center">
                        Derivative{children.length > 1 ? "s" : ""} (Child Asset
                        {children.length > 1 ? "s" : ""})
                      </h3>
                      <div className="flex flex-wrap justify-center gap-6">
                        {children.map((child, idx) => (
                          <motion.div
                            key={`child-${idx}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-emerald-500/50 bg-slate-800">
                              {child.mediaUrl ? (
                                <img
                                  src={child.mediaUrl}
                                  alt={child.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-slate-900/50">
                                  <span className="text-xs text-slate-400">
                                    {child.title}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-slate-300 font-semibold line-clamp-2">
                                {child.title}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {child.ipId.substring(0, 8)}...
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Empty State */}
                  {!hasParents && !hasChildren && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center gap-4 py-12"
                    >
                      <div className="text-lg text-slate-300 text-center">
                        <p className="font-semibold">Original Asset</p>
                        <p className="text-sm text-slate-400 mt-2">
                          This asset has no parents or derivatives yet.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Info */}
            {assetGraph && (
              <div className="border-t border-slate-800/30 bg-slate-950/95 backdrop-blur-xl px-6 py-4 flex-shrink-0">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Parents
                    </p>
                    <p className="text-lg font-bold text-slate-100 mt-1">
                      {parents.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Current
                    </p>
                    <p className="text-lg font-bold text-[#FF4DA6] mt-1">1</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">
                      Derivatives
                    </p>
                    <p className="text-lg font-bold text-slate-100 mt-1">
                      {children.length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
