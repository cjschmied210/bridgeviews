const https = require('https');
require('dotenv').config({ path: '.env.local' });

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!key) {
    console.error("No API Key found!");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log(`Testing URL: https://generativelanguage.googleapis.com/v1beta/models?key=${key.substring(0, 8)}...`);

https.get(url, (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Status Message: ${res.statusMessage}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("\n✅ SUCCESS! API is Working.");
                console.log("Available Models:");
                json.models.forEach(m => console.log(` - ${m.name} (${m.displayName})`));
            } else {
                console.log("\n❌ API Error Response:");
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log("\nRaw Response (Not JSON):");
            console.log(data);
        }
    });

}).on("error", (err) => {
    console.error("Error: " + err.message);
});
