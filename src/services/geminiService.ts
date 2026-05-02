// Gemini AI Service for generating training content

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"

interface GenerateContentResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: "warmup" | "standard" | "pressure";
  keyPoints: string[];
  followUp?: string;
}

export interface SpeakingDrill {
  id: string;
  title: string;
  objective: string;
  prompt: string;
  steps: string[];
  selfReviewQuestions: string[];
  duration: number;
}

export interface ImpromptuPrompt {
  id: string;
  topic: string;
  category: string;
  framework: string;
  frameworkSteps: string[];
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data: GenerateContentResponse = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "";
}

export async function generateInterviewQuestions(
  category: string,
  difficulty: "warmup" | "standard" | "pressure",
  count: number = 3
): Promise<InterviewQuestion[]> {
  const difficultyDescription = {
    warmup: "easy, friendly opener questions to build confidence",
    standard: "typical interview questions that require thoughtful responses",
    pressure: "challenging, high-pressure questions that test composure and quick thinking",
  };

  const prompt = `Generate ${count} unique job interview questions for the category "${category}" at ${difficulty} difficulty level (${difficultyDescription[difficulty]}).

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

  try {
    const response = await callGemini(prompt);
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    const questions = JSON.parse(jsonMatch[0]);
    return questions.map((q: Omit<InterviewQuestion, "id">, index: number) => ({
      ...q,
      id: `ai-interview-${Date.now()}-${index}`,
    }));
  } catch (error) {
    console.error("Failed to generate interview questions:", error);
    throw error;
  }
}

export async function generateSpeakingDrills(
  focus: string,
  count: number = 2
): Promise<SpeakingDrill[]> {
  const prompt = `Generate ${count} unique public speaking practice drills focused on "${focus}".

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

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    const drills = JSON.parse(jsonMatch[0]);
    return drills.map((d: Omit<SpeakingDrill, "id">, index: number) => ({
      ...d,
      id: `ai-drill-${Date.now()}-${index}`,
    }));
  } catch (error) {
    console.error("Failed to generate speaking drills:", error);
    throw error;
  }
}

export async function generateImpromptuPrompts(
  category: string,
  count: number = 3
): Promise<ImpromptuPrompt[]> {
  const frameworks = [
    { name: "PREP", steps: ["Point - State your main point", "Reason - Explain why", "Example - Give a specific example", "Point - Restate your point"] },
    { name: "Past-Present-Future", steps: ["Past - How things were", "Present - How things are now", "Future - How things will be"] },
    { name: "Problem-Solution-Benefit", steps: ["Problem - Identify the issue", "Solution - Propose your solution", "Benefit - Explain the positive outcome"] },
  ];

  const prompt = `Generate ${count} unique impromptu speaking topics for the category "${category}".

Return ONLY a valid JSON array with this exact structure, no markdown or extra text:
[
  {
    "topic": "The speaking topic or question",
    "category": "${category}"
  }
]

Topics should be thought-provoking and suitable for 60-90 second impromptu speeches.`;

  try {
    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    const topics = JSON.parse(jsonMatch[0]);
    return topics.map((t: { topic: string; category: string }, index: number) => {
      const framework = frameworks[index % frameworks.length];
      return {
        ...t,
        id: `ai-impromptu-${Date.now()}-${index}`,
        framework: framework.name,
        frameworkSteps: framework.steps,
      };
    });
  } catch (error) {
    console.error("Failed to generate impromptu prompts:", error);
    throw error;
  }
}

export async function generateCustomContent(
  type: "interview" | "speaking" | "impromptu",
  customPrompt: string
): Promise<string> {
  const contextMap = {
    interview: "job interview preparation and practice",
    speaking: "public speaking skills and presentation",
    impromptu: "impromptu speaking and quick thinking",
  };

  const prompt = `You are a ${contextMap[type]} coach. ${customPrompt}

Provide helpful, actionable advice or content. Be concise and practical.`;

  try {
    return await callGemini(prompt);
  } catch (error) {
    console.error("Failed to generate custom content:", error);
    throw error;
  }
}
