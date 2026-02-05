"use client";

import { useAuth } from "@/context/AuthContext";
import { useSpaces } from "@/hooks/useSpaces";
import { useState, useEffect, ChangeEvent } from "react";
import { Gem, Space } from "@/types";
import Link from "next/link";
// import Image from "next/image"; // Removed

import { PulseView } from "./components/PulseView";

export default function Dashboard() {
    const { user, signInWithGoogle, loading: authLoading } = useAuth();
    const { spaces, createSpace, updateGem, loading: spacesLoading } = useSpaces(user?.uid);

    const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
    const [editingGem, setEditingGem] = useState<Gem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newSpaceTitle, setNewSpaceTitle] = useState("");
    const [viewMode, setViewMode] = useState<"gem" | "pulse">("gem"); // Toggle state

    const [uploadingDoc, setUploadingDoc] = useState(false); // Doc State

    const [copiedId, setCopiedId] = useState<string | null>(null);

    // When a space is selected, load its Gem into the editor
    useEffect(() => {
        if (selectedSpaceId) {
            const space = spaces.find(s => s.id === selectedSpaceId);
            if (space) {
                setEditingGem(space.gem);
                setViewMode("gem"); // Reset to gem view on change
            }
        }
    }, [selectedSpaceId, spaces]);

    const handleCreateSpace = async () => {
        if (!newSpaceTitle.trim()) return;
        try {
            await createSpace(newSpaceTitle, "New Analysis Unit");
            setNewSpaceTitle("");
            setIsCreating(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveGem = async () => {
        if (selectedSpaceId && editingGem) {
            await updateGem(selectedSpaceId, editingGem);
            alert("Gem Polished (Saved)!");
        }
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editingGem) return;

        const file = e.target.files[0];
        setUploadingDoc(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/api/parse-doc', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.text) {
                // Append text to Knowledge Base
                const newKb = (editingGem.knowledgeBase || "") + `\n\n=== ATTACHMENT: ${file.name} ===\n` + data.text;
                setEditingGem({ ...editingGem, knowledgeBase: newKb });
                alert("Document processed and attached to Knowledge Base.");
            } else {
                alert("Could not extract text from document.");
            }

        } catch (error) {
            console.error("Upload Error", error);
            alert("Failed to upload document.");
        } finally {
            setUploadingDoc(false);
            // Reset input
            e.target.value = "";
        }
    };

    const copyToClipboard = (spaceId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/space/${spaceId}`;
        navigator.clipboard.writeText(url);
        setCopiedId(spaceId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center font-serif text-foreground/60">Loading Studio...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 space-y-6">
                <h1 className="text-3xl font-serif">Teacher Access Required</h1>
                <p className="text-foreground/60 font-serif italic">Please sign in to access the Space Orchestrator.</p>
                <button
                    onClick={signInWithGoogle}
                    className="px-6 py-2 rounded-full bg-primary text-white hover:opacity-90 transition-all font-serif"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 font-serif">
            <header className="border-b border-muted pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl text-foreground">Space Orchestrator</h1>
                    <p className="text-foreground/60 italic mt-2">
                        Welcome, {user.displayName}. Define the soul of your spaces.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                        + New Space
                    </button>
                    <div className="w-10 h-10 rounded-full bg-foreground/10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {user.photoURL && <img src={user.photoURL} alt="User" />}
                    </div>
                </div>
            </header>

            {/* Creation Modal / Inline Form */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-background p-8 rounded-lg shadow-xl max-w-md w-full border border-muted">
                        <h3 className="text-xl mb-4">Create New Space</h3>
                        <input
                            autoFocus
                            placeholder="E.g., The Great Gatsby - Chapter 1"
                            className="w-full p-3 border border-muted rounded mb-4 bg-transparent outline-none focus:border-primary"
                            value={newSpaceTitle}
                            onChange={e => setNewSpaceTitle(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 hover:bg-muted/50 rounded">Cancel</button>
                            <button onClick={handleCreateSpace} className="px-4 py-2 bg-primary text-white rounded">Create</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar: Space List */}
                <aside className="space-y-4 lg:col-span-1 h-[calc(100vh-200px)] overflow-y-auto pr-2">
                    <h2 className="text-lg font-medium text-foreground/80 mb-4 sticky top-0 bg-background py-2">Your Spaces</h2>
                    {spacesLoading && <div className="text-sm text-foreground/40">Loading spaces...</div>}
                    {spaces.length === 0 && !spacesLoading && (
                        <div className="p-4 border border-dashed border-muted rounded text-center text-sm text-foreground/40">
                            No spaces yet. Create one to begin.
                        </div>
                    )}
                    <div className="space-y-2">
                        {spaces.map(space => (
                            <div
                                key={space.id}
                                onClick={() => setSelectedSpaceId(space.id)}
                                className={`p-4 rounded border cursor-pointer transition-all ${selectedSpaceId === space.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted hover:border-foreground/30 bg-white'}`}
                            >
                                <h3 className="font-medium">{space.title}</h3>
                                <p className="text-xs text-foreground/50 mt-1 truncate">{space.description}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="text-[10px] uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded text-foreground/60">{space.gem.personaName}</span>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <Link href={`/space/${space.id}`} className="text-xs text-primary hover:underline" onClick={e => e.stopPropagation()}>
                                        View Student Link &rarr;
                                    </Link>
                                    <button
                                        onClick={(e) => copyToClipboard(space.id, e)}
                                        className="text-[10px] px-2 py-1 bg-muted/20 hover:bg-muted/40 rounded text-foreground/60 transition-colors"
                                        title="Copy Student Link"
                                    >
                                        {copiedId === space.id ? (
                                            <span className="text-green-600 font-bold">✓ Copied</span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <span>🔗</span> Copy Link
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Center: Tabs + Content */}
                <section className="lg:col-span-3 flex flex-col h-[calc(100vh-200px)]">
                    {!selectedSpaceId ? (
                        <div className="flex-1 border border-muted rounded-lg bg-white shadow-sm flex items-center justify-center text-foreground/30 italic">
                            Select a space from the left to view.
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-4 mb-4 border-b border-muted">
                                <button onClick={() => setViewMode("gem")} className={`pb-2 px-1 ${viewMode === "gem" ? "border-b-2 border-primary font-bold" : "text-foreground/60"}`}>Gem Surface</button>
                                <button onClick={() => setViewMode("pulse")} className={`pb-2 px-1 ${viewMode === "pulse" ? "border-b-2 border-primary font-bold" : "text-foreground/60"}`}>Pulse Report (Synthesis)</button>
                            </div>

                            <div className="flex-1 bg-white border border-muted rounded-lg shadow-sm overflow-hidden flex flex-col">
                                {viewMode === "gem" && editingGem && (
                                    <div className="flex flex-col h-full bg-[#fdfdfb]">
                                        {/* Gem Toolbar */}
                                        <div className="p-4 border-b border-muted flex justify-between items-center bg-gray-50/50">
                                            <div>
                                                <span className="text-xs uppercase tracking-widest text-foreground/40">Editing Gem for</span>
                                                <h2 className="text-xl italic">{spaces.find(s => s.id === selectedSpaceId)?.title}</h2>
                                            </div>
                                            <button onClick={handleSaveGem} className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 shadow-sm transition-all border border-transparent">
                                                Polish (Save)
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                            {/* Persona Identity (2 Cols) */}
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground/70 mb-2 uppercase tracking-wide">Persona Name</label>
                                                    <input
                                                        className="w-full p-3 border border-muted rounded bg-transparent focus:border-primary outline-none"
                                                        value={editingGem.personaName}
                                                        onChange={e => setEditingGem({ ...editingGem, personaName: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-foreground/70 mb-2 uppercase tracking-wide">Opening Line</label>
                                                    <input
                                                        className="w-full p-3 border border-muted rounded bg-transparent focus:border-primary outline-none"
                                                        value={editingGem.openingLine}
                                                        onChange={e => setEditingGem({ ...editingGem, openingLine: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Knowledge Base / Docs (Full Width) */}
                                            <div className="bg-primary/5 p-6 rounded-lg border border-primary/10">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <label className="block text-sm font-bold text-primary uppercase tracking-wide">Knowledge Base (New!)</label>
                                                        <p className="text-xs text-foreground/50">Attach documents for the AI to allow RAG-like capabilities.</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {uploadingDoc && <span className="text-xs text-primary animate-pulse font-bold">Processing PDF...</span>}
                                                        <label className="text-xs font-bold px-4 py-2 bg-white border border-primary/20 hover:bg-primary/10 rounded cursor-pointer transition-colors flex items-center gap-2 shadow-sm text-primary">
                                                            <span>📎</span> Attach PDF/Doc
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.txt,.md"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                                disabled={uploadingDoc}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                                <textarea
                                                    className="w-full p-4 border border-muted rounded bg-white focus:border-primary outline-none transition-all h-32 text-xs font-mono"
                                                    placeholder="Paste text here or attach a document for the AI to consult..."
                                                    value={editingGem.knowledgeBase || ""}
                                                    onChange={e => setEditingGem({ ...editingGem, knowledgeBase: e.target.value })}
                                                />
                                            </div>

                                            {/* System Instructions */}
                                            <div className="flex-1 flex flex-col min-h-[300px]">
                                                <div className="flex justify-between items-end mb-2">
                                                    <label className="block text-sm font-bold text-foreground/70 uppercase tracking-wide">System Instructions (The Soul)</label>
                                                    <span className="text-xs text-foreground/40 italic">Define the constraints and pedagogical approach</span>
                                                </div>
                                                <textarea
                                                    className="flex-1 p-6 border border-muted rounded bg-white shadow-inner focus:border-primary outline-none resize-none leading-relaxed font-mono text-sm"
                                                    value={editingGem.systemInstructions}
                                                    onChange={e => setEditingGem({ ...editingGem, systemInstructions: e.target.value })}
                                                />
                                            </div>

                                            {/* Constraints */}
                                            <div>
                                                <label className="block text-sm font-bold text-foreground/70 mb-2 uppercase tracking-wide">Invariants (Constraints)</label>
                                                <div className="p-4 border border-blue-100 bg-blue-50/30 rounded text-sm text-foreground/70">
                                                    <p className="mb-2 font-bold text-primary">Hard-coded Safety Rails (Active):</p>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        <li>Socratic Default: One logical step at a time.</li>
                                                        <li>Evidence Gate: Must request textual proofs.</li>
                                                        <li>Bridge and Revert: Redirect off-topic chats.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viewMode === "pulse" && (
                                    <PulseView spaceId={selectedSpaceId} gem={spaces.find(s => s.id === selectedSpaceId)?.gem} />
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
