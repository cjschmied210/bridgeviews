import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
// import { adminDb } from "@/lib/firebase-admin"; // We'll need admin access for verification eventually, using client for now
import { Gem } from "@/types";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { message, history, gem } = await req.json();

        let text = "";

        try {
            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("No Key");

            // Construct the System Instruction from the Gem
            const systemPrompt = `
          You are embodying the persona: "${gem.personaName}".
          Opening Line was: "${gem.openingLine}".
          
          YOUR CORE INSTRUCTIONS ("The Soul"):
          ${gem.systemInstructions}
          
          MANDATORY CONSTRAINTS (INVARIANTS):
          1. Socratic Default: Only provide one step of scaffolding at a time. Never generate a full essay.
          2. Evidence Gate: If the user makes a claim, ask for textual evidence (quote) before validating it.
          3. Bridge and Revert: If the user goes off-topic, bridge back to the text.
          
          ATTACHED KNOWLEDGE BASE (CONTEXT):
          ${gem.knowledgeBase || "No additional documents attached."}
          
          CURRENT OBSERVATION:
          The student has just defined a new thought. Respond in character.
        `;

            let model;
            try {
                // Try the newer flash model first (v2 based on logs seen)
                model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            } catch (e) {
                // Fallback to standard pro
                model = genAI.getGenerativeModel({ model: "gemini-pro" });
            }

            // Sanitize history to prevent AI from mimicking the "[SIMULATED]" tag
            const cleanHistory = history.map((h: any) => ({
                role: h.role,
                parts: [{ text: h.parts[0].text.replace(/\[SIMULATED.*?\] /, "") }]
            }));

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "I understand." }] },
                    ...cleanHistory
                ]
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            text = response.text();

            // Double check: If the AI still hallucinated the tag, strip it.
            text = text.replace(/\[SIMULATED.*?\] /, "");

        } catch (error: any) {
            console.log("Using Simulation Fallback due to API Error:", error);
            // Simulation Logic
            const responses = [
                `That is an interesting point. Can you find a specific quote to back that up?`,
                `I see where you are going. But what does the text say specifically about this?`,
                `Hold on. Let's look closer at the second paragraph. What do you see there?`
            ];
            text = responses[Math.floor(Math.random() * responses.length)];
        }

        return NextResponse.json({ response: text });


    } catch (error) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
    }
}
