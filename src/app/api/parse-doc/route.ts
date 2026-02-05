import { NextResponse } from "next/server";
const pdf = require("pdf-parse/lib/pdf-parse.js");

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let text = "";

        if (file.type === "application/pdf") {
            const data = await pdf(buffer);
            text = data.text;
        } else {
            // Assume text/plain
            text = buffer.toString("utf-8");
        }

        return NextResponse.json({ text });

    } catch (error) {
        console.error("Parse Error:", error);
        return NextResponse.json({ error: "Failed to parse document" }, { status: 500 });
    }
}
