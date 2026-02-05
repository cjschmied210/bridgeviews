import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { Gem } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { lastInteraction, gem } = await req.json();

    try {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("No Key");

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // The Analyst Logic
      const analysisPrompt = `
          You are "The Analyst", a background system for a literature class.
          
          CONTEXT:
          Student just said: "${lastInteraction.content}"
          The Goal System (Gem) is: "${gem.systemInstructions}"
          
          TASK:
          Analyze the student's input and generate tags.
          Return ONLY a JSON object with this structure:
          {
            "tags": [
              {
                "type": "CONCEPT_MASTERY" | "EMOTIONAL_STATE" | "RUBRIC_PROGRESS",
                "value": "string (short, e.g., 'Identified Irony' or 'Frustrated')",
                "confidence": number (0-1)
              }
            ]
          }
          
          Do NOT return markdown. Just the JSON.
        `;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();

      // Clean code blocks if present
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return NextResponse.json(JSON.parse(cleanJson));

    } catch (error) {
      console.log("Analyst Simulation Fallback");
      return NextResponse.json({
        tags: [
          { type: "CONCEPT_MASTERY", value: "Emerging Analysis (Simulated)", confidence: 0.8 },
          { type: "EMOTIONAL_STATE", value: "Curious", confidence: 0.9 }
        ]
      });
    }

  } catch (error) {
    console.error("Analyst API Error:", error);
    return NextResponse.json({ tags: [] }); // Fail gracefully with no tags
  }
}
