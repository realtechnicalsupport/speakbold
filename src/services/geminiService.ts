const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatChoice {
  message: {
    content: string;
  };
}

interface ChatResponse {
  choices: ChatChoice[];
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
  example: { label: string; text: string }[];
}

async function callAI(prompt: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2048,
    } as ChatRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data: ChatResponse = await response.json();
  return data.choices[0]?.message?.content || "";
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
    const response = await callAI(prompt);
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
    const response = await callAI(prompt);
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
    { name: "PREP", stepLabels: ["Point", "Reason", "Example", "Point"] },
    { name: "Past-Present-Future", stepLabels: ["Past", "Present", "Future"] },
    { name: "Problem-Solution-Benefit", stepLabels: ["Problem", "Solution", "Benefit"] },
  ];

  const frameworkInstructions = {
    PREP: "Point: State a clear, decisive stance on the topic. Reason: Give 2-3 concrete reasons why you hold that view. Example: Share a specific real-world scenario, study, or personal story that illustrates your reasoning. Point: Circle back and restate your stance with added conviction.",
    "Past-Present-Future": "Past: Describe how this topic was viewed or handled historically, with a concrete example. Present: Explain the current state of affairs, citing recent trends or developments. Future: Project where this is headed and what it means, offering a bold but reasoned prediction.",
    "Problem-Solution-Benefit": "Problem: Pinpoint the core issue with a specific example of who it affects and why it matters. Solution: Propose a realistic, actionable fix — not a vague idea. Benefit: Paint a vivid picture of the positive outcome if your solution is adopted, including measurable impact.",
  };

  const prompt = `Generate ${count} unique impromptu speaking topics for the category "${category}".

For EACH topic, I need you to generate TWO things:
1. DETAILED, TOPIC-SPECIFIC talking points for a speaking framework — NOT generic placeholders.
2. A COMPLETE EXAMPLE SPEECH broken into beats — this should be a realistic, well-spoken 60-90 second response to the prompt, written in first person as if someone is actually delivering it. Each beat should have a label and the actual spoken text.

Return ONLY a valid JSON array with this exact structure, no markdown or extra text:
[
  {
    "topic": "The speaking topic or question",
    "category": "${category}",
    "framework": "PREP" or "Past-Present-Future" or "Problem-Solution-Benefit",
    "frameworkSteps": [
      "Label - detailed, topic-specific guidance (2-3 sentences) on what to say for this step",
      "Label - detailed, topic-specific guidance (2-3 sentences) on what to say for this step",
      "Label - detailed, topic-specific guidance (2-3 sentences) on what to say for this step"
    ],
    "example": [
      { "label": "Beat label (e.g. Opening, Point, Story, Closing)", "text": "The actual spoken sentences for this beat — write it as if someone is speaking it aloud" },
      { "label": "Beat label", "text": "The actual spoken sentences for this beat" },
      { "label": "Beat label", "text": "The actual spoken sentences for this beat" }
    ]
  }
]

Requirements for frameworkSteps:
- Each should follow the format: "Label - detailed guidance"
- The guidance must be SPECIFIC to the topic — mention concrete angles, examples, statistics, or arguments the speaker could make
- Make each step substantive so the speaker has real material to work with

Requirements for example:
- Write 4-5 beats that together form a complete, natural-sounding 60-90 second speech
- Use first-person voice, as if someone is actually speaking on stage
- The text should be conversational and realistic — not academic or stiff
- Each beat's text should be 2-4 sentences of actual spoken content
- The labels should match the framework structure (e.g., for PREP: "Point", "Reason", "Example", "Closing Point")
- The example should demonstrate HOW the framework holds the speech together

Topics should be thought-provoking and suitable for 60-90 second impromptu speeches.`;

  try {
    const response = await callAI(prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    let topics;
    try {
      topics = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse failed, attempting to fix:", parseError);
      const fixedJson = jsonMatch[0]
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
        .replace(/: ([^{[\n]+),/g, ': "$1",');
      topics = JSON.parse(fixedJson);
    }
    return topics.map((t: { topic: string; category: string; framework: string; frameworkSteps: string[]; example: { label: string; text: string }[] }, index: number) => {
      const framework = frameworks[index % frameworks.length];
      return {
        ...t,
        id: `ai-impromptu-${Date.now()}-${index}`,
        framework: t.framework || framework.name,
        frameworkSteps: t.frameworkSteps || framework.stepLabels.map((label: string) => `${label} - ${frameworkInstructions[t.framework || framework.name as keyof typeof frameworkInstructions]?.split(":")[0] || "Develop your argument"}`),
        example: t.example || [],
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
    return await callAI(prompt);
  } catch (error) {
    console.error("Failed to generate custom content:", error);
    throw error;
  }
}