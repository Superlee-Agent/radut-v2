import { RequestHandler, Request, Response } from "express";

interface GetAssetByIdRequestBody {
  ipId: string;
}

interface ImageMetadata {
  pngUrl?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
}

interface NFTMetadata {
  image?: ImageMetadata;
  raw?: {
    image?: string;
  };
}

interface StoryApiAsset {
  ipId: string;
  title?: string;
  name?: string;
  mediaType?: string;
  mediaUrl?: string;
  image?: ImageMetadata;
  nftMetadata?: NFTMetadata;
  ownerAddress: string;
  creator?: string;
  registrationDate?: string;
  parentsCount?: number;
}

interface GetAssetByIdResponseBody {
  ok: boolean;
  ipId?: string;
  title?: string;
  mediaUrl?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  ownerAddress?: string;
  error?: string;
  message?: string;
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

export const handleGetAssetById: RequestHandler<
  object,
  GetAssetByIdResponseBody,
  GetAssetByIdRequestBody
> = async (req, res): Promise<void> => {
  try {
    const { ipId } = req.body;

    if (!ipId || typeof ipId !== "string") {
      return res.status(400).json({
        ok: false,
        error: "ipId_required",
        message: "IP ID is required",
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("https://api.storyapis.com/api/v4/assets", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeLicenses: true,
          moderated: false,
          where: {
            ipIds: [ipId],
          },
          pagination: {
            limit: 1,
            offset: 0,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Story API Error: ${response.status} - ${errorText}`, {
          ipId,
        });

        return res.status(response.status).json({
          ok: false,
          error: "story_api_error",
          message: errorText,
        });
      }

      const data = await response.json();
      const assets: StoryApiAsset[] = Array.isArray(data)
        ? data
        : data?.data || [];

      if (!assets || assets.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "asset_not_found",
          message: `Asset with IP ID ${ipId} not found`,
        });
      }

      const asset = assets[0];

      // Extract media URL
      let mediaUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (asset?.image?.pngUrl) {
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

      // Get thumbnail
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

      res.json({
        ok: true,
        ipId: asset.ipId,
        title: asset.title || asset.name || "Untitled Asset",
        mediaUrl: mediaUrl || "",
        mediaType: asset.mediaType || "image",
        thumbnailUrl: thumbnailUrl || "",
        ownerAddress: asset.ownerAddress,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        console.error("Request timeout fetching asset details", { ipId });
        return res.status(504).json({
          ok: false,
          error: "timeout",
          message: "Request timeout while fetching asset details",
        });
      }

      console.error("Fetch request failed", {
        ipId,
        error: fetchError?.message,
      });
      return res.status(500).json({
        ok: false,
        error: "network_error",
        message: fetchError?.message || "Unable to fetch asset details",
      });
    }
  } catch (error: any) {
    console.error("Get Asset By ID Error:", error);
    res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error",
      message: "An unexpected error occurred",
    });
  }
};
