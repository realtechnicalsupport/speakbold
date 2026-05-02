import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, category, difficulty, count } = req.body;

    let prompt = "";

    if (type === "interview") {
      const difficultyDescription: Record<string, string> = {
        warmup: "easy, friendly opener questions to build confidence",
        standard: "typical interview questions that require thoughtful responses",
        pressure: "challenging, high-pressure questions that test composure and quick thinking",
      };

      prompt = `Generate ${count} unique job interview questions for the category "${category}" at ${difficulty} difficulty level (${difficultyDescription[difficulty]}).

Return ONLY a valid JSON array with this exact structure, no markdown or extra text:
[
  {
    "question": "The interview question",
    "category": "${category}",
    "difficulty": "${difficulty}",
    "keyPoints": ["Key point 1 to mention", "Key point 2 to mention", "Key point 3 to mention"],
    "followUp": "A potential follow-up question the interviewer might ask"
  }
]

Make the questions realistic and commonly asked in professional interviews. Key points should be actionable tips for answering well.`;
    } else if (type === "impromptu") {
      prompt = `Generate ${count} unique impromptu speaking topics for the category "${category}".

Return ONLY a valid JSON array with this exact structure, no markdown or extra text:
[
  {
    "topic": "The speaking topic or question",
    "category": "${category}"
  }
]

Topics should be thought-provoking and suitable for 60-90 second impromptu speeches. Make them interesting, varied, and challenging.`;
    } else if (type === "speaking") {
      prompt = `Generate ${count} unique public speaking practice drills focused on "${category}".

Return ONLY a valid JSON array with this exact structure, no markdown or extra text:
[
  {
    "title": "Drill title",
    "objective": "What skill this drill develops",
    "prompt": "The specific speaking topic or scenario to practice",
    "steps": ["Step 1 instruction", "Step 2 instruction", "Step 3 instruction"],
    "selfReviewQuestions": ["Question to evaluate performance 1", "Question 2", "Question 3"],
    "duration": 90
  }
]

Make drills practical and focused on real-world speaking scenarios. Duration should be 60, 90, or 120 seconds.`;
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt,
      temperature: 0.8,
      maxTokens: 2048,
    });

    // Extract JSON from response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Invalid response format from AI" });
    }

    const data = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ data });
  } catch (error) {
    console.error("AI generation error:", error);
    return res.status(500).json({ error: "Failed to generate content" });
  }
}
