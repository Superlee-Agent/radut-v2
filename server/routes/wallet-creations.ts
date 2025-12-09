import { RequestHandler } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface WalletCreation {
  id: string;
  walletAddress: string;
  wallet_address?: string;
  url: string;
  type?: "image" | "video" | null;
  timestamp?: number;
  prompt?: string;
  remix_type?: "paid" | "free" | null;
  remixType?: "paid" | "free" | null;
  parent_asset?: any;
  parentAsset?: any;
  original_url?: string;
  originalUrl?: string;
  clean_url?: string;
  cleanUrl?: string;
  watermarked_url?: string;
  watermarkedUrl?: string;
  registered_by_wallet?: string;
  registeredByWallet?: string;
  registered_ip_id?: string;
  registeredIpId?: string;
}

const getSupabaseClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars",
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

const toDbRow = (creation: WalletCreation) => ({
  id: creation.id,
  wallet_address: (
    creation.walletAddress ||
    creation.wallet_address ||
    ""
  ).toLowerCase(),
  url: creation.url,
  type: creation.type || "image",
  timestamp: creation.timestamp || Date.now(),
  prompt: creation.prompt || "",
  remix_type: creation.remixType || creation.remix_type || null,
  parent_asset: creation.parentAsset || creation.parent_asset || null,
  original_url: creation.originalUrl || creation.original_url || null,
  clean_url: creation.cleanUrl || creation.clean_url || null,
  watermarked_url: creation.watermarkedUrl || creation.watermarked_url || null,
  registered_by_wallet:
    creation.registeredByWallet || creation.registered_by_wallet || null,
  registered_ip_id:
    creation.registeredIpId || creation.registered_ip_id || null,
});

export const handleGetWalletCreations: RequestHandler = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { requesting_wallet } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        ok: false,
        error: "Missing required parameter: walletAddress",
      });
    }

    // Validate that the requesting wallet matches the target wallet (privacy protection)
    if (requesting_wallet) {
      const requestingWalletStr = requesting_wallet.toString().toLowerCase();
      const targetWalletStr = walletAddress.toLowerCase();

      if (requestingWalletStr !== targetWalletStr) {
        console.warn(
          `[SECURITY] Unauthorized access attempt: requesting_wallet=${requestingWalletStr} != target=${targetWalletStr}`,
        );
        // Return 403 Forbidden and empty creations array for security
        return res.status(403).json({
          ok: false,
          error: "Unauthorized: wallet address mismatch",
          creations: [],
        });
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase not configured",
      });
    }

    const { data: creations, error } = await supabase
      .from("wallet_creations")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching wallet creations:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to fetch wallet creations",
      });
    }

    const transformedCreations = (creations || []).map((creation: any) => ({
      id: creation.id,
      walletAddress: creation.wallet_address,
      url: creation.url,
      type: creation.type,
      timestamp: creation.timestamp,
      prompt: creation.prompt,
      remixType: creation.remix_type,
      parentAsset: creation.parent_asset,
      originalUrl: creation.original_url,
      cleanUrl: creation.clean_url,
      watermarkedUrl: creation.watermarked_url,
      registeredByWallet: creation.registered_by_wallet,
      registeredIpId: creation.registered_ip_id,
    }));

    return res.json({ ok: true, creations: transformedCreations });
  } catch (err: any) {
    console.error("Error fetching wallet creations:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to fetch wallet creations",
    });
  }
};

