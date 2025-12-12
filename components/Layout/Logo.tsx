import React from 'react';
import { Zap, Play, FileCode } from 'lucide-react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30 overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-700 opacity-100"></div>
         <span className="relative z-10 font-mono text-white font-bold text-lg italic tracking-tighter pr-0.5">1</span>
         <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/20 rotate-45"></div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-white font-bold tracking-tight text-lg drop-shadow-sm">Min Demo</span>
        <span className="text-[9px] text-blue-200 font-mono tracking-wider uppercase opacity-80">Code to Video</span>
      </div>
    </div>
  );
};
