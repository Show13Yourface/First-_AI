
import React from 'react';

// Simple lightweight markdown renderer without external heavy deps
// In a real app, use react-markdown, but we'll implement a clean version for speed and reliability here
export const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  // Rough formatting for code blocks, lists, and bold text
  const formatted = content
    .split('```')
    .map((part, i) => {
      if (i % 2 === 1) {
        // Code block
        const [lang, ...code] = part.split('\n');
        return (
          <pre key={i} className="bg-zinc-900 rounded-lg p-4 my-2 overflow-x-auto border border-zinc-800 fira-code text-sm">
            <div className="text-zinc-500 text-xs mb-2 border-b border-zinc-800 pb-1">{lang || 'code'}</div>
            <code>{code.join('\n')}</code>
          </pre>
        );
      }
      
      // Inline formatting
      return part.split('\n').map((line, j) => {
        let renderedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-pink-400 fira-code text-xs">$1</code>');

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return <li key={`${i}-${j}`} className="ml-4 list-disc mb-1" dangerouslySetInnerHTML={{ __html: renderedLine.replace(/^[-*]\s/, '') }} />;
        }
        
        if (line.trim().startsWith('# ')) {
          return <h1 key={`${i}-${j}`} className="text-2xl font-bold mt-4 mb-2 text-white" dangerouslySetInnerHTML={{ __html: renderedLine.replace(/^#\s/, '') }} />;
        }

        if (line.trim() === '') return <br key={`${i}-${j}`} />;

        return <p key={`${i}-${j}`} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedLine }} />;
      });
    });

  return <div className="text-zinc-300">{formatted}</div>;
};
