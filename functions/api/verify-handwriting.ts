/**
 * Cloudflare Pages Function for handwriting verification
 * Path: /api/verify-handwriting
 */

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { image, targetChar, hiragana, katakana } = await context.request.json() as any;

    if (!image || (!targetChar && !hiragana)) {
      return new Response(JSON.stringify({ error: "Missing image or target character data" }), {
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

    // Using native fetch to call Gemini API directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Plan B: Accept either Hiragana or Katakana
    const h = hiragana || targetChar;
    const k = katakana || targetChar;

    const prompt = `Role: 日语听写批改老师（针对中国初学者，非常宽松）\n\n` +
      `Task: 判断学生手写日语字符是否与【目标平假名：${h}或者目标片假名：${k}只要和其中一个】一致就可以。\n\n` +
      `宽松判题规则（初学者友好，鼓励为主）：\n` +
      `1. 候选集 ONLY：只能从「${h}、${k}」中二选一，禁止识别成其他字符。\n` +
      `2. 高度容错：\n` +
      `   - 线条抖动、歪斜、大小不匀称：完全接受，算匹配\n` +
      `   - 笔画顺序错误、笔画连接不流畅：算匹配\n` +
      `   - 笔画粗细不均、轻微断笔：算匹配\n` +
      `   - 只有当字符完全不像目标假名时才判错\n` +
      `3. 判断标准：\n` +
      `   - 优先看整体轮廓和形状是否相似\n` +
      `   - 只要能看出是目标假名的大致样子就通过\n` +
      `   - 给予初学者最大的鼓励和肯定\n\n` +
      `输出 JSON（严格格式，不要解释）：\n` +
      `{\n` +
      `  "match": boolean,\n` +
      `  "identified_char": "你识别出的字符（只能是目标之一）",\n` +
      `  "stroke_similarity": 0-100, // 笔画相似度\n` +
      `  "structure_similarity": 0-100, // 结构相似度\n` +
      `  "reason": "中文原因，20字内",\n` +
      `  "feedback": "鼓励性中文反馈"\n` +
      `}`;

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
