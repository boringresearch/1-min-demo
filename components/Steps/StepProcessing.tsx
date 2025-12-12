
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GeminiService } from '../../services/gemini';
import { AppState, GenerationState } from '../../types';
import { Save, Terminal as TerminalIcon, AlertTriangle } from 'lucide-react';

interface Props {
  appState: AppState;
  genState: GenerationState;
  setGenState: (updates: Partial<GenerationState>) => void;
  onComplete: () => void;
  isPaused: boolean;
}

export const StepProcessing: React.FC<Props> = ({ appState, genState, setGenState, onComplete, isPaused }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  
  // For the interactive prompt
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
      console.log(`[Terminal] ${msg}`);
      setLogs(prev => [...prev, msg]);
  };

  // 1. Initial Start: Generate Outline
  const startOutlineGeneration = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setGenState({ stage: 'generating_outline', error: null, outline: '' });
    addLog("root@gemini:~/demo# ./generate_demo.sh --verbose");
    addLog("> Initializing AI Agent...");
    addLog(`> Model: ${appState.modelName}`);
    addLog("> Reading source code & requirements...");
    
    // Debug log
    console.log("Starting generation with:", { 
        model: appState.modelName, 
        codeLength: appState.sourceCode.length,
        reqs: appState.requirements 
    });

    const service = new GeminiService(appState.modelName);
    abortControllerRef.current = new AbortController();

    try {
        addLog("> Generating Storyboard & Outline...");
        let outlineText = "";
        
        await service.generateOutlineStream(
            appState.sourceCode,
            appState.requirements,
            (chunk) => {
                outlineText += chunk;
                // Important: Update state efficiently. We don't want to re-render the whole log list on every char
                setGenState({ outline: outlineText });
            },
            abortControllerRef.current.signal,
            undefined,
            appState.musicEnabled
        );

        setGenState({ isOutlineComplete: true, stage: 'waiting_confirmation' });
        addLog("> Outline generated successfully.");
        console.log("Outline complete:", outlineText);
        // We do NOT proceed automatically. We wait for user input.
        
    } catch (e: any) {
        if (e.name === 'AbortError') {
            addLog("> Process aborted.");
            return;
        }
        setGenState({ error: e.message || "Unknown error" });
        addLog(`! ERROR: ${e.message}`);
        console.error("Gemini Error:", e);
    }
  }, [appState, setGenState]);

  // 2. Code Generation (called after confirmation)
  const startCodeGeneration = useCallback(async () => {
    setGenState({ stage: 'generating_code', generatedCode: '' });
    addLog("> Confirmed. Starting Code Synthesis...");
    
    const service = new GeminiService(appState.modelName);
    abortControllerRef.current = new AbortController();

    try {
        const history = [
            { role: 'user', parts: [{ text: (await import('../../services/prompts')).STAGE_1_PROMPT(appState.sourceCode, appState.requirements, appState.musicEnabled) }] },
            { role: 'model', parts: [{ text: genState.outline }] }
        ];

        console.log("Starting Code Generation with History:", history);

        let codeText = "";
        await service.generateCodeStream(
            history,
            (chunk) => {
                codeText += chunk;
                setGenState({ generatedCode: codeText });
            },
            abortControllerRef.current.signal,
            undefined,
            appState.musicEnabled
        );

        addLog("> Parsing generated artifacts...");
        const htmlMatch = codeText.match(/```html([\s\S]*?)```/);
        let finalHtml = htmlMatch ? htmlMatch[1] : null;
        
        if (!finalHtml && codeText.includes('<!DOCTYPE html>')) {
            finalHtml = codeText.substring(codeText.indexOf('<!DOCTYPE html>'));
            if(finalHtml.includes('```')) finalHtml = finalHtml.split('```')[0];
        }

        if (finalHtml) {
            setGenState({ isCodeComplete: true, finalHtml, stage: 'complete' });
            addLog("> Build successful. Asset ready.");
            console.log("Code Generation Complete. Final HTML Length:", finalHtml.length);
            setTimeout(onComplete, 1500);
        } else {
            console.warn("Failed to find HTML in output:", codeText);
            throw new Error("Failed to extract valid HTML from response.");
        }

    } catch (e: any) {
        if (e.name === 'AbortError') return;
        setGenState({ error: e.message });
        addLog(`! ERROR: ${e.message}`);
        console.error("Code Gen Error:", e);
    }
  }, [appState, genState.outline, setGenState, onComplete]);


  // Effect: Start on mount
  useEffect(() => {
    if (!isPaused && !genState.error && genState.stage === 'idle') {
        startOutlineGeneration();
    }
  }, [isPaused, startOutlineGeneration, genState.stage, genState.error]);

  // Effect: Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, genState.outline, genState.generatedCode, genState.stage]);

  // Effect: Keyboard Listener for Confirmation
  useEffect(() => {
    if (genState.stage === 'waiting_confirmation') {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'y' || e.key === 'Enter') {
                e.preventDefault();
                startCodeGeneration();
            } else if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setGenState({ stage: 'editing_outline' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        // Focus hidden input to ensure we capture keys if clicked away
        inputRef.current?.focus();
        return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [genState.stage, startCodeGeneration, setGenState]);

  // VIM Editor View
  if (genState.stage === 'editing_outline') {
      return (
          <div className="flex flex-col h-full w-full bg-[#1e1e1e] font-mono text-sm animate-in fade-in duration-300">
              <div className="bg-[#007acc] text-white px-4 py-1 flex justify-between items-center text-xs shrink-0">
                  <span>GNU nano 6.2</span>
                  <span>outline.md</span>
                  <span>Modified</span>
              </div>
              <textarea 
                className="flex-1 bg-[#1e1e1e] text-white p-4 outline-none resize-none leading-relaxed font-mono"
                value={genState.outline}
                onChange={(e) => setGenState({ outline: e.target.value })}
                spellCheck={false}
              />
              <div className="bg-[#2d2d2d] text-white px-4 py-2 flex justify-between items-center text-xs border-t border-gray-700 shrink-0">
                  <div className="flex gap-4 opacity-70">
                      <span>^G Get Help</span>
                      <span className="font-bold">^O Write Out</span>
                  </div>
                  <button 
                    onClick={startCodeGeneration}
                    className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded hover:bg-gray-200 font-bold transition-colors text-xs uppercase tracking-wide"
                  >
                      <Save className="w-3 h-3" />
                      Save & Confirm (Y)
                  </button>
              </div>
          </div>
      )
  }

  // Standard Terminal View
  return (
    <div className="flex flex-col h-full w-full bg-black/95 p-6 font-mono text-xs relative overflow-hidden group" onClick={() => inputRef.current?.focus()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4 shrink-0 opacity-50">
             <TerminalIcon className="w-4 h-4" />
             <span>root@gemini-engine:~</span>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto space-y-1 text-gray-300 pb-10" ref={scrollRef}>
            {logs.map((log, i) => (
                <div key={i} className={`${log.startsWith('!') ? 'text-red-400' : log.startsWith('>') ? 'text-blue-400' : 'text-gray-400'}`}>
                    {log}
                </div>
            ))}

            {/* Stage: Generating Outline (Stream) */}
            {genState.stage === 'generating_outline' && genState.outline && (
                <div className="text-gray-500 mt-2 whitespace-pre-wrap opacity-80 pl-4 border-l-2 border-gray-800">
                    {genState.outline}
                    <span className="animate-pulse">_</span>
                </div>
            )}

            {/* Stage: Waiting Confirmation */}
            {genState.stage === 'waiting_confirmation' && (
                <div className="mt-8 mb-4">
                     <div className="text-gray-500 whitespace-pre-wrap pl-4 border-l-2 border-green-500/50 mb-6">
                        {genState.outline}
                    </div>
                    <div className="text-white font-bold animate-pulse text-sm bg-blue-900/20 p-2 inline-block rounded border border-blue-500/30">
                        root@gemini:~/demo# Outline generated. Proceed to Code Generation? [Y/n] <span className="inline-block w-2 h-4 bg-gray-500 align-middle ml-1"></span>
                    </div>
                    <div className="text-gray-600 mt-2 text-[10px] uppercase tracking-wider">
                        Press 'Y' to confirm, 'N' to edit manually
                    </div>
                </div>
            )}

            {/* Stage: Generating Code (Stream) */}
            {genState.stage === 'generating_code' && genState.generatedCode && (
                <div className="mt-4 pt-4 border-t border-white/10 opacity-80">
                    <div className="text-green-500 mb-2 font-bold">// Synthesizing Frontend Code...</div>
                    <div className="text-[10px] leading-tight text-gray-400 break-all font-mono pl-4 border-l-2 border-green-500/30">
                        {genState.generatedCode}
                        <span className="animate-pulse inline-block w-2 h-4 bg-green-500 align-middle ml-1"></span>
                    </div>
                </div>
            )}
            
            {/* Error State */}
            {genState.error && (
                <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded flex items-center gap-3 text-red-300">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                        <div className="font-bold">Execution Failed</div>
                        <div>{genState.error}</div>
                    </div>
                </div>
            )}

            {/* Hidden Input to capture focus for keyboard events */}
            <input ref={inputRef} className="opacity-0 absolute top-0 left-0 w-1 h-1 pointer-events-none" />
        </div>
    </div>
  );
};
