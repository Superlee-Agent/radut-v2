import { RequestHandler } from "express";
import { getOpenAIClient } from "../utils/openai-client.js";

export const generateImageWithWatermark: RequestHandler = async (req, res) => {
  try {
    const prompt = req.body.prompt?.trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt text" });

    const result = await getOpenAIClient().images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    if (!result.data || !result.data[0]) {
      console.error("❌ Unexpected OpenAI response:", result);
      return res.status(500).json({ error: "No image data received" });
    }

    let imageUrl: string;

    if (result.data[0].url) {
      console.log("✅ Generated image URL received");
      imageUrl = result.data[0].url;
    } else if (result.data[0].b64_json) {
      console.log("✅ Using base64 image data");
      imageUrl = `data:image/png;base64,${result.data[0].b64_json}`;
    } else {
      console.error("❌ Unexpected OpenAI response format:", result.data[0]);
      return res
        .status(500)
        .json({ error: "No URL or base64 found in response" });
    }

    console.log(
      "✅ Image generated successfully (watermark processing disabled)",
    );
    res.json({ url: imageUrl });
  } catch (err: any) {
    console.error("❌ Error generating image with watermark:", err);
    res.status(500).json({
      error: "Failed to generate image",
      details: err.message || String(err),
    });
  }
};
