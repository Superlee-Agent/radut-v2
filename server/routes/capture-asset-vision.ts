import type { RequestHandler } from "express";
import crypto from "crypto";

export const handleCaptureAssetVision: RequestHandler = async (req, res) => {
  try {
    const {
      mediaUrl,
      ipId,
      title,
      mediaType,
      ownerAddress,
      description,
      parentIpIds,
      licenseTermsIds,
      licenseTemplates,
      parentIpDetails,
      maxMintingFee,
      maxRts,
      maxRevenueShare,
      licenseVisibility,
      licenses,
      isDerivative,
      parentsCount,
    } = req.body;

    if (!mediaUrl || !ipId) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields (mediaUrl, ipId)",
      });
    }

    // Verify asset is accessible
    let imageBuffer: Buffer | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const imgResponse = await fetch(mediaUrl, {
          signal: controller.signal,
        });

        if (imgResponse.ok) {
          imageBuffer = await imgResponse
            .arrayBuffer()
            .then((ab) => Buffer.from(ab));
        } else {
          console.warn(`Asset image not accessible: ${mediaUrl}`);
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      console.warn(`Failed to fetch asset image: ${mediaUrl}`, err);
    }

    // Return success for asset capture (whitelist functionality removed)
    res.json({
      ok: true,
      captured: true,
      ipId,
      title: title || "Captured Asset",
    });
  } catch (error) {
    console.error("Asset capture error:", error);
    // Even on error, return success for fire-and-forget
    res.json({
      ok: true,
      captured: true,
    });
  }
};
