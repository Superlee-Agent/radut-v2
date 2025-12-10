import multer from "multer";
import { analyzeImageWithOpenAI } from "../utils/image-analysis";
import { classifyImage, getLicenseSettings } from "../../shared/image-analysis";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// Idempotency cache - in production, use Redis or similar
const IDP_STORE = new Map<string, { status: number; body: any; ts: number }>();

export const handleUpload: any = [
  upload.single("image"),
  (async (req: any, res: any) => {
    try {
      // Idempotency support: if client supplies Idempotency-Key header, return cached response
      const idempotencyKey = (req.get("Idempotency-Key") ||
        req.get("idempotency-key")) as string | undefined;

      if (idempotencyKey && IDP_STORE.has(idempotencyKey)) {
        const cached = IDP_STORE.get(idempotencyKey)!;
        // If cached item is older than 60s, fallthrough and compute again
        if (Date.now() - cached.ts < 60_000) {
          res.status(cached.status).json({ ok: true, ...cached.body });
          return;
        } else {
          IDP_STORE.delete(idempotencyKey);
        }
      }

      const f = (req as any).file as any;
      if (!f)
        return res
          .status(400)
          .json({ ok: false, error: "no_file", message: "No file uploaded" });

      const base64 = f.buffer.toString("base64");

      if (!process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not configured on the server");
        return res.status(503).json({
          ok: false,
          error: "openai_api_key_missing",
          message: "OpenAI API key not configured on the server",
        });
      }

      // Analyze image with new OpenAI analysis function
      const analysisFlags = await analyzeImageWithOpenAI(base64, f.mimetype);

      // Classify the image based on analysis flags
      const classification = classifyImage(analysisFlags);

      // Get license settings for the classified group
      const license = getLicenseSettings(classification.group);

      // Build response body
      const body = {
        ok: true,
        group: classification.group,
        type: classification.type,
        classification: classification.classification,
        details: analysisFlags,
        title: analysisFlags.title,
        description: analysisFlags.description,
        license: license,
        display: buildDisplayMessage(classification, license),
      };

      if (idempotencyKey) {
        IDP_STORE.set(idempotencyKey, { status: 200, body, ts: Date.now() });
      }

      return res.status(200).json(body);
    } catch (err) {
      console.error("upload error:", err);
      const body = {
        ok: false,
        error: "analysis_failed",
        message: String(err?.message || "Analysis failed"),
      };
      if (req.get("Idempotency-Key") || req.get("idempotency-key")) {
        const key = (req.get("Idempotency-Key") ||
          req.get("idempotency-key")) as string;
        IDP_STORE.set(key, { status: 500, body, ts: Date.now() });
      }
      return res.status(500).json(body);
    }
  }) as any,
];

function buildDisplayMessage(classification: any, license: any): string {
  const { type, classification: classificationDetail } = classification;
  const { title, description } = license;

  return `${type} - ${classificationDetail}. ${title}: ${description}`;
}
