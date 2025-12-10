import OpenAI from "openai";
import { type ImageAnalysisFlags } from "../../shared/image-analysis";

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set.");
}

const openai = new OpenAI({ apiKey: API_KEY });

const analysisSchema = {
  name: "ImageAnalysisSchema",
  strict: true,
  schema: {
    type: "object",
    properties: {
      ai_generation_analysis: {
        type: "object",
        description:
          "Deeply analyze if the image is AI-generated, providing likelihood, evidence, and a confidence score.",
        properties: {
          likelihood: {
            type: "string",
            description:
              "Estimated likelihood: High, Medium, Low, or Unlikely.",
          },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "List of visual cues supporting the assessment.",
          },
          confidence_score: {
            type: "number",
            description: "Confidence score from 0.0 to 1.0.",
          },
        },
        required: ["likelihood", "evidence", "confidence_score"],
        additionalProperties: false,
      },
      content_analysis: {
        type: "object",
        description: "Analyze for sensitive or restricted content.",
        properties: {
          contains_explicit_content: { type: "boolean" },
          contains_violence: { type: "boolean" },
          contains_sensitive_subject: { type: "boolean" },
          description: { type: "string" },
        },
        required: [
          "contains_explicit_content",
          "contains_violence",
          "contains_sensitive_subject",
          "description",
        ],
        additionalProperties: false,
      },
      composition_analysis: {
        type: "object",
        description:
          "Analyze the artistic and technical composition of the image.",
        properties: {
          style: { type: "string" },
          perspective: { type: "string" },
          dominant_colors: { type: "array", items: { type: "string" } },
        },
        required: ["style", "perspective", "dominant_colors"],
        additionalProperties: false,
      },
      object_detection: {
        type: "object",
        description: "Identify key objects and text.",
        properties: {
          main_objects: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["main_objects"],
        additionalProperties: false,
      },
      text_detection: {
        type: "object",
        properties: {
          detected_text: { type: "string" },
        },
        required: ["detected_text"],
        additionalProperties: false,
      },
      is_photo: { type: "boolean" },
      is_animation: { type: "boolean" },
      has_human_face: { type: "boolean" },
      is_full_face_visible: { type: "boolean" },
      is_famous_person: { type: "boolean" },
      has_known_brand_or_character: { type: "boolean" },
      title: { type: "string" },
      description: { type: "string" },
    },
    required: [
      "ai_generation_analysis",
      "content_analysis",
      "composition_analysis",
      "object_detection",
      "text_detection",
      "is_photo",
      "is_animation",
      "has_human_face",
      "is_full_face_visible",
      "is_famous_person",
      "has_known_brand_or_character",
      "title",
      "description",
    ],
    additionalProperties: false,
  },
};

export async function analyzeImageWithOpenAI(
  base64Image: string,
  mimeType: string,
): Promise<ImageAnalysisFlags> {
  try {
    const prompt = `You are an expert forensic image analyst for IP registration tasks. Follow a zero-trust approach and strictly fill ALL fields of the JSON schema.

1. AI forensics: hyper-realism, texture issues, lighting mismatches, distortion.
2. Sensitive content analysis.
3. Composition: style, perspective, dominant colors.
4. Detect objects + any text found.
5. Check human faces, famous individuals, copyrighted characters.

Return ONLY JSON following the schema. Be precise, concise, and deterministic.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_schema",
        json_schema: analysisSchema,
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const jsonOutput = response.choices[0].message.content;

    if (!jsonOutput) {
      throw new Error("OpenAI returned empty response.");
    }

    const parsedJson = JSON.parse(jsonOutput);
    return parsedJson as ImageAnalysisFlags;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(
      "Failed to analyze image using OpenAI. Check logs for full details.",
    );
  }
}
