import React, { useEffect, useState } from 'react';
import { Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export const ApiKeyButton: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true); // Fallback
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("Failed to open key selector:", e);
      }
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      {checkingKey ? (
        <div className="bg-black/50 backdrop-blur text-white px-3 py-1.5 rounded-full text-xs font-mono border border-white/10">Checking...</div>
      ) : hasApiKey ? (
        <div className="group relative">
             <div className="bg-black/50 backdrop-blur hover:bg-black/70 text-green-400 px-3 py-1.5 rounded-full text-xs font-mono border border-green-500/30 flex items-center gap-2 cursor-pointer transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>API KEY ACTIVE</span>
            </div>
             <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                Connected to Google AI Studio
            </div>
        </div>
      ) : (
        <button 
          onClick={handleSelectKey}
          className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse flex items-center gap-2 transition-all"
        >
          <Key className="w-3 h-3" />
          SELECT API KEY
        </button>
      )}
    </div>
  );
};
