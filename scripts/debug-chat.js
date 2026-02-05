const fs = require('fs');

async function debugChat() {
    const url = 'http://localhost:3000/api/chat';
    const payload = {
        message: "Hello, brain!",
        history: [],
        gem: {
            personaName: "Socrates",
            openingLine: "Hello",
            systemInstructions: "You are Socrates."
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        const text = data.response;

        console.log("Full Text:", text);

        if (text.includes("[DEBUG:")) {
            const errorMsg = text.split("[DEBUG: API Error: ")[1].replace("]", "");
            fs.writeFileSync('error_clean.txt', errorMsg);
            console.log("Error extracted to error_clean.txt");
        } else {
            fs.writeFileSync('error_clean.txt', "NO ERROR FOUND");
        }

    } catch (e) {
        console.error("Fetch Error:", e);
        fs.writeFileSync('error_clean.txt', "FETCH ERROR: " + e.message);
    }
}

debugChat();
