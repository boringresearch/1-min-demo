import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GeminiService } from '../../services/gemini';
import { AppState, GenerationState } from '../../types';
import { Code2, Loader2, Eye, Terminal, AlertTriangle, RefreshCw, Square, PlayCircle, PauseCircle } from 'lucide-react';

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
     <path d="M54 12v40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
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
  onComplete: () => void;
  onBack: () => void;
}

export const StepGeneration: React.FC<Props> = ({ appState, genState, setGenState, onComplete, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);

  const generateCode = useCallback(async (isContinuation = false) => {
    setIsGenerating(true);
    
    if (!isContinuation) {
        setGenState({ error: null, generatedCode: '', isCodeComplete: false, finalHtml: null });
    } else {
        setGenState({ error: null });
    }
    
    abortControllerRef.current = new AbortController();

    const service = new GeminiService(appState.modelName);
    try {
        const history = [
            { role: 'user', parts: [{ text: (await import('../../services/prompts')).STAGE_1_PROMPT(appState.sourceCode, appState.requirements, appState.musicEnabled, appState.textDescriptionEnabled) }] },
            { role: 'model', parts: [{ text: genState.outline }] }
        ];

        let currentText = isContinuation ? genState.generatedCode : "";
        
        await service.generateCodeStream(
            history, 
            (text) => {
                setGenState({ generatedCode: (currentText += text) });
                if (bottomRef.current) {
                    bottomRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            },
            abortControllerRef.current.signal,
            isContinuation ? genState.generatedCode : undefined,
            appState.musicEnabled,
            appState.textDescriptionEnabled
        );

        // Parse the final HTML
        const htmlMatch = currentText.match(/```html([\s\S]*?)```/);
        let finalHtml = htmlMatch ? htmlMatch[1] : null;
        
        if (!finalHtml && currentText.includes('<!DOCTYPE html>')) {
            finalHtml = currentText.substring(currentText.indexOf('<!DOCTYPE html>'));
            if(finalHtml.includes('```')) {
                finalHtml = finalHtml.split('```')[0];
            }
        }

        if (finalHtml) {
            setGenState({ isCodeComplete: true, finalHtml });
        } else {
            // Only mark complete if we finished naturally (not stopped)
            // But here we are in the success block, so it finished naturally
            setGenState({ isCodeComplete: true });
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            return;
        }

        console.error("Code Generation Error:", e);
            let errorMessage = e.message || "An unknown error occurred.";
            
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

        if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
            errorMessage = "The AI model is currently overloaded. Please wait a moment and try again.";
        }

        setGenState({ error: errorMessage });
    } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
    }
  }, [appState.modelName, appState.sourceCode, appState.requirements, appState.musicEnabled, appState.textDescriptionEnabled, genState.outline, genState.generatedCode, setGenState]);

  useEffect(() => {
    if (!hasAutoStartedRef.current && !genState.generatedCode && !genState.error) {
        hasAutoStartedRef.current = true;
        generateCode(false);
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
    generateCode(false);
  };

  const handleContinue = () => {
    generateCode(true);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex gap-6">
      
      {/* Left: Terminal / Log */}
      <div className="flex-1 flex flex-col h-full">
         <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Terminal className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Coding...</h2>
         </div>

         <div className="flex-1 overflow-hidden rounded-xl border border-gray-700 bg-[#1e1e1e] flex flex-col shadow-2xl relative">
            <div className="flex items-center px-4 py-2 border-b border-gray-700 bg-[#252526] shrink-0">
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <div className="ml-4 text-xs text-gray-400 font-mono">gemini-engineer — generate-demo.ts</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                {genState.generatedCode || <span className="animate-pulse">Initializing environment...</span>}
                
                {genState.error && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200">
                        Error: {genState.error}
                    </div>
                )}
                
                <div ref={bottomRef} />
            </div>

            {/* Floating Controls for Code Generation */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 pointer-events-none">
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
                             {genState.generatedCode && !genState.isCodeComplete && (
                                <button 
                                    onClick={handleContinue}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-colors"
                                >
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <TextIcon className="w-4 h-4" />
                                    CONTINUE
                                </button>
                             )}
                             
                             {(genState.generatedCode || genState.error) && (
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
      </div>

      {/* Right: Actions */}
      <div className="w-64 shrink-0 flex flex-col justify-center space-y-4">
        {genState.isCodeComplete ? (
            <div className="space-y-4 animate-in slide-in-from-right duration-500">
                <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-center">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
                        <Code2 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-medium">Code Ready</h3>
                    <p className="text-sm text-green-300/80 mt-1">100% Generated</p>
                </div>
                
                <button 
                    onClick={onComplete}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-lg font-bold transition-all shadow-lg hover:shadow-white/10"
                >
                    <Eye className="w-4 h-4" />
                    Preview Demo
                </button>
            </div>
        ) : (
            <div className="text-center p-6 border border-gray-800 rounded-xl bg-gray-900/50">
                {isGenerating ? (
                    <>
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-sm text-gray-400">Writing HTML, CSS & GSAP animations...</p>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                           <PauseCircle className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-gray-400">Generation Paused</p>
                    </>
                )}
            </div>
        )}
        
        {genState.error && !isGenerating && (
             <button 
                onClick={onBack}
                className="w-full px-4 py-2 border border-gray-700 hover:bg-gray-800 text-gray-400 rounded-lg text-sm transition-colors"
            >
                Return to Input
            </button>
        )}
      </div>

    </div>
  );
};