export const handleAddWalletCreation: RequestHandler = async (req, res) => {
  try {
    const creation: WalletCreation = req.body;
    const { requesting_wallet } = req.query;

    if (!creation?.id || !creation?.url || !creation?.walletAddress) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: id, url, walletAddress",
      });
    }

    // Validate that the requesting wallet matches the wallet in the payload
    if (
      requesting_wallet &&
      requesting_wallet.toString().toLowerCase() !==
        creation.walletAddress.toLowerCase()
    ) {
      console.warn(
        `[SECURITY] Unauthorized creation attempt: requesting_wallet=${requesting_wallet} != walletAddress=${creation.walletAddress}`,
      );
      return res.status(403).json({
        ok: false,
        error: "Unauthorized: wallet address mismatch",
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase not configured",
      });
    }

    const dbData = toDbRow(creation);

    const { error: upsertError } = await supabase
      .from("wallet_creations")
      .upsert(dbData, { onConflict: "id" });

    if (upsertError) {
      console.error("Error saving wallet creation:", upsertError);
      return res.status(500).json({
        ok: false,
        error: upsertError.message || "Failed to save wallet creation",
      });
    }

    // If URL is a data URL, upload to Supabase Storage and update DB with public URL
    if (typeof creation.url === "string" && creation.url.startsWith("data:")) {
      try {
        const [, base64Data] = creation.url.split(",");
        const header = creation.url.split(",")[0] || "";
        const mimeMatch = header.match(/data:(.*?);/);
        const mimeType = mimeMatch?.[1] || "image/png";
        const extension = mimeType.split("/")[1] || "png";

        const buffer = Buffer.from(base64Data, "base64");

        const timestamp = Date.now();
        const walletPath = creation.walletAddress.toLowerCase();
        const filePath = `${walletPath}/${creation.id}/${timestamp}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("wallet_creations")
          .upload(filePath, buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: mimeType,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("wallet_creations")
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
              .from("wallet_creations")
              .update({ url: publicUrl })
              .eq("id", creation.id);

            if (updateError) {
              console.warn(
                "Uploaded to storage but failed to update DB url:",
                updateError,
              );
            } else {
              creation.url = publicUrl;
            }
          }
        } else {
          console.warn(
            "Failed to upload image to Supabase storage:",
            uploadError,
          );
        }
      } catch (uploadErr) {
        console.warn("Error uploading image to Supabase storage:", uploadErr);
      }
    }

    return res.json({
      ok: true,
      message: "Wallet creation saved successfully",
      creation,
    });
  } catch (err: any) {
    console.error("Failed to save wallet creation:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to save wallet creation",
    });
  }
};

export const handleDeleteWalletCreation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { requesting_wallet } = req.query;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Missing required parameter: id",
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase not configured",
      });
    }

    // Fetch the creation to verify ownership before deleting
    const { data: creation, error: fetchError } = await supabase
      .from("wallet_creations")
      .select("wallet_address")
      .eq("id", id)
      .single();

    if (fetchError || !creation) {
      console.warn(`Creation with id ${id} not found`);
      return res.status(404).json({
        ok: false,
        error: "Creation not found",
      });
    }

    // Validate that the requesting wallet matches the creation owner
    if (
      requesting_wallet &&
      requesting_wallet.toString().toLowerCase() !==
        creation.wallet_address?.toLowerCase()
    ) {
      console.warn(
        `[SECURITY] Unauthorized deletion attempt: requesting_wallet=${requesting_wallet} != creation.wallet_address=${creation.wallet_address}`,
      );
      return res.status(403).json({
        ok: false,
        error: "Unauthorized: wallet address mismatch",
      });
    }

    const { error } = await supabase
      .from("wallet_creations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting wallet creation:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Failed to delete wallet creation",
      });
    }

    return res.json({
      ok: true,
      message: "Wallet creation deleted successfully",
    });
  } catch (err: any) {
    console.error("Failed to delete wallet creation:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to delete wallet creation",
    });
  }
};

export const handleUpdateWalletCreation: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { requesting_wallet } = req.query;
    const creation: WalletCreation = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Missing required parameter: id",
      });
    }

    // Validate that the requesting wallet matches the wallet in the payload
    if (
      requesting_wallet &&
      creation?.walletAddress &&
      requesting_wallet.toString().toLowerCase() !==
        creation.walletAddress.toLowerCase()
    ) {
      console.warn(
        `[SECURITY] Unauthorized update attempt: requesting_wallet=${requesting_wallet} != walletAddress=${creation.walletAddress}`,
      );
      return res.status(403).json({
        ok: false,
        error: "Unauthorized: wallet address mismatch",
      });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase not configured",
      });
    }

    const dbData = toDbRow(creation);

    const { error: updateError } = await supabase
      .from("wallet_creations")
      .update(dbData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating wallet creation:", updateError);
      return res.status(500).json({
        ok: false,
        error: updateError.message || "Failed to update wallet creation",
      });
    }

    return res.json({
      ok: true,
      message: "Wallet creation updated successfully",
      creation,
    });
  } catch (err: any) {
    console.error("Failed to update wallet creation:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to update wallet creation",
    });
  }
};
