import React from 'react';
import { Sparkles, Github } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Product Demo Gen
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
            <Github className="w-4 h-4" />
            <span>Open Source</span>
          </a>
        </div>
      </div>
    </header>
  );
};