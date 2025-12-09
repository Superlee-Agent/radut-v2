/**
 * Add watermark text to an image using Canvas API
 * @param imageUrl - Data URL or blob URL of the image
 * @param watermarkText - Text to watermark (default: "protected:")
 * @returns Promise<string> - Data URL of watermarked image
 */
export async function addCanvasWatermark(
  imageUrl: string,
  watermarkText: string = "protected:",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(40, Math.floor(img.width / 10));
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const spacing = img.height / 4;
      const startY = spacing;

      for (let i = 0; i < 5; i++) {
        const y = startY + i * spacing;
        const x = img.width / 2;

        ctx.strokeText(watermarkText, x, y);
        ctx.fillText(watermarkText, x, y);
      }

      // Convert canvas to data URL (permanent, can be saved to database)
      // instead of blob URL (temporary, tied to browser session)
      try {
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (error) {
        reject(new Error("Failed to convert canvas to data URL"));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for watermarking"));
    };

    img.crossOrigin = "anonymous";
    img.src = imageUrl;
  });
}
