import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials from environment (provided by MCP integration)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase credentials not found. Please connect to Supabase in settings.",
    );
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
};

export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseKey;
};

interface UploadImageOptions {
  file: Blob;
  fileName?: string;
  creationId: string;
  bucket?: string;
}

/**
 * Upload a generated image to Supabase Storage
 * @param options Upload configuration
 * @returns URL of the uploaded image or null if failed
 */
export const uploadGuestImageToSupabase = async (
  options: UploadImageOptions,
): Promise<string | null> => {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase is not configured");
    return null;
  }

  try {
    const { file, creationId, bucket = "guest_creation" } = options;

    // Create a unique file path using creationId and timestamp
    const timestamp = Date.now();
    const filePath = `${creationId}/${timestamp}.png`;

    console.log(`[Supabase] Starting upload: ${filePath} (${file.size} bytes)`);

    // Set upload timeout (30 seconds)
    const uploadPromise = client.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(
        () => reject(new Error("Upload timeout after 30 seconds")),
        30000,
      ),
    );

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      console.error("Error uploading image to Supabase:", error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = client.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log(`[Supabase] Upload complete: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Failed to upload image to Supabase:", error);
    return null;
  }
};

/**
 * Upload a wallet user's generated image to Supabase Storage
 * @param options Upload configuration
 * @returns URL of the uploaded image or null if failed
 */
export const uploadWalletImageToSupabase = async (
  options: UploadImageOptions & { walletAddress: string },
): Promise<string | null> => {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase is not configured");
    return null;
  }

  try {
    const {
      file,
      creationId,
      walletAddress,
      bucket = "wallet_creations",
    } = options;

    // Create a unique file path using wallet address, creationId and timestamp
    const timestamp = Date.now();
    const walletPath = walletAddress.toLowerCase();
    const filePath = `${walletPath}/${creationId}/${timestamp}.png`;

    console.log(
      `[Supabase] Starting wallet upload: ${filePath} (${file.size} bytes)`,
    );

    // Set upload timeout (30 seconds)
    const uploadPromise = client.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(
        () => reject(new Error("Upload timeout after 30 seconds")),
        30000,
      ),
    );

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

    if (error) {
      console.error("Error uploading wallet image to Supabase:", error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = client.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log(`[Supabase] Wallet upload complete: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Failed to upload wallet image to Supabase:", error);
    return null;
  }
};

/**
 * Fetch all guest creations from Supabase
 * @param creationId Optional: filter by creationId
 * @returns Array of guest creations
 */
export const fetchGuestCreations = async (
  creationId?: string,
): Promise<Array<{ id: string; url: string; timestamp: number }>> => {
  const client = getSupabaseClient();
  if (!client) {
    console.error("Supabase is not configured");
    return [];
  }

  try {
    const bucket = "guest_creation";
    const { data, error } = await client.storage.from(bucket).list();

    if (error) {
      console.error("Error fetching guest creations:", error);
      return [];
    }

    const creations = (data || [])
      .filter((item) => {
        if (creationId) {
          return item.name.startsWith(creationId);
        }
        return !item.name.endsWith("/");
      })
      .map((item) => {
        const { data: urlData } = client.storage
          .from(bucket)
          .getPublicUrl(item.name);
        return {
          id: item.name,
          url: urlData.publicUrl,
          timestamp: item.updated_at ? new Date(item.updated_at).getTime() : 0,
        };
      });

    return creations;
  } catch (error) {
    console.error("Failed to fetch guest creations:", error);
    return [];
  }
};
