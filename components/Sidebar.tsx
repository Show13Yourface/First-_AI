
import React from 'react';
import { AgentPersona, ChatSession } from '../types';
import { MessageSquare, Plus, History, Settings, Zap, Code, PenTool, BarChart3, Trash2 } from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onNewChat, 
  onSelectSession,
  onDeleteSession 
}) => {
  const getPersonaIcon = (persona: AgentPersona) => {
    switch (persona) {
      case AgentPersona.CODER: return <Code size={16} />;
      case AgentPersona.WRITER: return <PenTool size={16} />;
      case AgentPersona.ANALYST: return <BarChart3 size={16} />;
      default: return <Zap size={16} />;
    }
  };

  return (
    <div className="w-80 h-full bg-[#111] border-r border-zinc-800 flex flex-col hidden md:flex">
      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 px-4 transition-all duration-200 font-medium shadow-lg shadow-indigo-900/20"
        >
          <Plus size={18} />
          New Agent Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <History size={14} />
          Recent Interactions
        </div>
        
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
              currentSessionId === session.id 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <div className={`p-1.5 rounded-md ${currentSessionId === session.id ? 'bg-indigo-600/20 text-indigo-400' : 'bg-zinc-800'}`}>
              {getPersonaIcon(session.persona)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{session.title}</div>
              <div className="text-[10px] opacity-50 truncate">{new Date(session.updatedAt).toLocaleDateString()}</div>
            </div>
            
            <button
              onClick={(e) => onDeleteSession(session.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-[#0d0d0d]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-900 cursor-pointer transition-colors">
          <Settings size={18} />
          <span className="text-sm font-medium">Settings & API</span>
        </div>
      </div>
    </div>
  );
};
