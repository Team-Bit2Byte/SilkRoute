'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Send, Languages } from 'lucide-react';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('hi'); // Default target: Hindi
  // Hardcoded room/user for demo
  const { messages, sendMessage } = useSocket('room1', 'UserA');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input, language);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-background border-x-2 border-border-lavender">
      {/* Header */}
      <header className="bg-accent-purple text-background p-4 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-lg">SilkRoute Chat</h1>
        <div className="flex items-center gap-2">
          <Languages size={20} />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-background/20 text-background border-none rounded-lg p-1 text-sm outline-none font-medium"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="bn">Bengali</option>
            <option value="ta">Tamil</option>
          </select>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === undefined; // TODO: Fix ID check with socket.id
          // Ideally check against current socket.id but simplified for now
          // We'll rely on server echo for now so everyone receives it
          
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                'bg-background border-2 border-border-lavender self-start'
              }`}
            >
              <div className="text-xs text-primary-text font-medium mb-1">{msg.username}</div>
              <div className="text-foreground">{msg.text}</div>
              {msg.translated_text && (
                 <div className="text-sm text-success-text mt-1 pt-1 border-t border-border-lavender italic">
                   {msg.translated_text}
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 bg-background border-t-2 border-border-lavender flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your offer..."
          className="flex-1 p-2 border-2 border-border-lavender bg-background text-foreground rounded-full focus:outline-none focus:ring-2 focus:ring-accent-purple"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          className="bg-accent-purple text-background p-2 rounded-full hover:bg-accent-purple-hover transition shadow-md"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
