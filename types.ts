
export enum AgentPersona {
  GENERAL = 'General Assistant',
  CODER = 'Coding Specialist',
  WRITER = 'Creative Writer',
  ANALYST = 'Data Analyst'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string;
  groundingSources?: { title: string; uri: string }[];
}

export interface ChatSession {
  id: string;
  title: string;
  persona: AgentPersona;
  messages: Message[];
  updatedAt: number;
}

export interface AgentConfig {
  persona: AgentPersona;
  useSearch: boolean;
  temperature: number;
}
