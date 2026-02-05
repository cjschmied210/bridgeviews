import { Gem } from "@/types";
import { useState } from "react";
import { VoiceInput } from "./VoiceInput";
import { useAnalyst } from "@/hooks/useAnalyst";
import { Timestamp } from "firebase/firestore";

function TranscriptModal({ spaceId, userId, onClose, studentName }: { spaceId: string, userId: string, onClose: () => void, studentName: string }) {
    const { interactions, loading } = useAnalyst(spaceId, userId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col border border-muted animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-muted flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div>
                        <h3 className="text-lg font-bold font-serif">{studentName}</h3>
                        <p className="text-xs text-foreground/50 uppercase tracking-widest">Live Transcript Inspection</p>
                    </div>
                    <button onClick={onClose} className="px-3 py-1 bg-white border border-muted rounded hover:bg-muted/10 text-sm font-bold shadow-sm">
                        ESC
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fdfdfb]">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        </div>
                    ) : interactions.length === 0 ? (
                        <div className="text-center italic text-foreground/40 mt-10">No interactions found for this student.</div>
                    ) : (
                        interactions.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary/10 text-foreground border border-primary/20 rounded-tr-none' : 'bg-white border border-muted rounded-tl-none'
                                    }`}>
                                    <p>{msg.content}</p>
                                    <span className="text-[10px] text-foreground/30 block mt-1 text-right">
                                        {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export function PulseView({ spaceId, gem }: { spaceId: string, gem?: Gem }) {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Voice State
    const [voiceProcessing, setVoiceProcessing] = useState(false);
    const [voiceResponse, setVoiceResponse] = useState<string | null>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<'synthesis' | 'roster'>('synthesis');

    // Transcript Inspection State
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState<string>("");

    const generateReport = async () => {
        if (!gem) return;
        setLoading(true);
        try {
            const res = await fetch('/api/synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spaceId, gem })
            });
            const data = await res.json();
            setReport(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVoiceCapture = async (blob: Blob) => {
        if (!gem) return;
        setVoiceProcessing(true);
        setVoiceResponse(null);

        const formData = new FormData();
        formData.append("audio", blob);
        formData.append("spaceId", spaceId);
        formData.append("gem", JSON.stringify(gem));

        try {
            const res = await fetch('/api/synthesis/voice', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.text) {
                setVoiceResponse(data.text);

                // Browser Text-to-Speech
                if ('speechSynthesis' in window) {
                    const synth = window.speechSynthesis;
                    const utterance = new SpeechSynthesisUtterance(data.text);

                    // VOICE SELECTION LOGIC
                    // We need to wait for voices to load (async in some browsers)
                    let voices = synth.getVoices();

                    const setVoice = () => {
                        voices = synth.getVoices();
                        // Priority list for "Natural" sounding English voices
                        const preferredVoice = voices.find(v =>
                            (v.name.includes("Google US English")) ||
                            (v.name.includes("Natural") && v.lang.includes("en")) ||
                            (v.name.includes("Samantha")) // MacOS premium default
                        );

                        if (preferredVoice) {
                            utterance.voice = preferredVoice;
                            // Lower pitch/rate slightly for gravitas
                            utterance.rate = 1.0;
                            utterance.pitch = 0.95;
                        } else {
                            // Fallback to first English voice
                            const enVoice = voices.find(v => v.lang.includes("en"));
                            if (enVoice) utterance.voice = enVoice;
                        }

                        synth.speak(utterance);
                    };

                    if (voices.length === 0) {
                        synth.onvoiceschanged = setVoice;
                    } else {
                        setVoice();
                    }
                }
            }
        } catch (error) {
            console.error("Voice Error", error);
        } finally {
            setVoiceProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <p className="text-foreground/60 font-serif italic">Synthesizing classroom insights...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-serif">
                    ?
                </div>
                <div className="text-center max-w-md">
                    <h3 className="text-xl font-serif mb-2">Ready to take the Pulse?</h3>
                    <p className="text-foreground/60 italic text-sm">
                        The Synthesis Agent will analyze all recent student interactions to identify common misconceptions, emotional trends, and engagement levels.
                    </p>
                </div>
                <button
                    onClick={generateReport}
                    className="px-8 py-3 bg-primary text-white rounded-full font-serif shadow-lg hover:bg-primary/90 transition-all transform hover:scale-105"
                >
                    Generate Pulse Report
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfb] font-serif relative">
            {/* Transcript Modal */}
            {selectedStudentId && (
                <TranscriptModal
                    spaceId={spaceId}
                    userId={selectedStudentId}
                    studentName={selectedStudentName}
                    onClose={() => setSelectedStudentId(null)}
                />
            )}

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center pb-4">
                    <span className="text-xs uppercase tracking-widest text-foreground/40 block mb-2">Bridgeviews Synthesis Agent</span>
                    <h2 className="text-3xl italic text-foreground">Classroom Pulse Report</h2>
                    <p className="text-sm text-foreground/40 mt-2">{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</p>
                </div>

                {/* Sub-Tabs for Pulse View */}
                <div className="flex justify-center border-b border-muted">
                    <button
                        onClick={() => setActiveTab('synthesis')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'synthesis' ? 'border-primary text-primary' : 'border-transparent text-foreground/40 hover:text-foreground/60'}`}
                    >
                        Bird's Eye Synthesis
                    </button>
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'roster' ? 'border-primary text-primary' : 'border-transparent text-foreground/40 hover:text-foreground/60'}`}
                    >
                        Student Roster
                    </button>
                </div>

                {/* TAB 1: SYNTHESIS (Bird's Eye) */}
                {activeTab === 'synthesis' && (
                    <div className="space-y-12 animate-in fade-in zoom-in duration-300">
                        {/* Main Insight */}
                        <section>
                            <h3 className="text-sm font-bold text-foreground/30 uppercase tracking-widest mb-4">The Vibe</h3>
                            <p className="text-xl leading-relaxed text-foreground/80">
                                {report.summary}
                            </p>
                        </section>

                        {/* Grid of details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 bg-red-50/50 border border-red-100 rounded-lg">
                                <h4 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                                    <span>⚠️</span> Top Misconception
                                </h4>
                                <p className="text-foreground/70">{report.top_misconception}</p>
                            </div>

                            <div className="p-6 bg-green-50/50 border border-green-100 rounded-lg">
                                <h4 className="text-green-800 font-bold mb-2 flex items-center gap-2">
                                    <span>📢</span> Suggested Intervention
                                </h4>
                                <p className="text-foreground/70">{report.suggested_intervention}</p>
                                <button className="mt-4 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full hover:bg-green-200">
                                    Broadcast to Class
                                </button>
                            </div>
                        </div>

                        {/* Shoutouts */}
                        <section className="bg-muted/10 p-6 rounded-lg border border-muted/50">
                            <h3 className="text-sm font-bold text-foreground/30 uppercase tracking-widest mb-4">Notable Breakthroughs</h3>
                            <ul className="space-y-2">
                                {report.shoutouts?.map((shout: string, i: number) => (
                                    <li key={i} className="flex gap-2 items-start">
                                        <span className="text-primary mt-1">✦</span>
                                        <span className="text-foreground/70">{shout}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* Voice Interrogation Zone (Kept here for Synthesis) */}
                        <section className="border-t border-muted pt-8 mt-12 mb-12">
                            <h3 className="text-sm font-bold text-foreground/30 uppercase tracking-widest mb-6 text-center">
                                Discuss with Synthesis Agent
                            </h3>

                            <div className="flex flex-col items-center gap-6">
                                <VoiceInput onAudioCaptured={handleVoiceCapture} isProcessing={voiceProcessing} />

                                {voiceResponse && (
                                    <div className="max-w-xl w-full mx-auto bg-primary/5 p-6 rounded-2xl border border-primary/10 relative">
                                        <span className="absolute -top-3 left-6 px-2 bg-[#fdfdfb] text-xs text-primary font-bold">AGENT RESPONSE</span>
                                        <p className="text-lg leading-relaxed italic">
                                            "{voiceResponse}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB 2: ROSTER (Itemized) */}
                {activeTab === 'roster' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {report.student_breakdown ? (
                            <section>
                                {/* <h3 className="text-sm font-bold text-foreground/30 uppercase tracking-widest mb-4">Live Student Roster</h3> */}
                                <div className="grid grid-cols-1 gap-4">
                                    {report.student_breakdown.map((s: any, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                if (s.user_id) {
                                                    setSelectedStudentId(s.user_id);
                                                    setSelectedStudentName(s.name);
                                                }
                                            }}
                                            className="p-4 border border-muted rounded flex items-start gap-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className={`w-3 h-3 rounded-full mt-2 translate-y-0.5 shrink-0 ${s.status === 'On Track' ? 'bg-green-500' :
                                                s.status === 'Stuck' ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                                                }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-lg text-foreground/90 group-hover:text-primary transition-colors">{s.name}</h4>
                                                        {s.needs_help && <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Needs Support</span>}
                                                    </div>
                                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${s.status === 'On Track' ? 'text-green-700 bg-green-50' :
                                                            s.status === 'Stuck' ? 'text-red-700 bg-red-50' : 'text-gray-500 bg-gray-100'
                                                        }`}>{s.status}</span>
                                                </div>
                                                <div className="mt-3 p-3 bg-muted/10 rounded-lg text-sm text-foreground/70 italic border-l-2 border-primary/30 group-hover:bg-primary/5 transition-colors">
                                                    "{s.last_thought}"
                                                    <span className="text-[10px] text-primary font-bold block text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View Transcript &rarr;</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <div className="text-center py-12 text-foreground/40 italic border border-dashed border-muted rounded-lg">
                                No individual student data available in this report.
                            </div>
                        )}
                    </div>
                )}

                <div className="text-center pt-8">
                    <button onClick={() => setReport(null)} className="text-xs text-foreground/40 hover:text-foreground underline">
                        Clear Report
                    </button>
                </div>
            </div>
        </div>
    );
}
