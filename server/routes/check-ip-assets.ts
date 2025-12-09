// server/routes/check-ip-assets.ts

import { RequestHandler } from "express";

interface CheckIpAssetsRequestBody {
  address?: string;
  network?: "testnet" | "mainnet";
}

function convertIpfsUriToHttp(uri: string): string {
  if (!uri) return uri;

  const PUBLIC_GATEWAY = "dweb.link";

  if (uri.startsWith("ipfs://")) {
    const cid = uri.replace("ipfs://", "");
    return `https://${PUBLIC_GATEWAY}/ipfs/${cid}`;
  }

  if (uri.includes("ipfs.io/ipfs/")) {
    const cid = uri.split("/ipfs/")[1];
    return `https://${PUBLIC_GATEWAY}/ipfs/${cid}`;
  }

  if (uri.includes("mypinata.cloud")) {
    return uri;
  }

  if (uri.includes("/ipfs/") && !uri.includes(PUBLIC_GATEWAY)) {
    const cid = uri.split("/ipfs/")[1];
    return `https://${PUBLIC_GATEWAY}/ipfs/${cid}`;
  }

  return uri;
}

const IDP_CHECK = new Map<string, { status: number; body: any; ts: number }>();

// Menggunakan tipe any untuk req dan res agar kompiler tidak gagal
export const handleCheckIpAssets: RequestHandler = async (
  req: any, // Kunci perbaikan: Menggunakan any
  res: any, // Kunci perbaikan: Menggunakan any
) => {
  try {
    // Properti 'get' sekarang akan dikenali oleh kompiler TS karena tipe argumen adalah 'any'
    const idempotencyKey = (req.get("Idempotency-Key") ||
      req.get("Idempotency-Key")) as string | undefined;

    if (idempotencyKey && IDP_CHECK.has(idempotencyKey)) {
      const cached = IDP_CHECK.get(idempotencyKey)!;
      if (Date.now() - cached.ts < 60_000) {
        // Properti 'status' dan 'json' dikenali
        res.status(cached.status).json({ ok: true, ...cached.body });
        return;
      } else {
        IDP_CHECK.delete(idempotencyKey);
      }
    }

    // Properti 'body' sekarang dikenali
    const requestBody = req.body as CheckIpAssetsRequestBody; // Tetap lakukan casting untuk type safety di dalam fungsi
    const { address, network = "testnet" } = requestBody;

    if (!address || typeof address !== "string") {
      return res.status(400).json({
        ok: false,
        error: "address_required",
        message: "Address is required",
      });
    }

    const trimmedAddress = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_address",
        message: "Invalid Ethereum address format",
      });
    }

    const apiKey = process.env.STORY_API_KEY;
    if (!apiKey) {
      console.error("STORY_API_KEY environment variable not configured");
      return res.status(500).json({
        ok: false,
        error: "server_config_missing",
        message: "Server configuration error: STORY_API_KEY not set",
      });
    }

    let allAssets: any[] = [];
    let offset = 0;
    let hasMore = true;
    const limit = 100;
    const maxIterations = 10;
    let iterations = 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      while (hasMore && iterations < maxIterations) {
        iterations += 1;

        try {
          const response = await fetch(
            "https://api.storyapis.com/api/v4/assets",
            {
              method: "POST",
              headers: {
                "X-Api-Key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                includeLicenses: true,
                moderated: false,
                orderBy: "blockNumber",
                orderDirection: "desc",
                where: {
                  ownerAddress: trimmedAddress,
                },
                pagination: {
                  limit,
                  offset,
                },
              }),
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Story API Error: ${response.status} - ${errorText}`,
              {
                address: trimmedAddress,
                offset,
                iteration: iterations,
              },
            );

            let errorDetail = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorDetail = errorJson.message || errorJson.error || errorText;
            } catch {
              // Keep the raw text if not JSON
            }

            clearTimeout(timeoutId);
            return res.status(response.status).json({
              ok: false,
              error: `story_api_error`,
              details: errorDetail,
              status: response.status,
            });
          }

          const data = await response.json();

          if (!data) {
            console.error("Empty response from Story API", {
              address: trimmedAddress,
              offset,
              iteration: iterations,
            });
            break;
          }

          const assets = Array.isArray(data) ? data : data?.data || [];

          if (!Array.isArray(assets)) {
            console.warn("Unexpected response format from Story API", {
              address: trimmedAddress,
              offset,
              iteration: iterations,
              dataKeys: Object.keys(data || {}),
              dataType: typeof data,
            });
            break;
          }

          const validAssets = assets.filter((asset: any) => {
            if (!asset || typeof asset !== "object") {
              console.warn("Invalid asset object", { asset });
              return false;
            }
            return true;
          });

          allAssets = allAssets.concat(validAssets);

          const pagination = data?.pagination;
          hasMore = pagination?.hasMore === true && validAssets.length > 0;
          offset += limit;

          if (
            pagination?.hasMore === false ||
            !pagination ||
            validAssets.length === 0
          ) {
            hasMore = false;
          }
        } catch (fetchError: any) {
          if (fetchError.name === "AbortError") {
            console.error("Request timeout while fetching IP assets", {
              address: trimmedAddress,
              offset,
              iteration: iterations,
            });
            clearTimeout(timeoutId);
            return res.status(504).json({
              ok: false,
              error: "timeout",
              details:
                "The Story API is responding slowly. Please try again in a moment.",
            });
          }

          console.error("Fetch request failed for Story API", {
            address: trimmedAddress,
            offset,
            iteration: iterations,
            error: fetchError?.message,
            errorType: fetchError?.name,
          });
          clearTimeout(timeoutId);
          return res.status(500).json({
            ok: false,
            error: "network_error",
            details: fetchError?.message || "Unable to connect to Story API",
          });
        }
      }

      clearTimeout(timeoutId);

      if (iterations >= maxIterations) {
        console.warn("Max iterations reached when fetching IP assets", {
          address: trimmedAddress,
          assetsCollected: allAssets.length,
        });
      }

      const originalCount = allAssets.filter((asset: any) => {
        const parentsCount = asset?.parentsCount || 0;
        return parentsCount === 0;
      }).length;

      const remixCount = allAssets.filter((asset: any) => {
        const parentsCount = asset?.parentsCount || 0;
        return parentsCount > 0;
      }).length;

      const totalCount = allAssets.length;

      // Fetch full asset details to get proper image metadata
      let enrichedAssets = allAssets;
      try {
        const ipIds = allAssets
          .slice(0, 100)
          .map((a: any) => a.ipId)
          .filter(Boolean);

        if (ipIds.length > 0) {
          console.log(
            "[Check IP Assets] Fetching full metadata for",
            ipIds.length,
            "assets",
          );

          const enrichmentResponse = await fetch(
            "https://api.storyapis.com/api/v4/assets",
            {
              method: "POST",
              headers: {
                "X-Api-Key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                includeLicenses: true,
                moderated: false,
                where: {
                  ipIds,
                },
                pagination: {
                  limit: 100,
                  offset: 0,
                },
              }),
              signal: controller.signal,
            },
          );

          if (enrichmentResponse.ok) {
            const enrichmentData = await enrichmentResponse.json();
            const metadataMap = new Map();

            const enrichedData = Array.isArray(enrichmentData.data)
              ? enrichmentData.data
              : enrichmentData;

            if (Array.isArray(enrichedData)) {
              enrichedData.forEach((asset: any) => {
                if (asset.ipId) {
                  metadataMap.set(asset.ipId, asset);
                }
              });
            }

            // Merge enriched data with initial results
            enrichedAssets = allAssets.map((asset: any) => {
              const enriched = metadataMap.get(asset.ipId);
              return enriched || asset;
            });

            console.log("[Check IP Assets] Enrichment complete");
          }
        }
      } catch (enrichmentErr) {
        console.warn(
          "Error enriching assets with full metadata:",
          enrichmentErr,
        );
      }

      // Transform assets to extract media URLs - IPFS only
      const assets = enrichedAssets.map((asset: any) => {
        let mediaUrl = null;
        let thumbnailUrl = null;

        // Only use IPFS-based image URLs, not cached/CDN URLs
        if (asset?.image?.pngUrl) {
          // pngUrl is usually IPFS or direct file URL
          mediaUrl = asset.image.pngUrl;
        } else if (asset?.image?.originalUrl) {
          mediaUrl = asset.image.originalUrl;
        } else if (asset?.image?.thumbnailUrl) {
          mediaUrl = asset.image.thumbnailUrl;
        } else if (asset?.nftMetadata?.image?.pngUrl) {
          mediaUrl = asset.nftMetadata.image.pngUrl;
        } else if (asset?.nftMetadata?.raw?.image) {
          mediaUrl = asset.nftMetadata.raw.image;
        }

        // Get thumbnail - prefer IPFS sources
        if (asset?.image?.thumbnailUrl) {
          thumbnailUrl = asset.image.thumbnailUrl;
        } else if (asset?.image?.originalUrl) {
          thumbnailUrl = asset.image.originalUrl;
        } else if (asset?.nftMetadata?.image?.pngUrl) {
          thumbnailUrl = asset.nftMetadata.image.pngUrl;
        }

        // Convert IPFS URIs to HTTP gateway URLs if needed
        if (mediaUrl) {
          mediaUrl = convertIpfsUriToHttp(mediaUrl);
        }
        if (thumbnailUrl) {
          thumbnailUrl = convertIpfsUriToHttp(thumbnailUrl);
        }

        return {
          ipId: asset.ipId,
          title: asset.title || asset.name || "Untitled Asset",
          mediaUrl: mediaUrl || "",
          mediaType: asset.mediaType || "image",
          thumbnailUrl: thumbnailUrl || "",
          ownerAddress: asset.ownerAddress,
          creator: asset.creator,
          registrationDate: asset.registrationDate,
          parentsCount: asset.parentsCount,
          ...asset,
        };
      });

      const body = {
        address: trimmedAddress,
        network,
        totalCount,
        originalCount,
        remixCount,
        assets,
      };
      if (idempotencyKey)
        IDP_CHECK.set(idempotencyKey, { status: 200, body, ts: Date.now() });
      res.json({ ok: true, ...body });
    } catch (innerError: any) {
      clearTimeout(timeoutId);
      throw innerError;
    }
  } catch (error: any) {
    console.error("Check IP Assets Error:", error);
    res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error",
      details:
        process.env.NODE_ENV !== "production"
          ? error?.stack
          : "An unexpected error occurred",
    });
  }
};
