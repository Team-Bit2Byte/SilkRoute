'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Send, Languages, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto bg-background border-x-0 sm:border-x-2 border-border-lavender">
      {/* Header */}
      <header className="bg-accent-purple text-background p-3 sm:p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="sm:hidden">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-lg sm:text-xl">SilkRoute Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <Languages size={18} className="hidden sm:block" />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-background/20 text-background border-none rounded-lg p-1 text-xs sm:text-sm outline-none font-medium"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="bn">Bengali</option>
            <option value="ta">Tamil</option>
          </select>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm sm:text-base">Start a conversation to negotiate prices!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === undefined; // TODO: Fix ID check with socket.id
          
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[80%] shadow-sm ${
                'bg-background border-2 border-border-lavender self-start'
              }`}
            >
              <div className="text-xs text-primary-text font-medium mb-1">{msg.username}</div>
              <div className="text-sm sm:text-base text-foreground break-words">{msg.text}</div>
              {msg.translated_text && (
                 <div className="text-xs sm:text-sm text-success-text mt-2 pt-2 border-t border-border-lavender italic">
                   {msg.translated_text}
                 </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 bg-background border-t-2 border-border-lavender flex gap-2 items-end">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your offer..."
          className="flex-1 p-2 sm:p-3 border-2 border-border-lavender bg-background text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-purple text-sm sm:text-base resize-none"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-accent-purple text-background p-2 sm:p-3 rounded-2xl hover:bg-accent-purple-hover transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
