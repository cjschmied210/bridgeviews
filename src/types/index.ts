import { Timestamp } from "firebase/firestore";

export interface Gem {
    id: string; // usually same as spaceId or generated
    systemInstructions: string;
    personaName: string; // e.g., "The Socratic Mirror"
    openingLine: string;
    knowledgeBase?: string; // Content from attached docs
    constraints: string[]; // e.g. ["No full essays", "Ask for evidence"]
}

export interface Space {
    id: string;
    title: string;
    description: string; // e.g. "Chapter 1-3 Analysis"
    teacherId: string;
    createdAt: Timestamp;
    gem: Gem;
}
