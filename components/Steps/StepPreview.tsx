import React from 'react';
import { GenerationState } from '../../types';
import { Download, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  genState: GenerationState;
  onReset: () => void;
}

export const StepPreview: React.FC<Props> = ({ genState, onReset }) => {
  const htmlBlob = new Blob([genState.finalHtml || ''], { type: 'text/html' });
  const previewUrl = URL.createObjectURL(htmlBlob);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = 'product-demo.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="h-14 flex items-center justify-between px-2 shrink-0">
         <div className="flex items-center gap-4">
            <button 
                onClick={onReset}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Start Over
            </button>
            <h2 className="text-lg font-semibold text-white">Live Preview</h2>
         </div>
         
         <div className="flex items-center gap-3">
             <button 
                onClick={() => {
                    const iframe = document.getElementById('demo-frame') as HTMLIFrameElement;
                    if(iframe) iframe.src = iframe.src;
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                title="Replay Animation"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
            <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
            >
                <Download className="w-4 h-4" />
                Download .html
            </button>
         </div>
      </div>

      <div className="flex-1 bg-white rounded-lg overflow-hidden border-4 border-gray-800 relative">
        <iframe 
            id="demo-frame"
            src={previewUrl}
            className="w-full h-full border-0"
            title="Generated Demo"
            sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
        />
      </div>
    </div>
  );
};