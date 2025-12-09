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
  } = context;

  // Get primary wallet address
  const primaryWalletAddress =
    context.creations[0]?.registeredByWallet ||
    (wallets && wallets.length > 0
      ? wallets.find((w) => w.address)?.address
      : user?.wallet?.address) ||
    null;

  const generate = async (mode: ToggleMode, options: GenerationOptions) => {
    const demoModeParam = false; // Wallet-only mode always uses real API
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
        if (options.remixType === "paid") {
          const result = await openaiService.editImageWithWatermark(
            options.prompt,
            options.image,
            demoModeParam,
          );
          generatedUrl = result.url;
          originalUrl = result.originalUrl;
        } else {
          generatedUrl = await openaiService.editImage(
            options.prompt,
            options.image,
            demoModeParam,
          );
          originalUrl = generatedUrl;
        }
      } else {
        if (remixType === "paid") {
          // For paid remix (both demo and production), use server-side watermark endpoint
          console.log("🎨 Generating image with server-side watermark");
          const result = await openaiService.generateImageFromTextWithWatermark(
            options.prompt,
            demoModeParam,
          );
          generatedUrl = result.url;
          originalUrl = result.originalUrl;
        } else {
          // Standard generation without watermark
          generatedUrl = await openaiService.generateImageFromText(
            options.prompt,
            demoModeParam,
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

      if (shouldUpload && isSupabaseConfigured()) {
        try {
          setLoadingMessage("Uploading to storage...");

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

          const blob = dataURLtoBlob(generatedUrl);

          // Upload to wallet bucket
          let uploadedUrl: string | null = null;
          uploadedUrl = await uploadWalletImageToSupabase({
            file: blob,
            creationId,
            walletAddress: primaryWalletAddress,
          });

          if (uploadedUrl) {
            finalUrl = uploadedUrl;
            console.log("Image uploaded to Supabase:", uploadedUrl);
          } else {
            console.warn("Failed to upload to Supabase, using local URL");
          }
        } catch (uploadError) {
          console.warn("Error uploading to Supabase:", uploadError);
          // Continue with local URL if upload fails
        }
      }

      setResultUrl(finalUrl);

      // For paid remix, track both watermarked and clean URLs
      let cleanUrlToStore: string | undefined;
      let watermarkedUrlToStore: string | undefined;

      if (remixType === "paid") {
        watermarkedUrlToStore = finalUrl;
        cleanUrlToStore = originalUrl;
      }

      // Add creation with wallet address
      addCreation(
        finalUrl,
        type,
        options.prompt,
        primaryWalletAddress || "",
        remixType,
        options.parentAsset,
        originalUrl,
        cleanUrlToStore,
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
