'use client';

import { useEffect, useRef, useState } from 'react';
import {
    BookOpen,
    Camera,
    FileImage,
    Loader2,
    Mic,
    RefreshCw,
    Send,
    Sparkles,
    Square,
    TriangleAlert,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type ResponseView = 'text' | 'visual';

interface AssistantReply {
    response: string | null;
    error: string | null;
    fallback: boolean;
    retryable: boolean;
    cached: boolean;
    sources: string[];
    steps: string[];
    conceptExplanation: string | null;
    extractedText: string | null;
    relatedPractice: Array<{ id: string; question: string; difficulty: string | null }>;
    mode: 'query' | 'scan';
}

interface QueryPayload {
    query: string;
    subject: string;
    imageFile?: File | null;
}

interface SpeechResult {
    transcript: string;
}

interface SpeechEventLike {
    results: ArrayLike<ArrayLike<SpeechResult>>;
}

interface BrowserSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechEventLike) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

interface BrowserSpeechRecognitionConstructor {
    new (): BrowserSpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    }
}

const EMPTY_REPLY: AssistantReply = {
    response: null,
    error: null,
    fallback: false,
    retryable: false,
    cached: false,
    sources: [],
    steps: [],
    conceptExplanation: null,
    extractedText: null,
    relatedPractice: [],
    mode: 'query',
};

function getSubjectClass(color: string, active: boolean) {
    if (!active) return 'bg-white/5 text-slate-400 hover:bg-white/10';
    if (color === 'blue') return 'bg-blue-500 text-white shadow-lg shadow-blue-500/20';
    if (color === 'emerald') return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
    if (color === 'amber') return 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
    if (color === 'red') return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
    return 'bg-violet-500 text-white shadow-lg shadow-violet-500/20';
}

function splitIntoSteps(text: string) {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 4);
}

