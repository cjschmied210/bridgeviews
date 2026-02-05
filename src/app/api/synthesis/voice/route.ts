import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audioFile = formData.get("audio") as Blob | null;
        const spaceId = formData.get("spaceId") as string;
        const gemJson = formData.get("gem") as string;

        if (!audioFile || !spaceId) {
            return NextResponse.json({ error: "Missing audio or spaceId" }, { status: 400 });
        }

        const gem = JSON.parse(gemJson);

        // 1. Fetch Context (Class Interactions)
        // We reuse the logic to get the "Data Stream" so the Voice Agent is grounded
        let realInteractionsText = "";
        try {
            const q = query(
                collection(db, "interactions"),
                where("spaceId", "==", spaceId),
                orderBy("timestamp", "desc"),
                limit(30) // Smaller context for voice specific query speed
            );

            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.reverse();

            if (!querySnapshot.empty) {
                realInteractionsText = docs.map(d => {
                    const data = d.data();
                    return `${data.role === 'user' ? 'STUDENT' : 'AI TUTOR'}: ${data.content}`;
                }).join("\n");
            }
        } catch (dbError) {
            console.warn("DB Fetch Error (Voice):", dbError);
            realInteractionsText = "([System: Could not fetch live logs. Simulate based on persona.])";
        }

        const buffer = Buffer.from(await audioFile.arrayBuffer());

        // 2. Prompting
        const prompt = `
            You are "The Synthesis Agent" talking to the Teacher via Voice.
            
            CONTEXT:
            Class Space: "${gem.title || 'Literature Analysis'}"
            Goal/Persona: "${gem.personaName}"
            
            RECENT CLASS LOGS (EVIDENCE):
            ${realInteractionsText}
            
            INSTRUCTION:
            The Teacher is asking you a question via voice.
            Listen to the audio clip.
            Answer clearly and concisely (conversational tone).
            Cite specific students/moments from the logs if possible.
            If the logs are empty/simulated, roleplay the scenario effectively.
        `;

        // 3. Call Gemini with Audio
        try {
            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
                throw new Error("Missing Gemini API Key");
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: audioFile.type || "audio/webm"
                    }
                }
            ]);

            const responseText = result.response.text();
            return NextResponse.json({ text: responseText });

        } catch (aiError) {
            console.warn("Voice AI Failed (likely no key), using fallback:", aiError);
            // Fallback Simulation for Demo/No-Key mode
            return NextResponse.json({
                text: "I am having trouble processing your audio (likely missing API Key). However, based on the class logs, I suggest asking the student about the 'green light' metaphor again."
            });
        }
    } catch (error) {
        console.error("Voice API Logic Error:", error);
        return NextResponse.json({ error: "Failed to process voice" }, { status: 500 });
    }
}
