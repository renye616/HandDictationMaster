import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "10mb" }));

  // Gemini API Proxy
  app.post("/api/verify-handwriting", async (req, res) => {
    const { image, targetChar } = req.body;
    
    if (!image || !targetChar) {
      return res.status(400).json({ error: "Missing image or targetChar" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in the environment.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Identify the Japanese character in this image. ` +
        `The intended sound is represented by '${targetChar}'. ` +
        `Does the handwritten character match this sound? (Accept both Hiragana or Katakana forms). ` +
        `Respond ONLY with a JSON object: {"match": true, "identified": "detected_char", "confidence": 1.0}. ` +
        `Be encouraging to learners with slightly messy handwriting.`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: image,
            mimeType: "image/png"
          }
        }
      ]);

      const responseText = result.response.text();
      // Clean potential markdown blocks
      const cleanJson = responseText.replace(/```json|```/g, "").trim();
      
      try {
        const parsed = JSON.parse(cleanJson);
        res.json(parsed);
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON:", cleanJson);
        res.status(500).json({ error: "Invalid response from AI", raw: cleanJson });
      }
    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: "Failed to process handwriting" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
