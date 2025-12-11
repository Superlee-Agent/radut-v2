import type { RequestHandler } from "express";
import { getAllWhitelistEntries } from "../utils/remix-hash-whitelist.js";

/**
 * Calculate Hamming distance for perceptual hash comparison
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return 64; // Max distance for 64-bit hash
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    for (let j = 0; j < 4; j++) {
      distance += (xor >> j) & 1;
    }
  }
  return distance;
}

/**
 * Calculate similarity percentage from hamming distance
 */
function calculatePhashSimilarity(distance: number): number {
  const similarity = Math.max(0, (64 - distance) / 64) * 100;
  return Math.round(similarity * 10) / 10;
}

export const handleVisionImageDetection: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        blocked: false,
        error: "No image file provided",
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      // Return success but don't block if service not available
      return res.status(200).json({
        ok: true,
        blocked: false,
        message: "Vision service not available for this upload",
      });
    }

    // Convert image buffer to base64
    const imageBase64 = req.file.buffer.toString("base64");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.file.mimetype};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Analyze this image and provide: 1) A brief description of what's in the image, 2) Main objects detected, 3) Image quality assessment (good/fair/poor), 4) Any text visible in the image. Format your response as JSON.",
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", response.status, errorData);
      // Don't block if vision API fails - allow registration to continue
      return res.status(200).json({
        ok: true,
        blocked: false,
        message: "Vision API analysis failed, allowing registration",
      });
    }

    const data = (await response.json()) as any;
    const analysisText = data.choices?.[0]?.message?.content || "";

    // Parse vision analysis
    let analysis: any = {
      description: analysisText,
      detectedObjects: [],
      quality: "unknown",
      textContent: "",
    };

    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.warn("Failed to parse vision analysis as JSON:", parseErr);
    }

    // Check against whitelist using perceptual analysis
    // Get whitelist entries to compare against
    let whitelistMatches = null;
    try {
      const whitelistEntries = await getAllWhitelistEntries();
      
      if (whitelistEntries && whitelistEntries.length > 0) {
        // Use vision analysis to score similarity with whitelisted images
        // This is a conceptual match based on detected objects and descriptions
        
        const analysisText = `${analysis.description || ""} ${(analysis.detectedObjects || []).join(" ")}`.toLowerCase();
        
        for (const entry of whitelistEntries) {
          const whitelistDescription = `${entry.metadata?.description || ""} ${entry.metadata?.title || ""}`.toLowerCase();
          
          // Simple string similarity check for vision analysis
          // Count common keywords between analysis and whitelist entry
          const analysisWords = new Set(analysisText.split(/\s+/).filter(w => w.length > 3));
          const whitelistWords = new Set(whitelistDescription.split(/\s+/).filter(w => w.length > 3));
          
          const commonWords = new Set([...analysisWords].filter(x => whitelistWords.has(x)));
          const similarity = (commonWords.size / Math.max(analysisWords.size, whitelistWords.size)) * 100;
          
          // If high similarity in vision analysis, flag for review
          if (similarity > 70) {
            whitelistMatches = {
              similarity: similarity,
              matchedTitle: entry.metadata?.title || entry.metadata?.ipId,
              matchedIpId: entry.metadata?.ipId,
            };
            break;
          }
        }
      }
    } catch (whitelistError) {
      console.warn("Error checking whitelist matches:", whitelistError);
      // Don't block registration if whitelist check fails
    }

    // Return proper response format expected by registration hook
    if (whitelistMatches) {
      return res.json({
        ok: true,
        blocked: true,
        message: `Image mirip dengan IP "${whitelistMatches.matchedTitle}" berdasarkan analisis visual`,
        analysis,
        matchDetails: whitelistMatches,
        fileName: req.file.originalname,
      });
    }

    // No match found - allow registration
    res.json({
      ok: true,
      blocked: false,
      analysis,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("Vision detection error:", error);
    // Don't block registration if vision service encounters errors
    res.status(200).json({
      ok: true,
      blocked: false,
      error: "Internal server error during vision detection",
      message: "Vision service unavailable, allowing registration to proceed",
    });
  }
};
