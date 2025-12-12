
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStep, DEFAULT_MODEL, GenerationState } from './types';
import { StepInput } from './components/Steps/StepInput';
import { StepProcessing } from './components/Steps/StepProcessing';
import { ApiKeyButton } from './components/Layout/ApiKeyButton';
import { Bot, CircleHelp, X, FileCode, FileText, Loader2, Video, Music } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<AppStep>('idle');
  
  const [appState, setAppState] = useState<AppState>({
    sourceMode: 'text',
    sourceCode: '',
    githubUrl: '',
    githubToken: '',
    requirements: '',
    modelName: DEFAULT_MODEL,
    musicEnabled: true
  });

  const [genState, setGenState] = useState<GenerationState>({
    outline: '',
    isOutlineComplete: false,
    generatedCode: '',
    isCodeComplete: false,
    finalHtml: null,
    error: null,
    stage: 'idle'
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMicOpen, setIsMicOpen] = useState(false);
  const micContainerRef = useRef<HTMLDivElement>(null);
  const demoInstructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoOpenedDemoInstructionsRef = useRef(false);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!isMicOpen) return;
      const target = e.target as Node | null;
      if (target && micContainerRef.current && !micContainerRef.current.contains(target)) {
        setIsMicOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isMicOpen]);

  useEffect(() => {
    if (!isMicOpen) return;
    const t = window.setTimeout(() => {
      demoInstructionsTextareaRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [isMicOpen]);

  const speakDemoPrompt = async (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') return;

      const pickVoice = async () => {
        const existing = synth.getVoices();
        if (existing.length > 0) return existing;

        await new Promise<void>((resolve) => {
          const onVoicesChanged = () => {
            synth.removeEventListener('voiceschanged', onVoicesChanged);
            resolve();
          };
          synth.addEventListener('voiceschanged', onVoicesChanged);
          window.setTimeout(() => {
            synth.removeEventListener('voiceschanged', onVoicesChanged);
            resolve();
          }, 500);
        });
        return synth.getVoices();
      };

      const voices = await pickVoice();
      const utterance = new SpeechSynthesisUtterance(text);
      const preferred =
        voices.find(v => /microsoft/i.test(v.name) && /^en(-|$)/i.test(v.lang)) ||
        voices.find(v => /^en(-|$)/i.test(v.lang)) ||
        voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1;
      utterance.pitch = 1;
      synth.cancel();
      synth.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Transitions
  const handleStartRecord = () => {
    setStep('recording');
  };
  const handleStopRecord = () => {
    const hasSource = (appState.sourceMode === 'text' && appState.sourceCode.trim().length > 0) || 
                      (appState.sourceMode === 'github' && appState.githubUrl.trim().length > 0);
    const hasDemoInstructions = appState.requirements.trim().length > 0;

    if (!hasSource) {
      alert("Please input source code first.");
      return;
    }

    if (!hasDemoInstructions) {
      if (!hasAutoOpenedDemoInstructionsRef.current) {
        hasAutoOpenedDemoInstructionsRef.current = true;
        setIsMicOpen(true);
        void speakDemoPrompt('How would you like to make the demo?');
      } else {
        setIsMicOpen(true);
      }
      setIsMicOpen(true);
      alert("Please add demo instructions (what the demo should do).");
      return;
    }

    setStep('processing');
    setGenState(prev => ({ ...prev, stage: 'idle' })); // Reset for new run
  };
  const handleCancel = () => {
    setStep('idle');
    setGenState({ outline: '', isOutlineComplete: false, generatedCode: '', isCodeComplete: false, finalHtml: null, error: null, stage: 'idle' });
  };
  
  const handleProcessingComplete = () => {
    setStep('result');
  };

  const openPreview = () => {
    setStep('preview');
  };

  const isWindowOpen = step === 'recording' || step === 'processing';
  const isResultReady = step === 'result';
  const isPreviewOpen = step === 'preview';

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center font-sans selection:bg-red-500/30">
      
      <ApiKeyButton />

      {/* 1. IDLE STATE: Big Red Button */}
      <div className={`absolute transition-all duration-500 z-10 ${isWindowOpen || isResultReady || isPreviewOpen ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
         <button onClick={handleStartRecord} className="group relative flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] active:scale-95">
                <div className="w-20 h-20 rounded-full border-2 border-white/20"></div>
            </div>
            <div className="text-center">
                <h1 className="text-white text-2xl font-semibold tracking-tight drop-shadow-md">Record 1 Min Demo</h1>
                <p className="text-white/70 text-sm mt-1">Click to select capture area</p>
            </div>
         </button>
      </div>

      {/* 2. WINDOW STATE: Recording / Processing */}
      <div 
        className={`
            absolute glass-panel rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ease-out z-20
            ${isWindowOpen ? 'w-[820px] h-[500px] opacity-100' : 'w-[0px] h-[0px] opacity-0 pointer-events-none border-none'}
        `}
      >
        <div className="absolute inset-0 selection-border opacity-50 pointer-events-none z-50"></div>
        
        {/* Decorative Drag Handles */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/50" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/50" />

        <div className="flex-1 w-full h-full">
            {step === 'recording' && (
              <StepInput
                state={appState}
                onChange={(u) => setAppState(prev => ({...prev, ...u}))}
              />
            )}
            {step === 'processing' && (
                <StepProcessing 
                    appState={appState} 
                    genState={genState} 
                    setGenState={(u) => setGenState(prev => ({...prev, ...u}))}
                    onComplete={handleProcessingComplete}
                    isPaused={isPaused}
                />
            )}
        </div>
      </div>

      {/* 3. TOOLBAR (Only in Recording / Processing) */}
      <div className={`absolute bottom-20 z-30 transition-all duration-500 ${isWindowOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl">
                {/* Timer / Status */}
                <div className="font-mono text-white text-sm w-24 text-center border-r border-white/10 pr-4 flex items-center justify-center gap-2">
                    {step === 'processing' ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                            <span className="text-blue-400 font-bold">BUSY</span>
                        </>
                    ) : (
                        <>
                           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                           <span>00:00</span>
                        </>
                    )}
                </div>

                {/* Director Prompt (Mic) */}
                <div className="relative" ref={micContainerRef}>
                    <button
                        onClick={() => setIsMicOpen(v => !v)}
                        className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${isMicOpen ? 'bg-white/10 text-yellow-300' : 'text-white/70 hover:text-white'}`}
                        title="Demo instructions"
                        type="button"
                    >
                        <FileText className="w-5 h-5" />
                    </button>

                    {isMicOpen && (
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a1a] border border-white/20 p-3 rounded-lg shadow-xl animate-in slide-in-from-bottom-2 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                    Demo instructions
                                </div>
                                <div className="relative group/help">
                                    <button
                                        type="button"
                                        className="text-gray-500 hover:text-gray-300 transition-colors"
                                        title="Help"
                                    >
                                        <CircleHelp className="w-4 h-4" />
                                    </button>
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-56 bg-black border border-white/10 text-gray-200 text-[10px] leading-relaxed p-2 rounded opacity-0 group-hover/help:opacity-100 transition-opacity pointer-events-none">
                                        Describe how you want the demo to look and behave (general or step-by-step).
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <textarea
                                    ref={demoInstructionsTextareaRef}
                                    value={appState.requirements}
                                    onChange={(e) => setAppState(prev => ({ ...prev, requirements: e.target.value }))}
                                    className="w-full h-32 bg-black/50 text-white text-sm leading-relaxed p-2 rounded outline-none border border-transparent focus:border-white/30 font-mono"
                                    spellCheck={false}
                                />

                                {appState.requirements.trim().length === 0 && (
                                    <div className="absolute inset-0 p-2 pointer-events-none">
                                        <div className="text-gray-500/80 text-[12px] leading-relaxed font-mono whitespace-pre-wrap">
                                            1. User uploads a file
                                            {'\n'}2. Shows loading state (5s)
                                            {'\n'}3. Displays success message
                                            {'\n'}4. Shows analysis results
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="text-[9px] text-gray-500 mt-2">These notes guide the storyboard and generated UI.</div>
                        </div>
                    )}
                </div>

                {/* Video Camera */}
                <button
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    title="Camera"
                    type="button"
                >
                    <Video className="w-5 h-5" />
                </button>

                {/* Music Toggle */}
                <button
                    onClick={() => setAppState(prev => ({ ...prev, musicEnabled: !prev.musicEnabled }))}
                    className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ${appState.musicEnabled ? 'text-yellow-300' : 'text-white/30 hover:text-white/50'}`}
                    title={appState.musicEnabled ? "Background music enabled (click to mute)" : "Background music muted (click to enable)"}
                    type="button"
                >
                    <Music className="w-5 h-5" />
                    {!appState.musicEnabled && (
                        <div className="absolute w-6 h-0.5 bg-red-500 rotate-45 rounded-full" />
                    )}
                </button>

                {/* Settings */}
                 <div className="relative">
                    <button 
                         onClick={() => setShowSettings(!showSettings)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                        title="Model Settings"
                    >
                        <Bot className="w-5 h-5" />
                    </button>
                    {showSettings && (
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 bg-[#1a1a1a] border border-white/20 p-3 rounded-lg shadow-xl animate-in slide-in-from-bottom-2 duration-200">
                             <div className="text-[10px] text-gray-400 uppercase mb-2 font-bold tracking-wider">AI Model</div>
                             <select 
                                value={appState.modelName}
                                onChange={(e) => setAppState(prev => ({...prev, modelName: e.target.value}))}
                                className="w-full bg-black/50 text-white text-xs p-1.5 rounded outline-none border border-white/10"
                             >
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.0-flash-thinking-exp-01-21">Gemini 2.0 Thinking</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                             </select>
                        </div>
                    )}
                 </div>

                <div className="w-[1px] h-6 bg-white/10"></div>
                
                {step === 'processing' ? (
                     <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="text-white/50 hover:text-white text-xs font-medium transition-colors"
                     >
                        {isPaused ? "Resume" : "Pause"}
                     </button>
                ) : (
                    <button onClick={handleCancel} className="text-white/50 hover:text-white text-xs font-medium transition-colors px-2">
                        Cancel
                    </button>
                )}

                {/* Stop / Generate Button */}
                {step === 'processing' ? (
                    <button onClick={handleCancel} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors shadow-lg active:scale-95" title="Abort">
                         <X className="w-4 h-4 text-white" />
                    </button>
                ) : (
                    <button onClick={handleStopRecord} className="w-8 h-8 bg-red-500 rounded flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg active:scale-95 group" title="Finish Recording & Generate">
                        <div className="w-3 h-3 bg-white rounded-[1px] group-hover:scale-90 transition-transform"></div>
                    </button>
                )}
          </div>
      </div>

      {/* 4. RESULT STATE: Desktop Icon */}
      {isResultReady && (
         <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in duration-500">
             <button onClick={openPreview} className="group flex flex-col items-center gap-3">
                 <div className="relative w-24 h-32 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center group-hover:-translate-y-2 transition-transform duration-300 overflow-hidden border border-gray-300">
                      <div className="absolute top-0 right-0 w-8 h-8 bg-gray-200" style={{clipPath: 'polygon(0 0, 0% 100%, 100% 100%)'}}></div>
                      <FileCode className="w-12 h-12 text-blue-600" />
                      <div className="absolute bottom-4 w-12 h-1 bg-gray-200 rounded-full"></div>
                      <div className="absolute bottom-2 w-8 h-1 bg-gray-200 rounded-full"></div>
                 </div>
                 <span className="text-white font-mono text-sm bg-blue-600/90 px-3 py-1 rounded-md shadow-lg backdrop-blur-sm border border-blue-400/30">
                    demo1.html
                 </span>
             </button>
             
             <button onClick={handleCancel} className="absolute bottom-20 text-white/50 hover:text-white text-sm">
                Start New Recording
             </button>
         </div>
      )}

      {/* 5. PREVIEW STATE: Full Screen Overlay */}
      {isPreviewOpen && genState.finalHtml && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in slide-in-from-bottom duration-500">
             <div className="h-12 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                 <span className="text-white text-sm font-medium flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    product_demo_v1.html
                 </span>
                 <div className="flex items-center gap-3">
                     <button onClick={() => {
                         const blob = new Blob([genState.finalHtml!], { type: 'text/html' });
                         const url = URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = 'demo.html';
                         a.click();
                     }} className="text-xs text-blue-400 hover:text-blue-300">Download</button>
                     <button onClick={() => setStep('result')} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-5 h-5 text-gray-400" />
                     </button>
                 </div>
             </div>
             <iframe 
                srcDoc={genState.finalHtml} 
                className="flex-1 w-full h-full bg-white border-none"
                title="Preview" 
             />
        </div>
      )}

      {/* Dimmer Background */}
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-700 pointer-events-none ${isWindowOpen || isResultReady ? 'opacity-100' : 'opacity-0'}`} />
    
    </div>
  );
}
