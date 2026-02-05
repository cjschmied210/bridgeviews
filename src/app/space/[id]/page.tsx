"use client";

import { use, useState, useEffect, KeyboardEvent, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAnalyst } from "@/hooks/useAnalyst";
import { useSpace } from "@/hooks/useSpaces";

export default function Space({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, signInWithGoogle, loading: authLoading } = useAuth();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Fetch REAL Space Data
    const { space, loading: spaceLoading } = useSpace(id);
    const { interactions, logInteraction, addTagsToInteraction, loading: analystLoading } = useAnalyst(id, user?.uid);

    const [input, setInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [interactions, isSubmitting]);

    const handleSubmit = async () => {
        if (!input.trim() || !user || isSubmitting || !space) return; // Guard clause

        setIsSubmitting(true);
        try {
            // 1. Log user message (Optimistic UI) 
            const userMessageId = await logInteraction(input, "user");
            const userMessage = input;
            setInput("");

            // USE REAL GEM
            const currentGem = space.gem;

            // 2. Call The Tutor (Chat API)
            // We convert Firestore interactions to Gemini history format
            const history = interactions.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

            // Only send last 10 messages context to save tokens/complexity for this alpha
            const recentHistory = history.slice(-10);

            const chatRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: recentHistory,
                    gem: currentGem
                })
            });

            const chatData = await chatRes.json();

            if (chatData.response) {
                await logInteraction(chatData.response, "ai");
            }

            // 3. Trigger The Analyst (Background Process)
            if (userMessageId) {
                fetch('/api/analyst', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lastInteraction: { content: userMessage, role: "user" },
                        gem: currentGem
                    })
                }).then(res => res.json()).then(async (data) => {
                    if (data.tags) {
                        await addTagsToInteraction(userMessageId, data.tags);
                    }
                });
            }

        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (authLoading || spaceLoading) return <div className="h-screen flex items-center justify-center font-serif text-foreground/60">Initializing Space...</div>;

    if (!user) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 space-y-6">
                <h1 className="text-3xl font-serif">Student Access Check</h1>
                <p className="text-foreground/60 font-serif italic">Please identify yourself to enter this Space.</p>
                <button
                    onClick={signInWithGoogle}
                    className="px-6 py-2 rounded-full bg-primary text-white hover:opacity-90 transition-all font-serif"
                >
                    Sign in with School ID
                </button>
            </div>
        );
    }

    if (!space) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 space-y-6">
                <h1 className="text-3xl font-serif text-red-800">Space Not Found</h1>
                <p className="text-foreground/60 font-serif italic">The ID "{id}" does not match any active classroom space.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-background font-serif text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-muted px-6 py-4">
                <div>
                    <h1 className="text-xl capitalize italic">{space.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-foreground/60">Analyst Active ({space.gem.personaName})</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium">{user.displayName}</div>
                    <div className="text-xs text-foreground/40">Socratic Mode</div>
                </div>
            </header>

            {/* Chat Area */}
            <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Intro Message */}
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold font-serif">AI</span>
                        </div>
                        <div className="space-y-1 max-w-2xl">
                            <p className="leading-relaxed text-lg">
                                {space.gem.openingLine || "Welcome class. Let us begin."}
                            </p>
                            <div className="flex gap-2">
                                <span className="text-[10px] text-foreground/40 uppercase tracking-widest border border-foreground/10 px-2 py-0.5 rounded">
                                    Awaiting Evidence
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Live Interactions from Firestore */}
                    {interactions.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-foreground/5 border border-foreground/10'}`}>
                                <span className="text-xs font-bold font-serif">{msg.role === 'user' ? 'You' : 'AI'}</span>
                            </div>
                            <div className={`space-y-1 max-w-2xl ${msg.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`p-4 rounded-lg text-lg leading-relaxed ${msg.role === 'user' ? 'bg-muted/30 rounded-tr-none' : ''}`}>
                                    {msg.content}
                                </div>
                                {/* Placeholder for Analyst Tags */}
                                {msg.tags && msg.tags.length > 0 && (
                                    <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.tags.map((tag, idx) => (
                                            <span key={idx} className="text-[10px] text-primary/60 uppercase tracking-widest border border-primary/20 px-2 py-0.5 rounded">
                                                {tag.value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {analystLoading && <div className="text-center text-xs text-foreground/20">Syncing with Analyst...</div>}
                    <div className="h-4" /> {/* Spacer */}
                </div>
            </main>

            {/* Input Area */}
            <div className="p-6 border-t border-muted bg-background/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your response... (Citations encouraged)"
                        disabled={isSubmitting}
                        className="w-full bg-transparent border border-muted rounded-lg p-4 pr-12 focus:outline-none focus:border-primary transition-colors resize-none h-24 font-serif text-lg"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!input.trim() || isSubmitting}
                        className="absolute right-4 bottom-4 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                        Attempt
                    </button>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-foreground/30">
                        Eco-Ink Safe Mode • PII Scrubbing Active
                    </span>
                </div>
            </div>
        </div>
    );
}
