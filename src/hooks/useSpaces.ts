import { useState, useEffect } from "react";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    updateDoc,
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Space, Gem } from "@/types";

export function useSpaces(userId: string | undefined) {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !db) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "spaces"),
            where("teacherId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Space[];
            setSpaces(docs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const createSpace = async (title: string, description: string) => {
        if (!userId || !db) return;

        const defaultGem: Gem = {
            id: "", // Will be set or unused
            personaName: "The Literary Analyst",
            systemInstructions: "You are a Socratic tutor. Guide the student to find evidence.",
            openingLine: "Welcome. What is your initial reading of the text?",
            constraints: ["No full essays", "Require evidence"]
        };

        try {
            await addDoc(collection(db, "spaces"), {
                title,
                description,
                teacherId: userId,
                createdAt: Timestamp.now(),
                gem: defaultGem
            });
        } catch (err) {
            console.error("Error creating space:", err);
            throw err;
        }
    };

    const updateGem = async (spaceId: string, gem: Gem) => {
        if (!db) return;
        const spaceRef = doc(db, "spaces", spaceId);
        await updateDoc(spaceRef, { gem });
    };

    return { spaces, loading, createSpace, updateGem };
}

// NEW: Hook for a SINGLE space (User/Student view)
export function useSpace(spaceId: string) {
    const [space, setSpace] = useState<Space | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!spaceId || !db) return;

        const unsubscribe = onSnapshot(doc(db, "spaces", spaceId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                setSpace({ id: docSnapshot.id, ...docSnapshot.data() } as Space);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [spaceId]);

    return { space, loading };
}
