
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { AgentPersona, Message, ChatSession, AgentConfig } from './types';
import { geminiService } from './services/geminiService';
import { MarkdownContent } from './components/MarkdownContent';
import { 
  Send, 
  Image as ImageIcon, 
  Globe, 
  Zap, 
  Code, 
  PenTool, 
  BarChart3, 
  Menu, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    persona: AgentPersona.GENERAL,
    useSearch: false,
    temperature: 0.7
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('nexus_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
    } else {
      createNewChat();
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isGenerating]);

  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      persona: config.persona,
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInputValue('');
  }, [config.persona]);

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        // Create a new one if all deleted
        const newS = {
          id: crypto.randomUUID(),
          title: 'New Conversation',
          persona: config.persona,
          messages: [],
          updatedAt: Date.now()
        };
        setCurrentSessionId(newS.id);
        return [newS];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isGenerating) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      image: selectedImage || undefined,
      timestamp: Date.now()
    };

    const updatedMessages = [...(currentSession?.messages || []), userMessage];
    
    // Update session title on first message
    let newTitle = currentSession?.title || 'New Chat';
    if (updatedMessages.length === 1) {
      newTitle = inputValue.slice(0, 30) + (inputValue.length > 30 ? '...' : '');
    }

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: updatedMessages, title: newTitle, updatedAt: Date.now() } 
        : s
    ));

    setInputValue('');
    setSelectedImage(null);
    setIsGenerating(true);

    try {
      const assistantMessageId = crypto.randomUUID();
      let assistantContent = '';
      let groundingSources: { title: string; uri: string }[] = [];

      const stream = geminiService.sendMessageStream(
        currentSession?.persona || config.persona,
        updatedMessages,
        config.useSearch
      );

      for await (const chunk of stream) {
        assistantContent += chunk.text || '';
        
        // Extract grounding sources if any
        const chunks = (chunk as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((c: any) => {
            if (c.web) {
              groundingSources.push({ title: c.web.title, uri: c.web.uri });
            }
          });
        }

        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            const lastMsg = s.messages[s.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id === assistantMessageId) {
              return {
                ...s,
                messages: [...s.messages.slice(0, -1), { 
                  ...lastMsg, 
                  content: assistantContent,
                  groundingSources: groundingSources.length > 0 ? Array.from(new Set(groundingSources.map(s => s.uri))).map(uri => groundingSources.find(gs => gs.uri === uri)!) : undefined
                }]
              };
            } else {
              return {
                ...s,
                messages: [...s.messages, {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: Date.now(),
                  groundingSources: groundingSources.length > 0 ? groundingSources : undefined
                }]
              };
            }
          }
          return s;
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      // Graceful error handling UI could be added here
    } finally {
      setIsGenerating(false);
    }
  };

  const getPersonaIcon = (persona: AgentPersona) => {
    switch (persona) {
      case AgentPersona.CODER: return <Code size={18} />;
      case AgentPersona.WRITER: return <PenTool size={18} />;
      case AgentPersona.ANALYST: return <BarChart3 size={18} />;
      default: return <Zap size={18} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        sessions={sessions} 
        currentSessionId={currentSessionId} 
        onNewChat={createNewChat} 
        onSelectSession={setCurrentSessionId}
        onDeleteSession={deleteSession}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-[#0d0d0d]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">NEXUS AI</h1>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{currentSession?.persona || 'AGENT'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Persona Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
                {getPersonaIcon(currentSession?.persona || config.persona)}
                <span>{currentSession?.persona || config.persona}</span>
                <ChevronDown size={14} className="opacity-50" />
              </button>
              
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-2xl invisible group-hover:visible z-50">
                {Object.values(AgentPersona).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (currentSessionId) {
                        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, persona: p } : s));
                      }
                      setConfig(prev => ({ ...prev, persona: p }));
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                  >
                    {getPersonaIcon(p)}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Grounding Toggle */}
            <button 
              onClick={() => setConfig(prev => ({ ...prev, useSearch: !prev.useSearch }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 text-xs font-medium ${
                config.useSearch 
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Globe size={14} className={config.useSearch ? 'animate-pulse' : ''} />
              <span>{config.useSearch ? 'Web Search ON' : 'Web Search OFF'}</span>
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-0 py-8 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            {currentSession?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800 shadow-2xl">
                  <Sparkles size={32} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Initialize Nexus Protocol</h2>
                <p className="text-zinc-500 max-w-sm">
                  Your multi-modal intelligence agent is ready. How can I assist your mission today?
                </p>
                <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                  {[
                    "Architect a React dashboard",
                    "Write a neo-noir short story",
                    "Analyze current market trends",
                    "Explain quantum entanglement"
                  ].map(suggestion => (
                    <button 
                      key={suggestion}
                      onClick={() => setInputValue(suggestion)}
                      className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-indigo-500/30 transition-all text-left group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 mr-2">→</span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentSession?.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-indigo-600/20">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] md:max-w-[75%] space-y-2`}>
                  <div className={`p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/10' 
                      : 'bg-zinc-900/80 border border-zinc-800 shadow-lg'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="max-w-xs rounded-lg mb-3 border border-indigo-400/30" />
                    )}
                    <MarkdownContent content={msg.content} />
                    
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                          <Globe size={10} /> Sources Verified
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingSources.map((source, idx) => (
                            <a 
                              key={idx}
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-500 transition-all"
                            >
                              {source.title}
                              <ExternalLink size={10} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`text-[10px] text-zinc-500 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-zinc-500 to-zinc-200" />
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-4 justify-start animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Loader2 size={14} className="text-white animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">Computing response...</span>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Input Sticky Container */}
        <footer className="p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            
            {/* Image Preview Overlay */}
            {selectedImage && (
              <div className="absolute bottom-full left-0 mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="relative group">
                  <img src={selectedImage} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2 border-indigo-500 shadow-2xl" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <form 
              onSubmit={handleSubmit}
              className="relative flex items-end gap-2 bg-[#1a1a1a] border border-zinc-800 rounded-2xl p-2 focus-within:border-indigo-500/50 transition-all shadow-2xl"
            >
              <div className="flex items-center gap-1 px-1">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-zinc-400 hover:text-indigo-400 transition-colors hover:bg-zinc-800 rounded-xl"
                >
                  <ImageIcon size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>

              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask Nexus anything..."
                rows={1}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 py-3 resize-none max-h-48"
                style={{ height: 'auto' }}
              />

              <button
                type="submit"
                disabled={(!inputValue.trim() && !selectedImage) || isGenerating}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  (!inputValue.trim() && !selectedImage) || isGenerating
                    ? 'text-zinc-600 bg-transparent'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30'
                }`}
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
            <div className="mt-2 text-[10px] text-center text-zinc-600">
              Powered by Gemini 3 Ultra-Performance Neural Engine • Search Grounding Enabled
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
