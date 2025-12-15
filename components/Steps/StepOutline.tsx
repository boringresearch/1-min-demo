import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GeminiService } from '../../services/gemini';
import { AppState, GenerationState } from '../../types';
import { Bot, ArrowRight, Edit3, CheckCircle2, Loader2, AlertTriangle, ArrowLeft, RefreshCw, PauseCircle, PlayCircle, Square } from 'lucide-react';

 const TextIcon: React.FC<{ className?: string }> = ({ className }) => (
   <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
     <path
       d="M10 14h34c4.418 0 8 3.582 8 8v20c0 4.418-3.582 8-8 8H10c-4.418 0-8-3.582-8-8V22c0-4.418 3.582-8 8-8Z"
       stroke="currentColor"
       strokeWidth="4"
       strokeLinejoin="round"
     />
     <path
       d="M22 26h12m-6 0v16m-4 0h8"
       stroke="currentColor"
       strokeWidth="4"
       strokeLinecap="round"
       strokeLinejoin="round"
     />
     <path
       d="M54 12v40"
       stroke="currentColor"
       strokeWidth="4"
       strokeLinecap="round"
     />
     <path
       d="M54 12c4 0 8 3 8 8M54 52c4 0 8-3 8-8"
       stroke="currentColor"
       strokeWidth="4"
       strokeLinecap="round"
     />
   </svg>
 );

interface Props {
  appState: AppState;
  genState: GenerationState;
  setGenState: (updates: Partial<GenerationState>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export const StepOutline: React.FC<Props> = ({ appState, genState, setGenState, onConfirm, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);

  const generateOutline = useCallback(async (isContinuation = false) => {
    setIsGenerating(true);
    
    if (!isContinuation) {
        setGenState({ error: null, outline: '', isOutlineComplete: false });
    } else {
        setGenState({ error: null });
    }

    abortControllerRef.current = new AbortController();

    const service = new GeminiService(appState.modelName);
    try {
        let currentText = isContinuation ? genState.outline : "";
        
        await service.generateOutlineStream(
            appState.sourceCode, 
            appState.requirements, 
            (text) => {
                // If it's a chunk, strictly append. 
                // However, our service 'onChunk' sends just the new chunk.
                // But wait, the service implementation above sends 'text' which is the chunk.
                // We need to accumulate it.
                // Actually, the service logic I wrote: fullText += text; onChunk(text);
                // So here we just append the chunk.
                setGenState({ outline: (currentText += text) });
                if (bottomRef.current) {
                    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            },
            abortControllerRef.current.signal,
            isContinuation ? genState.outline : undefined,
            appState.musicEnabled,
            appState.textDescriptionEnabled
        );
        
        setGenState({ isOutlineComplete: true });
    } catch (e: any) {
        if (e.name === 'AbortError') {
            // User manually stopped
            return; 
        }

        console.error("Outline Generation Error:", e);
        let errorMessage = e.message || "An unknown error occurred.";
        
        // Try to parse nested JSON error messages
        try {
            if (errorMessage.includes('{')) {
                const parsed = JSON.parse(errorMessage);
                if (parsed.error) {
                    errorMessage = typeof parsed.error === 'string' ? parsed.error : (parsed.error.message || errorMessage);
                    try {
                        const inner = JSON.parse(errorMessage);
                        if (inner.error && inner.error.message) errorMessage = inner.error.message;
                    } catch {}
                }
            }
        } catch {}

        if (errorMessage.includes("404") && errorMessage.includes("not found")) {
            errorMessage = `Model '${appState.modelName}' was not found or is not available. Please check the model name in Advanced Settings.`;
        }
        
        if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
            errorMessage = "The AI model is currently overloaded. Please wait a moment and try again.";
        }

        setGenState({ error: errorMessage });
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  }, [appState.modelName, appState.sourceCode, appState.requirements, appState.musicEnabled, appState.textDescriptionEnabled, setGenState, genState.outline]);

  useEffect(() => {
    if (!hasAutoStartedRef.current && !genState.outline && !genState.error) {
        hasAutoStartedRef.current = true;
        generateOutline(false);
    }
    
    return () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsGenerating(false);
    }
  };

  const handleRestart = () => {
     generateOutline(false);
  };

  const handleContinue = () => {
     generateOutline(true);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
       <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Bot className="w-5 h-5 text-orange-400" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-white">Review Demo Storyboard</h2>
                <p className="text-xs text-gray-400">Gemini is designing the scene flow based on your code.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>
            {genState.isOutlineComplete && (
                <button
                    onClick={onConfirm}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all animate-in fade-in"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Generate Code
                </button>
            )}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl p-6 font-mono text-sm shadow-inner relative group">
            {genState.outline ? (
                <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-blue-400 prose-strong:text-white pb-20">
                    <ReactMarkdown>{genState.outline}</ReactMarkdown>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500 gap-2">
                    {isGenerating && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{isGenerating ? "Thinking..." : "Ready to generate"}</span>
                </div>
            )}
            
            {/* Error Display */}
            {genState.error && (
                <div className="my-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-200 text-center">
                    <p className="flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {genState.error}
                    </p>
                </div>
            )}

            <div ref={bottomRef} />

            {/* Floating Control Bar */}
            <div className="sticky bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
                <div className="bg-gray-800/90 backdrop-blur border border-gray-600 rounded-full p-1.5 shadow-2xl flex items-center gap-2 pointer-events-auto">
                    {isGenerating ? (
                        <button 
                            onClick={handleStop}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full text-xs font-bold transition-colors"
                        >
                            <Square className="w-3 h-3 fill-current" />
                            STOP
                        </button>
                    ) : (
                        <>
                             {genState.outline && !genState.isOutlineComplete && (
                                <button 
                                    onClick={handleContinue}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-colors"
                                >
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <TextIcon className="w-4 h-4" />
                                    CONTINUE
                                </button>
                             )}
                             
                             {(genState.outline || genState.error) && (
                                <button 
                                    onClick={handleRestart}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-xs font-bold transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    RESTART
                                </button>
                             )}
                        </>
                    )}
                </div>
            </div>
       </div>

       <div className="mt-4 shrink-0 bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex gap-3 text-sm text-gray-400">
            <Edit3 className="w-4 h-4 mt-0.5" />
            <p>
                If the outline isn't perfect, you can retry or verify it covers the key steps. 
                The actual code generation in the next step will strictly follow this plan.
            </p>
       </div>
    </div>
  );
};