export function AIQuerySystem() {
    const { isAuthenticated } = useAuth();
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('general');
    const [isLoading, setIsLoading] = useState(false);
    const [reply, setReply] = useState<AssistantReply>(EMPTY_REPLY);
    const [lastPayload, setLastPayload] = useState<QueryPayload | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
    const [responseView, setResponseView] = useState<ResponseView>('text');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const responseRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const voiceSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

    const clearAttachment = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setSelectedFile(null);
        setSelectedPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const setAttachment = (file: File | null) => {
        clearAttachment();
        if (!file) return;
        previewUrlRef.current = URL.createObjectURL(file);
        setSelectedFile(file);
        setSelectedPreview(previewUrlRef.current);
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsCameraOpen(false);
    };

    const stopSpeaking = () => {
        if (!speechSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    const submitQuery = async (payload: QueryPayload) => {
        setIsLoading(true);
        setReply(EMPTY_REPLY);
        setLastPayload(payload);
        setResponseView('text');

        try {
            if (payload.imageFile) {
                const formData = new FormData();
                formData.append('question', payload.query);
                formData.append('description', payload.query);
                formData.append('subject', payload.subject);
                formData.append('topic', payload.subject);
                formData.append('image', payload.imageFile);

                const res = await fetch('/api/ai/doubt-solver', { method: 'POST', body: formData });
                const data = await res.json().catch(() => ({}));
                if (!res.ok || !data.success) {
                    throw new Error(typeof data.error === 'string' ? data.error : 'SaviTech AI could not analyze the scanned page.');
                }

                const payloadData = (data.data || {}) as Record<string, unknown>;
                const answer = typeof payloadData.answer === 'string' ? payloadData.answer : null;
                if (!answer) throw new Error('No scanned answer was returned.');

                setReply({
                    response: [answer, typeof payloadData.conceptExplanation === 'string' ? `Concept: ${payloadData.conceptExplanation}` : null].filter(Boolean).join('\n\n'),
                    error: null,
                    fallback: false,
                    retryable: true,
                    cached: false,
                    sources: ['AI page scan', 'Question image analysis'],
                    steps: Array.isArray(payloadData.steps) ? payloadData.steps.filter((step): step is string => typeof step === 'string') : [],
                    conceptExplanation: typeof payloadData.conceptExplanation === 'string' ? payloadData.conceptExplanation : null,
                    extractedText: typeof payloadData.extractedText === 'string' ? payloadData.extractedText : null,
                    relatedPractice: Array.isArray(payloadData.relatedPractice)
                        ? payloadData.relatedPractice
                            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
                            .map((item) => ({
                                id: String(item.id || ''),
                                question: String(item.question || 'Practice question'),
                                difficulty: typeof item.difficulty === 'string' ? item.difficulty : null,
                            }))
                        : [],
                    mode: 'scan',
                });
                return;
            }

            const res = await fetch('/api/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: payload.query, subject: payload.subject }),
            });
            const data = await res.json().catch(() => ({}));
            const response = typeof data.response === 'string' ? data.response : typeof data.fallbackMessage === 'string' ? data.fallbackMessage : null;
            if (!response) {
                throw new Error(typeof data.error === 'string' ? data.error : 'SaviTech AI could not respond right now.');
            }

            setReply({
                response,
                error: res.ok ? null : typeof data.error === 'string' ? data.error : null,
                fallback: Boolean(data.fallback),
                retryable: Boolean(data.retryable || data.fallback || !res.ok),
                cached: Boolean(data.cached),
                sources: Array.isArray(data.sources) ? data.sources.filter((source: unknown): source is string => typeof source === 'string') : [],
                steps: splitIntoSteps(response),
                conceptExplanation: null,
                extractedText: null,
                relatedPractice: [],
                mode: 'query',
            });
        } catch (error) {
            setReply({
                ...EMPTY_REPLY,
                error: error instanceof Error ? error.message : 'SaviTech AI could not respond right now.',
                retryable: true,
                mode: payload.imageFile ? 'scan' : 'query',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const normalizedQuery = query.trim();
        if ((!normalizedQuery && !selectedFile) || isLoading) return;

        await submitQuery({
            query: normalizedQuery || 'Solve this question from the scanned page.',
            subject,
            imageFile: selectedFile,
        });
    };

    const handleRetry = async () => {
        if (!lastPayload || isLoading) return;
        await submitQuery(lastPayload);
    };

    const openCamera = async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setCameraError('Back camera scanning is not supported on this device.');
            return;
        }

        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
            streamRef.current = stream;
            setIsCameraOpen(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => undefined);
            }
        } catch (error) {
            console.error('Failed to open camera:', error);
            setCameraError('Camera access was denied or is unavailable.');
            stopCamera();
        }
    };

    const captureFromCamera = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const context = canvas.getContext('2d');

        if (!context) {
            setCameraError('Image capture is not supported in this browser.');
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) {
            setCameraError('Failed to capture the selected page.');
            return;
        }

        setAttachment(new File([blob], `savitech-page-scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        stopCamera();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setCameraError('Please upload a valid image file.');
            return;
        }
        setCameraError(null);
        setAttachment(file);
    };

    const startListening = () => {
        if (!voiceSupported) {
            setVoiceError('Voice input is not supported in this browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!RecognitionCtor) return;

        const recognition = new RecognitionCtor();
        recognition.lang = 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .flatMap((result) => Array.from(result))
                .map((result) => result.transcript)
                .join(' ')
                .trim();

            if (transcript) {
                setQuery((current) => current.trim() ? `${current.trim()} ${transcript}` : transcript);
            }
        };
        recognition.onerror = (event) => {
            setVoiceError(event.error ? `Voice input error: ${event.error}.` : 'Voice input could not start.');
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        setVoiceError(null);
        setIsListening(true);
        recognition.start();
    };

    const speakAnswer = () => {
        if (!speechSupported || !reply.response) return;

        stopSpeaking();
        const utterance = new SpeechSynthesisUtterance(
            [reply.response, reply.steps.join('. '), reply.conceptExplanation].filter(Boolean).join('. ')
        );
        utterance.lang = 'en-IN';
        utterance.rate = 0.97;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    useEffect(() => {
        if ((reply.response || reply.error) && responseRef.current) {
            responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [reply]);

    useEffect(() => (
        () => {
            recognitionRef.current?.stop();
            stopCamera();
            stopSpeaking();
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        }
    ), []);

    const visualSteps = reply.steps.length > 0 ? reply.steps : splitIntoSteps(reply.response || '');

    return (
        <div className="mx-auto mt-12 w-full max-w-4xl px-4 sm:px-0">
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md sm:p-6">
                <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary-500/20 blur-3xl" />

                <div className="relative z-10">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/20">
                                <Sparkles className="h-6 w-6 animate-pulse text-primary-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Ask SaviTech AI</h3>
                                <p className="text-sm text-slate-400">Type your question or scan with camera for instant answers.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                            {isAuthenticated
                                ? 'Signed-in scans can also be saved into doubt history.'
                                : 'Public mode is active. Sign in if you want scanned doubts saved to your account.'}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="space-y-3">
                            <div className="relative">
                                <textarea
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Ask any question or scan a handwritten page with the back camera."
                                    className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/5 py-4 pl-4 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                                    disabled={isLoading}
                                    maxLength={800}
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading || (!query.trim() && !selectedFile)}
                                    className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-900 shadow-xl transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Send AI query"
                                >
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={startListening}
                                    className={cn(
                                        'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                                        isListening
                                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                                            : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                                    )}
                                >
                                    {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    {isListening ? 'Stop listening' : 'Speak question'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void openCamera()}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    <Camera className="h-4 w-4" />
                                    Scan with back camera
                                </button>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                >
                                    <FileImage className="h-4 w-4" />
                                    Upload question image
                                </button>

                                {selectedFile ? (
                                    <button
                                        type="button"
                                        onClick={clearAttachment}
                                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/15"
                                    >
                                        <X className="h-4 w-4" />
                                        Remove scan
                                    </button>
                                ) : null}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Answers can be read as text, played as audio, or shown as a visual explanation board.</span>
                                <span>{query.trim().length}/800</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                            {selectedPreview ? (
                                <img src={selectedPreview} alt="Selected page scan" className="h-40 w-full rounded-2xl object-cover" />
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-slate-500">
                                    Back camera scans and uploaded pages appear here.
                                </div>
                            )}

                            <div className="mt-3 rounded-2xl bg-white/5 p-3 text-xs text-slate-300">
                                {selectedFile
                                    ? `Ready to solve from ${selectedFile.name}. Submit to get text, audio, and visual explanations.`
                                    : 'Tip: keep the selected question centered and well lit before capture.'}
                            </div>
                        </div>
                    </form>

                    {(voiceError || cameraError) ? (
                        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {voiceError || cameraError}
                        </div>
                    ) : null}

                    {isCameraOpen ? (
                        <div className="mt-6 rounded-3xl border border-sky-400/20 bg-slate-950/60 p-4">
                            <div className="flex flex-col gap-4 lg:flex-row">
                                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                                    <video ref={videoRef} autoPlay muted playsInline className="h-72 w-full object-cover lg:w-[420px]" />
                                </div>
                                <div className="flex flex-1 flex-col justify-between gap-4">
                                    <div>
                                        <h4 className="text-lg font-semibold text-white">Back camera page scan</h4>
                                        <p className="mt-2 text-sm text-slate-300">Point the rear camera at the selected handwritten or printed question page, then capture once it is sharp.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void captureFromCamera()}
                                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-300"
                                        >
                                            <Camera className="h-4 w-4" />
                                            Capture page
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                                        >
                                            <X className="h-4 w-4" />
                                            Close camera
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    ) : null}

                    {(reply.response || reply.error) ? (
                        <div
                            ref={responseRef}
                            aria-live="polite"
                            className={cn(
                                'mt-6 rounded-2xl border p-5 transition-all',
                                reply.error && !reply.response
                                    ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                    : 'border-white/10 bg-white/5 text-slate-200'
                            )}
                        >
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                        {reply.fallback ? <TriangleAlert className="h-4 w-4 text-amber-300" /> : <BookOpen className="h-4 w-4 text-primary-400" />}
                                        {reply.mode === 'scan' ? 'Scanned solution' : reply.fallback ? 'Fallback guidance' : 'Faculty response'}
                                    </div>
                                    {reply.cached ? (
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                            Cached
                                        </span>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setResponseView('text')}
                                        className={cn(
                                            'rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                                            responseView === 'text' ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                        )}
                                    >
                                        Text answer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResponseView('visual')}
                                        className={cn(
                                            'rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                                            responseView === 'visual' ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                                        )}
                                    >
                                        Visual board
                                    </button>
                                    {speechSupported ? (
                                        <button
                                            type="button"
                                            onClick={isSpeaking ? stopSpeaking : speakAnswer}
                                            disabled={!reply.response}
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                            {isSpeaking ? 'Stop audio' : 'Play audio'}
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {responseView === 'text' ? (
                                <div className="space-y-4">
                                    <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">{reply.response || reply.error}</p>

                                    {reply.steps.length > 0 ? (
                                        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                                            <p className="text-sm font-semibold text-white">Step-by-step solution</p>
                                            <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                                {reply.steps.map((step, index) => (
                                                    <li key={`${step}-${index}`} className="flex gap-3">
                                                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-200">
                                                            {index + 1}
                                                        </span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {reply.conceptExplanation ? (
                                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
                                            <p className="text-sm font-semibold text-emerald-100">Concept explanation</p>
                                            <p className="mt-2 text-sm text-emerald-50">{reply.conceptExplanation}</p>
                                        </div>
                                    ) : null}

                                    {reply.extractedText ? (
                                        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
                                            <p className="text-sm font-semibold text-amber-100">OCR / page readback</p>
                                            <p className="mt-2 text-sm text-amber-50">{reply.extractedText}</p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-sky-200/25 bg-slate-950/80 p-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{reply.mode === 'scan' ? 'Scanned question flow' : 'Concept explanation flow'}</p>
                                            <p className="text-xs text-slate-400">Visual solution board</p>
                                        </div>
                                        <Sparkles className="h-5 w-5 text-sky-300" />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {visualSteps.map((step, index) => (
                                            <div key={`${step}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-sky-400 text-sm font-bold text-slate-950">
                                                    {index + 1}
                                                </div>
                                                <p className="text-sm text-slate-200">{step}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-4 text-xs text-slate-400">Visual mode converts the answer into an image-style step board for faster revision.</p>
                                </div>
                            )}

                            {reply.sources.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {reply.sources.map((source) => (
                                        <span key={source} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            {reply.relatedPractice.length > 0 ? (
                                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                    {reply.relatedPractice.map((practice) => (
                                        <div key={practice.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                            <p className="text-sm font-semibold text-white">{practice.question}</p>
                                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-sky-200">{practice.difficulty || 'mixed'} practice</p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {reply.retryable ? (
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    disabled={isLoading}
                                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                                    Retry
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
