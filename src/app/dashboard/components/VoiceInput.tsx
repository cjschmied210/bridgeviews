"use client";

import { useState, useRef, useEffect } from "react";

interface VoiceInputProps {
    onAudioCaptured: (blob: Blob) => void;
    isProcessing: boolean;
}

export function VoiceInput({ onAudioCaptured, isProcessing }: VoiceInputProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                onAudioCaptured(blob);
                chunksRef.current = [];
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop stream
            setIsRecording(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`
                    w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg
                    ${isRecording 
                        ? "bg-red-500 animate-pulse text-white hover:bg-red-600" 
                        : "bg-primary text-white hover:scale-110 active:scale-95"}
                    ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
                `}
                title={isRecording ? "Stop Recording" : "Start Voice Query"}
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isRecording ? (
                    <div className="w-6 h-6 bg-white rounded-sm" /> // Stop Icon
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>
            <span className="text-xs font-serif uppercase tracking-widest text-foreground/40 h-4">
                {isRecording ? "Listening..." : isProcessing ? "Thinking..." : "Tap to Speak"}
            </span>
        </div>
    );
}
