/**
 * Cloudflare Pages Function for handwriting verification
 * Path: /api/verify-handwriting
 */

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { image, targetChar } = await context.request.json() as any;

    if (!image || !targetChar) {
      return new Response(JSON.stringify({ error: "Missing image or targetChar" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured in Cloudflare Dashboard" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Using native fetch to call Gemini API directly (avoiding potential Node-specific issues in genai SDK if any)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Identify the Japanese character in this image. ` +
      `The intended sound is represented by '${targetChar}'. ` +
      `Does the handwritten character match this sound? (Accept both Hiragana or Katakana forms). ` +
      `Respond ONLY with a JSON object: {"match": true, "identified": "detected_char", "confidence": 1.0}. ` +
      `Be encouraging to learners with slightly messy handwriting.`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: image
            }
          }
        ]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Gemini API failure", details: errorText }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await response.json() as any;
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean potential markdown blocks from AI response
    const cleanJson = responseText.replace(/```json|```/g, "").trim();
    
    return new Response(cleanJson, {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
