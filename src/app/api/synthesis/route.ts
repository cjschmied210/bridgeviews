import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Note: In a real app, use Admin SDK for server-side auth bypass
import { Gem } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { spaceId, gem } = await req.json();

        try {
            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("No Key");

            // 1. Fetch REAL recent interactions from the DB
            let realInteractionsText = "";
            try {
                // Query the last 50 interactions for this space
                const q = query(
                    collection(db, "interactions"),
                    where("spaceId", "==", spaceId),
                    orderBy("timestamp", "desc"),
                    limit(100)
                );

                const querySnapshot = await getDocs(q);
                // Reverse to get chronological order for the context
                const docs = querySnapshot.docs.reverse();

                if (!querySnapshot.empty) {
                    realInteractionsText = docs.map(d => {
                        const data = d.data();
                        // Format: [User ID] (Role): Content
                        return `[User ${data.userId}] (${data.role}): ${data.content}`;
                    }).join("\n");
                }
            } catch (dbError) {
                console.warn("Database fetch failed (likely auth rules), falling back to simulation:", dbError);
            }

            let synthesisPrompt = "";

            if (realInteractionsText.length > 5) {
                // REAL ANALYSIS PROMPT
                synthesisPrompt = `
                  You are "The Synthesis Agent".
                  
                  CONTEXT:
                  Class Space: "${gem.title || 'Literature Analysis'}"
                  Goal of Analysis (Gem Persona): "${gem.personaName} - ${gem.systemInstructions}"
                  
                  DATA STREAM (Recent Class Interactions):
                  ${realInteractionsText}
                  
                  TASK:
                  Analyze the ACTUAL student conversations above to generate a "Pulse Report".
                  1. Identify patterns in what the students are actually saying.
                  2. Group interactions by "STUDENT" (User ID) to see individual progress.
                  
                  OUTPUT FORMAT (JSON):
                  {
                    "summary": "2-3 sentences analyzing the real student engagement. If the data is very sparse (just one 'Hello'), note that.",
                    "top_misconception": "A specific misunderstanding found in the logs (or 'None' if clear).",
                    "shoutouts": ["Specific quotes or insights from the logs that stood out"],
                    "suggested_intervention": "What should the teacher do next based on this data?",
                    "student_breakdown": [
                      {
                        "user_id": "THE_EXACT_USER_ID_FROM_LOGS",
                        "name": "Student (last 4 chars of ID)", 
                        "status": "On Track" | "Stuck" | "Idle",
                        "last_thought": "Brief summary of their last point",
                        "needs_help": boolean
                      }
                    ]
                  }
                `;
            } else {
                // SIMULATION PROMPT (Fallback)
                console.log("Not enough data for synthesis, using simulation.");
                synthesisPrompt = `
                  You are "The Synthesis Agent".
                  
                  CONTEXT:
                  Class Space: "${gem.title || 'Literature Analysis'}"
                  Goal/Gem: "${gem.systemInstructions}"
                  
                  TASK:
                  Generate a "Pulse Report" for the teacher. 
                  (Since I strictly CANNOT see any student logs right now—likely because the database is empty or the index is missing—please hallucinate a realistic scenario based on the Gem).
                  
                  IMPORTANT: Start the summary with: "[SIMULATION MODE] No student data detected."
                  
                  SCENARIO TO SIMULATE:
                  Imagine 25 students differ in their understanding.
                  - 60% are grasping the core concept.
                  - 20% are stuck on a specific vocabulary word.
                  - 20% found a brilliant, unexpected connection.
                  
                  OUTPUT FORMAT (JSON):
                  {
                    "summary": "[SIMULATION MODE] No data yet. (Then provide 2-3 sentences on the simulated vibe).",
                    "top_misconception": "The specific thing students are getting wrong (Simulated).",
                    "shoutouts": ["Student A: Made coverage connection", "Student B: Found the irony"],
                    "suggested_intervention": "A specific question the teacher should ask the class right now."
                  }
                `;
            }

            let model;
            try {
                model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            } catch (e) {
                model = genAI.getGenerativeModel({ model: "gemini-pro" });
            }

            const result = await model.generateContent(synthesisPrompt);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

            return NextResponse.json(JSON.parse(cleanJson));

        } catch (error) {
            console.log("Synthesis Simulation Fallback");
            return NextResponse.json({
                summary: "SIMULATED REPORT: The classroom is generally engaged, with most students grasping the core protagonist motivations. However, there is a divergence in understanding the historical context.",
                top_misconception: "Students are conflating the narrator's bias with objective truth.",
                shoutouts: ["Student A: Noted the color symbolism", "Student B: Questioned the narrator's reliability"],
                suggested_intervention: "Ask the class: 'How might Nick's own background color his description of Gatsby?'"
            });
        }

    } catch (error) {
        console.error("Synthesis API Error:", error);
        return NextResponse.json({ error: "Failed to generate synthesis" }, { status: 500 });
    }
}
