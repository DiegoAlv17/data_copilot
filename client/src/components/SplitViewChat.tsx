import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import type { ChatMessage } from '../types';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Message } from './Message';
import { DashboardGrid } from './DashboardGrid';
import { ChartRenderer } from './charts/ChartRenderer';

export const SplitViewChat: React.FC = () => {
  const { sendMessage, lastMessage, isConnected } = useWebSocket();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visualizationsRef = useRef<HTMLDivElement>(null);

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
        const dashboardMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: lastMessage.text || "Aquí está tu dashboard completo.",
          timestamp: Date.now(),
          isDashboard: true,
          dashboardTitle: lastMessage.dashboardTitle,
          dashboardWidgets: lastMessage.widgets,
          queryIntent: lastMessage.queryIntent,
        };
        setMessages(prev => [...prev, dashboardMessage]);
      } else if (lastMessage.type === 'result') {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: lastMessage.text || "Aquí están los datos que solicitaste.",
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

  // Obtener última visualización (dashboard o chart)
  const lastVisualization = messages.length > 0 
    ? messages.filter(m => m.role === 'assistant' && (m.isDashboard || m.chartData)).pop()
    : null;

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full bg-gray-50">
      {/* Panel Izquierdo - Chat */}
      <div className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300 ${hasMessages ? 'w-1/5' : 'w-full'}`}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-text-secondary p-8">
              <h1 className="text-4xl font-bold text-text mb-8">Data Copilot</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {['Muéstrame los 5 productos principales', 'Ventas por región', 'Tendencia de ingresos mensual', 'Estado financiero'].map((example) => (
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
            // Messages List
            <div className="flex flex-col">
              {messages.map((msg) => (
                <div key={msg.id} className={`w-full border-b border-black/10 dark:border-gray-900/50 ${msg.role === 'user' ? "bg-background" : "bg-surface"} p-4`}>
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <div className="w-8 flex flex-col relative items-end">
                      <div className={`relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center ${msg.role === 'user' ? "bg-gray-500" : "bg-primary"}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      
                      {/* Query Intent */}
                      {msg.queryIntent && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-gray-900">
                          <div className="font-semibold text-blue-700 mb-1">🎯 Análisis de Intención</div>
                          <div className="text-gray-800">
                            {msg.queryIntent.isAmbiguous && (
                              <div className="mb-2 text-yellow-700">
                                <strong>⚠️ Consulta ambigua detectada</strong>
                              </div>
                            )}
                            {msg.queryIntent.enrichedQuery && (
                              <div><strong>Consulta enriquecida:</strong> {msg.queryIntent.enrichedQuery}</div>
                            )}
                            {msg.queryIntent.assumptions && (
                              <div className="mt-2">
                                <strong>Suposiciones:</strong>
                                <ul className="ml-4 mt-1">
                                  {msg.queryIntent.assumptions.timePeriod && <li>• Período: {msg.queryIntent.assumptions.timePeriod}</li>}
                                  {msg.queryIntent.assumptions.region && <li>• Región: {msg.queryIntent.assumptions.region}</li>}
                                  {msg.queryIntent.assumptions.metric && <li>• Métrica: {msg.queryIntent.assumptions.metric}</li>}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SQL Query */}
                      {msg.sql && (
                        <details className="mt-3">
                          <summary className="text-xs text-blue-700 cursor-pointer hover:text-blue-900">
                            Ver consulta SQL
                          </summary>
                          <pre className="mt-2 p-4 bg-white rounded-xl border border-gray-200 text-xs text-gray-900 overflow-x-auto shadow-[0_6px_18px_-6px_rgba(0,0,0,0.15)]">
                            {msg.sql}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="w-full bg-surface border-b border-black/10 dark:border-gray-900/50 p-4">
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                      <Bot size={16} className="text-white animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Analizando tu consulta...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 p-4 bg-transparent">
          <div className="max-w-3xl mx-auto">
            {/* Contenedor flotante */}
            <div
              className="group relative flex gap-3 items-end rounded-2xl border border-gray-300 bg-white p-4 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25),0_0_18px_rgba(59,130,246,0.15)] transition-all duration-300 focus-within:shadow-[0_10px_40px_-8px_rgba(0,0,0,0.35),0_0_28px_rgba(59,130,246,0.35)] focus-within:-translate-y-0.5 focus-within:border-blue-500"
            >
              {/* Glow decorativo */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-focus-within:ring-2 ring-blue-500/30 transition duration-300" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre tus datos..."
                aria-label="Ingresar consulta de datos"
                className="flex-1 bg-transparent resize-none outline-none text-sm max-h-40 text-gray-900 placeholder-gray-500 tracking-wide leading-relaxed"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isConnected}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-blue-500/40 active:scale-95"
                aria-label="Enviar consulta"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
            <div className="text-center text-xs text-gray-600 mt-3">
              Agente BI puede cometer errores. Verifica información crítica antes de decidir.
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Visualizaciones */}
      {hasMessages && lastVisualization && (
        <div className="w-4/5 flex flex-col bg-white">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {lastVisualization.isDashboard ? lastVisualization.dashboardTitle || 'Panel de Control' : 'Visualización'}
            </h2>
          </div>
          
          <div ref={visualizationsRef} className="flex-1 overflow-auto p-6">
            {lastVisualization.isDashboard && lastVisualization.dashboardWidgets ? (
              <DashboardGrid 
                widgets={lastVisualization.dashboardWidgets}
              />
            ) : lastVisualization.chartData && lastVisualization.chartType ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto p-4">
                  <ChartRenderer 
                    type={lastVisualization.chartType} 
                    data={lastVisualization.chartData} 
                    config={lastVisualization.chartConfig || {}}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
