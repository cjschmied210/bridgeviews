const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function test() {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("Key:", key ? key.substring(0, 5) + "..." : "MISSING");

    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);

    try {
        console.log("Attempting to list models...");
        // This is a way to test auth without invoking a specific model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("SUCCESS! Response:", result.response.text());
    } catch (e) {
        console.error("GENERATION FAILED.");
        console.error("Error Status:", e.response ? e.response.status : "Unknown");
        console.error("Error Text:", e.response ? e.response.statusText : "Unknown");
        // console.error("Full Error:", JSON.stringify(e, null, 2));

        if (e.message.includes("404")) {
            console.log("\n--- DIAGNOSIS: 404 NOT FOUND ---");
            console.log("This usually means the 'Gemini API' is technically enabled, but the endpoint for 'gemini-1.5-flash' is not reachable.");
            console.log("Trying 'gemini-pro' as fallback...");

            try {
                const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result2 = await model2.generateContent("Hello");
                console.log("SUCCESS with gemini-pro!", result2.response.text());
            } catch (e2) {
                console.log("Fallback also failed.");
            }
        }
    }
}

test();
