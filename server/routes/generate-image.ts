import { RequestHandler } from "express";
import { FormData, Blob } from "formdata-node";

// 🔹 TEXT → IMAGE
export const generateImage: RequestHandler = async (req, res) => {
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
      imageUrl = result.data[0].url;
    } else if (result.data[0].b64_json) {
      imageUrl = `data:image/png;base64,${result.data[0].b64_json}`;
    } else {
      console.error("❌ Unexpected OpenAI response format:", result.data[0]);
      return res
        .status(500)
        .json({ error: "No URL or base64 found in response" });
    }

    console.log("✅ Image generated successfully");
    res.json({ url: imageUrl });
  } catch (err: any) {
    console.error("❌ Error generating image:", err);
    res.status(500).json({
      error: "Failed to generate image",
      details: err.message || String(err),
    });
  }
};

// 🔹 IMAGE → EDIT
export const editImage: RequestHandler = async (req, res) => {
  try {
    const prompt = req.body.prompt?.trim();
    const file = (req as any).file;

    if (!file || !prompt) {
      return res.status(400).json({ error: "Missing image or prompt" });
    }

    const buffer = file.buffer;
    console.log("📸 Image received, bytes:", buffer.length);

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({
        error: "Image too large. Please use a smaller image.",
        currentSize: buffer.length,
        maxSize: 20971520,
      });
    }

    // 🔹 Gunakan FormData untuk kirim ke OpenAI
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", prompt);
    form.append(
      "image",
      new Blob([buffer], { type: "image/jpeg" }),
      "image.jpg",
    );

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form as any, // FormData type untuk node-fetch
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ OpenAI API error:", data);
      return res.status(response.status).json({
        error: "Failed to edit image",
        details: data.error?.message || "Unknown error",
      });
    }

    if (!data.data || !data.data[0]) {
      console.error("❌ Unexpected OpenAI response:", data);
      return res.status(500).json({
        error: "Invalid response from OpenAI",
        details: "Missing image data in response",
      });
    }

    // Handle both URL (text-to-image) and b64_json (image edit) responses
    let imageUrl: string;
    if (data.data[0].url) {
      imageUrl = data.data[0].url;
    } else if (data.data[0].b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    } else {
      console.error("❌ Unexpected OpenAI response format:", data.data[0]);
      return res.status(500).json({
        error: "Invalid response from OpenAI",
        details: "Missing both URL and base64 image data",
      });
    }

    console.log("✅ Image edited successfully");
    res.json({ url: imageUrl });
  } catch (err: any) {
    console.error("❌ Error editing image:", err);
    res.status(500).json({
      error: "Failed to edit image",
      details: err.message || err,
    });
  }
};
