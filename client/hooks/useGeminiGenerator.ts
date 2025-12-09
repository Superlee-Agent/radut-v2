import { useContext } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { CreationContext } from "@/context/CreationContext";
import * as openaiService from "@/services/openaiService";
import { GenerationOptions, ToggleMode } from "@/types/generation";
import {
  uploadWalletImageToSupabase,
  isSupabaseConfigured,
} from "@/lib/utils/supabase";

const useGeminiGenerator = () => {
  const context = useContext(CreationContext);
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  if (!context) {
    throw new Error(
      "useGeminiGenerator must be used within a CreationProvider",
    );
  }

  const {
    setIsLoading,
    setLoadingMessage,
    setError,
    setResultUrl,
    setResultType,
    resultUrl,
    addCreation,
    setOriginalPrompt,
    updateCreationUploadStatus,
  } = context;

  // Get primary wallet address
  const primaryWalletAddress =
    context.creations[0]?.registeredByWallet ||
    (wallets && wallets.length > 0
      ? wallets.find((w) => w.address)?.address
      : user?.wallet?.address) ||
    null;

  const generate = async (mode: ToggleMode, options: GenerationOptions) => {
    if (mode === "video") {
      setError("Video generation is coming soon!");
      return;
    }

    setIsLoading(true);
    setError(null);
    // Keep the previous image visible while loading (both demo and real)
    // This creates a stacking carousel effect where users see all generations
    setOriginalPrompt(options.prompt);

    try {
      let generatedUrl: string;
      let originalUrl: string = "";
      let type: "image" | "video";

      setLoadingMessage("Crafting your image...");
      const { remixType } = options;

      if (options.image) {
        // Apply watermark to both paid and free remix (per user requirement)
        if (options.remixType === "paid" || options.remixType === "free") {
          const result = await openaiService.editImageWithWatermark(
            options.prompt,
            options.image,
          );
          generatedUrl = result.url;
          originalUrl = result.originalUrl;
        } else {
          generatedUrl = await openaiService.editImage(
            options.prompt,
            options.image,
          );
          originalUrl = generatedUrl;
        }
      } else {
        // Apply watermark to both paid and free remix (per user requirement)
        if (remixType === "paid" || remixType === "free") {
          console.log("🎨 Generating image with watermark for remix");
          const result = await openaiService.generateImageFromTextWithWatermark(
            options.prompt,
          );
          generatedUrl = result.url;
          originalUrl = result.originalUrl;
        } else {
          // Standard generation without watermark
          generatedUrl = await openaiService.generateImageFromText(
            options.prompt,
          );
          originalUrl = generatedUrl;
        }
      }

      type = "image";
      setResultType("image");

      // Upload to Supabase (wallet mode only)
      let finalUrl = generatedUrl;
      const creationId = `creation_${Date.now()}`;

      const shouldUpload = authenticated && primaryWalletAddress;

      // For paid remix, upload both original and watermarked to Supabase
      let uploadedWatermarkedUrl: string | null = null;
      let uploadedOriginalUrl: string | null = null;

      // First, add creation with uploading status
      // Then update status after upload completes
      addCreation(
        finalUrl,
        type,
        options.prompt,
        primaryWalletAddress || "",
        remixType,
        options.parentAsset,
        undefined, // originalUrl will be set after upload
        undefined, // watermarkedUrl will be set after upload
      );

      if (shouldUpload && isSupabaseConfigured()) {
        try {
          setLoadingMessage("Uploading to storage...");
          // Mark as uploading so card shows loading state
          updateCreationUploadStatus(creationId, true);

          // Convert data URL directly to Blob (faster than fetch)
          const dataURLtoBlob = (dataURL: string): Blob => {
            const arr = dataURL.split(",");
            const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
            const bstr = atob(arr[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            return new Blob([u8arr], { type: mime });
          };

          // Upload watermarked version
          const watermarkedBlob = dataURLtoBlob(generatedUrl);
          uploadedWatermarkedUrl = await uploadWalletImageToSupabase({
            file: watermarkedBlob,
            creationId,
            walletAddress: primaryWalletAddress,
          });

          if (uploadedWatermarkedUrl) {
            // Use permanent storage URL for main display
            finalUrl = uploadedWatermarkedUrl;
            console.log(
              "✅ Watermarked image uploaded to Supabase:",
              uploadedWatermarkedUrl,
            );
          } else {
            console.error("❌ Failed to upload watermarked image to Supabase", {
              authenticated,
              hasWallet: !!primaryWalletAddress,
              supabaseConfigured: isSupabaseConfigured(),
              reason:
                "Check Supabase credentials, bucket permissions, and RLS policies",
            });
            // Keep blob URL for now for display, but mark as temporary
            // finalUrl stays as generatedUrl (blob)
          }

          // For both paid and free remix, also upload original version
          if (remixType === "paid" || remixType === "free") {
            const originalBlob = dataURLtoBlob(originalUrl);
            uploadedOriginalUrl = await uploadWalletImageToSupabase({
              file: originalBlob,
              creationId: `${creationId}_original`,
              walletAddress: primaryWalletAddress,
            });

            if (uploadedOriginalUrl) {
              console.log(
                "Original image uploaded to Supabase:",
                uploadedOriginalUrl,
              );
            }
          }
        } catch (uploadError) {
          console.warn("Error uploading to Supabase:", uploadError);
          // Continue with data URLs if upload fails
        }
      }

      setResultUrl(finalUrl);

      // For both paid and free remix, store watermarked URL (display before registration)
      let watermarkedUrlToStore: string | undefined;

      if (remixType === "paid" || remixType === "free") {
        // Priority 1: Use uploaded Supabase URL (if upload successful)
        if (uploadedWatermarkedUrl) {
          watermarkedUrlToStore = uploadedWatermarkedUrl;
          console.log(
            "✅ Watermarked URL stored (Supabase):",
            watermarkedUrlToStore,
          );
        }
        // Priority 2: Use data URL directly (works in demo mode & persistent)
        // Data URLs (data:image/...) are permanent and work across sessions
        else if (generatedUrl && generatedUrl.startsWith("data:")) {
          watermarkedUrlToStore = generatedUrl;
          console.log(
            "✅ Watermarked URL stored (data URL):",
            watermarkedUrlToStore.substring(0, 50) + "...",
          );
        }
      }

      // Add creation with wallet address
      addCreation(
        finalUrl,
        type,
        options.prompt,
        primaryWalletAddress || "",
        remixType,
        options.parentAsset,
        uploadedOriginalUrl || originalUrl,
        watermarkedUrlToStore,
      );
    } catch (e: any) {
      console.error(e);
      let errorMessage =
        e.message || "An unknown error occurred during generation.";
      if (
        e.message &&
        (e.message.includes("API key not valid") ||
          e.message.includes("404") ||
          e.message.includes("PERMISSION_DENIED"))
      ) {
        errorMessage =
          "Your API key is invalid or project billing is not enabled. Please check your key and try again.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const upscale = async () => {
    if (!resultUrl || !resultUrl.startsWith("data:image")) {
      setError("Upscaling is only available for a generated image.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setLoadingMessage("Upscaling image...");
      const [header, base64Data] = resultUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";

      const upscaledUrl = await openaiService.upscaleImage({
        imageBytes: base64Data,
        mimeType,
      });
      setResultUrl(upscaledUrl);
      setResultType("image");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unknown error occurred during upscaling.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return { generate, upscale, ...context };
};

export default useGeminiGenerator;
