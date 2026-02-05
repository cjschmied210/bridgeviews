import { useState, useEffect } from "react";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    Timestamp,
    QuerySnapshot,
    DocumentData,
    doc,
    updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AnalystTag {
    id: string;
    type: "CONCEPT_MASTERY" | "EMOTIONAL_STATE" | "RUBRIC_PROGRESS";
    value: string;
    confidence: number;
    timestamp: Timestamp;
}

export interface Interaction {
    id?: string;
    role: "user" | "ai";
    content: string;
    timestamp: Timestamp;
    tags?: AnalystTag[];
}

export function useAnalyst(spaceId: string, userId: string | undefined) {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Listen to the live conversation stream
    useEffect(() => {
        if (!userId || !spaceId || !db) {
            setLoading(false);
            return;
        }

        // We assume a structure of: spaces/{spaceId}/sessions/{userId}/interactions
        // Or simplified: interactions collection with spaceId and userId fields
        const q = query(
            collection(db, "interactions"),
            where("spaceId", "==", spaceId),
            where("userId", "==", userId),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Interaction[];
            setInteractions(docs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [spaceId, userId]);

    // Function to log a new user message
    const logInteraction = async (content: string, role: "user" | "ai") => {
        if (!userId || !db) return null;

        try {
            const docRef = await addDoc(collection(db, "interactions"), {
                spaceId,
                userId,
                role,
                content,
                timestamp: Timestamp.now(),
                tags: []
            });
            return docRef.id;
        } catch (err) {
            console.error("Failed to log interaction:", err);
            return null;
        }
    };

    const addTagsToInteraction = async (interactionId: string, tags: AnalystTag[]) => {
        if (!userId || !db) return;
        try {
            const interactionRef = doc(db, "interactions", interactionId);
            await updateDoc(interactionRef, { tags });
        } catch (err) {
            console.error("Failed to add tags:", err);
        }
    };

    return { interactions, logInteraction, addTagsToInteraction, loading };
}
