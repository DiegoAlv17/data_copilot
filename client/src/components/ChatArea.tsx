import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot } from 'lucide-react';
import { Message } from './Message';
import type { ChatMessage } from '../types';
import { useWebSocket } from '../contexts/WebSocketContext';

export const ChatArea: React.FC = () => {
  const { sendMessage, lastMessage, isConnected } = useWebSocket();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (lastMessage) {
      setIsLoading(false);
      
      if (lastMessage.type === 'error') {
         const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'system',
          content: `Error: ${lastMessage.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else if (lastMessage.type === 'dashboard') {
        // Handle dashboard response with multiple widgets
        const dashboardMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: lastMessage.text || "Here is your comprehensive dashboard.",
          timestamp: Date.now(),
          isDashboard: true,
          dashboardTitle: lastMessage.dashboardTitle,
          dashboardWidgets: lastMessage.widgets,
          queryIntent: lastMessage.queryIntent,
        };
        setMessages(prev => [...prev, dashboardMessage]);
      } else if (lastMessage.type === 'result') {
        // Handle single chart response
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: lastMessage.text || "Here is the data you requested.",
          timestamp: Date.now(),
          chartData: lastMessage.chartData,
          chartType: lastMessage.chartType,
          chartConfig: lastMessage.chartConfig,
          sql: lastMessage.sql,
          queryIntent: lastMessage.queryIntent,
          thoughtProcess: lastMessage.thoughtProcess
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
  }, [lastMessage]);

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    sendMessage({ type: 'query', content: input });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary p-8">
            <h1 className="text-4xl font-bold text-text mb-8">Data Copilot</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              {['Show me top 5 products', 'Sales by region', 'Monthly revenue trend', 'Best performing categories'].map((example) => (
                <button 
                  key={example}
                  onClick={() => setInput(example)}
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-left transition-colors text-sm"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col pb-32">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="w-full bg-surface border-b border-black/10 dark:border-gray-900/50 p-4 md:py-6">
                <div className="max-w-3xl m-auto flex gap-4">
                  <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                    <Bot size={16} className="text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-center w-full p-3 bg-[#40414f] rounded-xl shadow-xs border border-black/10 dark:border-gray-900/50 focus-within:border-gray-500/50 ring-offset-2 focus-within:ring-2 ring-blue-500/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              rows={1}
              className="w-full bg-transparent border-0 text-text focus:ring-0 resize-none max-h-48 py-2 pr-10 scrollbar-hide"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected || isLoading}
              className="absolute right-3 p-2 rounded-md text-white bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-center text-xs text-text-secondary mt-2">
            Data Copilot can make mistakes. Consider checking important information.
          </div>
        </div>
      </div>
    </div>
  );
};
