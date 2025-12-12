
import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../../types';
import { Code, Github, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  state: AppState;
  onChange: (updates: Partial<AppState>) => void;
  onFirstSourceInteract?: () => void;
}

const GITHUB_API_BASE = 'https://api.github.com/repos';

export const StepInput: React.FC<Props> = ({ state, onChange, onFirstSourceInteract }) => {
  // Local state for fetch configuration
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [excludeBinary, setExcludeBinary] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchLogs, setFetchLogs] = useState<{msg: string, type: 'info'|'success'|'error'|'warn'}[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSourceFocused, setIsSourceFocused] = useState(false);
  const hasTriggeredFirstInteractRef = useRef(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [fetchLogs]);

  const addLog = (msg: string, type: 'info'|'success'|'error'|'warn' = 'info') => {
    setFetchLogs(prev => [...prev, { msg, type }]);
  };

  // --- Helper Functions ---

  const isBinary = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'mp3', 'wav', 'zip', 'tar', 'gz', 'pdf', 'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'pyc'];
    return binaryExts.includes(ext);
  };

  const passesFilters = (path: string, inc: string, exc: string) => {
    const includes = inc.split(',').map(s => s.trim()).filter(s => s);
    const excludes = exc.split(',').map(s => s.trim()).filter(s => s);
    
    let isIncluded = includes.length === 0; // If no include filters, include everything by default
    if (!isIncluded) isIncluded = includes.some(filter => path.includes(filter));
    
    let isExcluded = false;
    if (excludes.length > 0) isExcluded = excludes.some(filter => path.includes(filter));
    
    return isIncluded && !isExcluded;
  };

  const extractGithubOwnerRepo = (input: string) => {
    const s = (input ?? '').trim();
    
    // Handle git@github.com:owner/repo
    if (s.startsWith('git@github.com:')) {
        const path = s.slice('git@github.com:'.length);
        const parts = path.split('/').filter(Boolean);
        if (parts.length < 2) return null;
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    }

    // Handle URL
    const normalized = (s.startsWith('http://') || s.startsWith('https://')) ? s : `https://${s}`;
    try {
        const u = new URL(normalized);
        if (!u.hostname.includes('github.com')) return null;
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
    } catch {
        return null;
    }
  };

  const fetchRepoFile = async (url: string, token: string) => {
    const headers = token ? { 'Authorization': `token ${token}` } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  const recursiveFetch = async (url: string, token: string, files: {path: string, content: string}[]) => {
    const headers = token ? { 'Authorization': `token ${token}` } : {};
    
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(res.statusText);
    
    const data = await res.json();
    
    if (Array.isArray(data)) {
        for (const item of data) {
            if (item.type === 'dir') {
                if (['.git', 'node_modules', 'dist', 'build', '.idea', '.vscode'].includes(item.name)) continue;
                await recursiveFetch(item.url, token, files);
            } else if (item.type === 'file') {
                // Filters
                if (excludeBinary && isBinary(item.name)) {
                    addLog(`Skipping binary: ${item.name}`, 'warn');
                    continue;
                }
                if (!passesFilters(item.path, includePattern, excludePattern)) {
                    addLog(`Filtered out: ${item.path}`, 'warn');
                    continue;
                }

                addLog(`FETCHING: ${item.path}`, 'info');
                try {
                    const fileData = await fetchRepoFile(item.url, token);
                    if (fileData.content) {
                        // GitHub API returns base64 content
                        const content = new TextDecoder('utf-8').decode(
                            Uint8Array.from(atob(fileData.content), c => c.charCodeAt(0))
                        );
                        files.push({ path: item.path, content });
                    }
                } catch (e) {
                    addLog(`Failed to decode ${item.path}`, 'error');
                }
            }
        }
    }
  };

  const handleFetchGithub = async () => {
    const parsed = extractGithubOwnerRepo(state.githubUrl);
    if (!parsed) {
        alert("Invalid GitHub URL. Please use format: https://github.com/owner/repo");
        return;
    }

    setIsFetching(true);
    setFetchLogs([]);
    addLog(`Connecting to ${parsed.owner}/${parsed.repo}...`);

    const { owner, repo } = parsed;
    const rootUrl = `${GITHUB_API_BASE}/${owner}/${repo}/contents`;
    const files: {path: string, content: string}[] = [];

    try {
        await recursiveFetch(rootUrl, state.githubToken, files);
        
        if (files.length > 0) {
            addLog(`Done! Loaded ${files.length} files.`, 'success');
            
            // Format files into a single string
            const formatted = files.map(f => 
                `================================================\nFILE: ${f.path}\n================================================\n${f.content}`
            ).join('\n\n');

            setTimeout(() => {
                onChange({ sourceCode: formatted, sourceMode: 'text' });
                setIsFetching(false);
            }, 1000);
        } else {
            addLog("No matching files found.", 'error');
            setTimeout(() => setIsFetching(false), 2000);
        }
    } catch (e: any) {
        addLog(`Fatal Error: ${e.message}`, 'error');
        // Allow user to see error before closing
        setTimeout(() => setIsFetching(false), 3000);
    }
  };

  const parsedRepo = state.sourceMode === 'github' ? extractGithubOwnerRepo(state.githubUrl) : null;
  const isRepoValid = state.sourceMode !== 'github' ? false : !!parsedRepo;

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 bg-black/80 rounded-lg border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute inset-0 p-8 flex flex-col">
            <div className="flex items-center justify-between shrink-0 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 text-sm font-bold tracking-wider uppercase">Recording Source</span>
              </div>

              <div className="flex bg-white/10 rounded-md p-1 gap-1">
                <button
                  onClick={() => onChange({ sourceMode: 'text' })}
                  className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${
                    state.sourceMode === 'text'
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                >
                  <Code className="w-4 h-4" />
                  <span>Code</span>
                </button>
                <button
                  onClick={() => onChange({ sourceMode: 'github' })}
                  className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors ${
                    state.sourceMode === 'github'
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                  type="button"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 group/input">
              <textarea
                value={state.sourceMode === 'github' ? state.githubUrl : state.sourceCode}
                onChange={(e) => {
                  const value = e.target.value;
                  // Auto-detect GitHub URL and switch mode
                  const isGithubUrl = value.trim().startsWith('https://github.com/') || 
                                      value.trim().startsWith('http://github.com/') ||
                                      value.trim().startsWith('github.com/') ||
                                      value.trim().startsWith('git@github.com:');
                  
                  if (isGithubUrl && state.sourceMode === 'text') {
                    onChange({ sourceMode: 'github', githubUrl: value });
                  } else if (!isGithubUrl && state.sourceMode === 'github') {
                    onChange({ sourceMode: 'text', sourceCode: value });
                  } else if (state.sourceMode === 'github') {
                    onChange({ githubUrl: value });
                  } else {
                    onChange({ sourceCode: value });
                  }
                }}
                onFocus={() => {
                  setIsSourceFocused(true);
                  if (!hasTriggeredFirstInteractRef.current) {
                    hasTriggeredFirstInteractRef.current = true;
                    onFirstSourceInteract?.();
                  }
                }}
                onBlur={() => setIsSourceFocused(false)}
                placeholder={
                  "// Paste your GitHub URL or Code here...\n\nhttps://github.com/username/project\n\nOR\n\nconst App = () => { ... }"
                }
                className="w-full h-full bg-transparent text-white/90 font-mono text-lg outline-none resize-none placeholder:text-gray-600 z-10 relative"
                spellCheck={false}
              />

              {!isSourceFocused &&
                ((state.sourceMode === 'github' && state.githubUrl.length === 0) ||
                  (state.sourceMode === 'text' && state.sourceCode.length === 0)) && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-focus-within/input:hidden">
                    <div className="text-gray-700 text-4xl opacity-20 font-mono">⌘ V</div>
                  </div>
                )}

              {state.sourceMode === 'github' && !isFetching && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-4 pointer-events-none transition-opacity duration-300">
                  <div className="mb-2 text-center">
                    <p
                      className={`text-red-400 text-xs font-mono bg-black/80 px-2 py-1 rounded translate-y-3 ${
                        isRepoValid || state.githubUrl.trim().length === 0 ? 'hidden' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Incomplete Repository URL
                      </span>
                    </p>
                  </div>

                  <div className="pointer-events-auto flex flex-col items-center bg-black/80 p-6 rounded-lg border border-white/10 backdrop-blur-md shadow-2xl w-80">
                    <button
                      onClick={handleFetchGithub}
                      disabled={!isRepoValid}
                      className="group relative px-8 py-3 bg-white text-black font-bold tracking-widest text-xs uppercase flex items-center gap-2 hover:bg-green-400 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm shadow-lg w-full justify-center"
                      type="button"
                    >
                      FETCH SOURCE
                    </button>

                    <div className="mt-4 w-full">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-between w-full cursor-pointer group/toggle"
                        type="button"
                      >
                        <span className="text-xs text-gray-400 uppercase tracking-widest group-hover/toggle:text-white transition-colors font-medium">
                          Advanced Options
                        </span>
                        {showAdvanced ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 group-hover/toggle:text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 group-hover/toggle:text-white" />
                        )}
                      </button>

                      {showAdvanced && (
                        <div className="mt-3 space-y-3 animate-in fade-in border-t border-gray-700 pt-3">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                              GitHub Token (Optional)
                            </label>
                            <input
                              type="password"
                              value={state.githubToken}
                              onChange={(e) => onChange({ githubToken: e.target.value })}
                              className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-xs text-white focus:border-green-500 outline-none"
                              placeholder="ghp_..."
                            />
                            <div className="text-[9px] text-gray-600 mt-2">Required for private repos.</div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                              Include Pattern
                            </label>
                            <input
                              type="text"
                              value={includePattern}
                              onChange={(e) => setIncludePattern(e.target.value)}
                              className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-xs text-white focus:border-green-500 outline-none"
                              placeholder="e.g. src/, .ts, .tsx"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">
                              Exclude Pattern
                            </label>
                            <input
                              type="text"
                              value={excludePattern}
                              onChange={(e) => setExcludePattern(e.target.value)}
                              className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                              placeholder="e.g. test/, .md"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              id="filter-binary"
                              type="checkbox"
                              checked={excludeBinary}
                              onChange={(e) => setExcludeBinary(e.target.checked)}
                              className="w-3 h-3 accent-green-500 bg-black border-gray-600 rounded"
                            />
                            <label htmlFor="filter-binary" className="text-xs text-gray-400 select-none">
                              Exclude Binary Files (Images, etc.)
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isFetching && (
                <div className="absolute inset-0 z-50 bg-[#0c0c0c] p-4 font-mono text-xs flex flex-col animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-2 mb-2 shrink-0">
                    <span className="text-green-500 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      FETCHING_DATA_STREAM
                    </span>
                    <span className="text-gray-500">v1.0.0</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 text-gray-300 scrollbar-hide">
                    {fetchLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`${
                          log.type === 'error'
                            ? 'text-red-400'
                            : log.type === 'success'
                              ? 'text-green-400'
                              : log.type === 'warn'
                                ? 'text-gray-500'
                                : 'text-gray-300'
                        }`}
                      >
                        <span className="opacity-50 mr-2">{'>'}</span>
                        {log.msg}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
