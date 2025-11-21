import React, { useState } from 'react';
import { User, Bot, ChevronDown, ChevronRight, Terminal, HelpCircle, CheckCircle } from 'lucide-react';
import type { ChatMessage } from '../types';
import { ChartRenderer } from './charts/ChartRenderer';
import { DashboardGrid } from './DashboardGrid';

interface MessageProps {
  message: ChatMessage;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isIntentOpen, setIsIntentOpen] = useState(true); // Auto-expand by default

  return (
    <div className={`group w-full text-text border-b border-black/10 dark:border-gray-900/50 ${isUser ? "bg-background" : "bg-surface"}`}>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
        <div className="w-8 flex flex-col relative items-end">
          <div className={`relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center ${isUser ? "bg-gray-500" : "bg-primary"}`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
        </div>
        
        <div className="relative flex-1 overflow-hidden">
          <div className="prose prose-invert max-w-none">
            <p>{message.content}</p>
          </div>

          {/* Intent Clarifier Analysis */}
          {message.queryIntent && (
            <div className="mt-4">
              <button 
                onClick={() => setIsIntentOpen(!isIntentOpen)}
                className="flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors"
              >
                {isIntentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <HelpCircle size={14} />
                Query Analysis {message.queryIntent.isAmbiguous && <span className="text-yellow-400">(Ambiguous query detected)</span>}
              </button>
              
              {isIntentOpen && (
                <div className="mt-2 p-4 bg-black/30 rounded-md text-xs space-y-3">
                  {/* Original vs Enriched Query */}
                  <div>
                    <div className="text-gray-400 mb-1 font-semibold">Original Query:</div>
                    <div className="text-white italic">"{message.queryIntent.originalQuery}"</div>
                  </div>
                  
                  {message.queryIntent.enrichedQuery !== message.queryIntent.originalQuery && (
                    <div>
                      <div className="text-green-400 mb-1 font-semibold flex items-center gap-1">
                        <CheckCircle size={12} />
                        Enriched Query:
                      </div>
                      <div className="text-green-200 italic">"{message.queryIntent.enrichedQuery}"</div>
                    </div>
                  )}

                  {/* Internal Questions */}
                  {message.queryIntent.internalQuestions.length > 0 && (
                    <div>
                      <div className="text-blue-400 mb-1 font-semibold">Internal Questions Asked:</div>
                      <ul className="list-disc list-inside space-y-1 text-blue-200">
                        {message.queryIntent.internalQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assumptions Made */}
                  {Object.keys(message.queryIntent.assumptions).length > 0 && (
                    <div>
                      <div className="text-yellow-400 mb-1 font-semibold">Assumptions Made:</div>
                      <div className="space-y-1 text-yellow-200">
                        {message.queryIntent.assumptions.timePeriod && (
                          <div>• <strong>Time Period:</strong> {message.queryIntent.assumptions.timePeriod}</div>
                        )}
                        {message.queryIntent.assumptions.region && (
                          <div>• <strong>Region:</strong> {message.queryIntent.assumptions.region}</div>
                        )}
                        {message.queryIntent.assumptions.metric && (
                          <div>• <strong>Metric:</strong> {message.queryIntent.assumptions.metric}</div>
                        )}
                        {message.queryIntent.assumptions.limit && (
                          <div>• <strong>Limit:</strong> {message.queryIntent.assumptions.limit}</div>
                        )}
                        {message.queryIntent.assumptions.groupBy && message.queryIntent.assumptions.groupBy.length > 0 && (
                          <div>• <strong>Group By:</strong> {message.queryIntent.assumptions.groupBy.join(', ')}</div>
                        )}
                        {message.queryIntent.assumptions.orderBy && (
                          <div>• <strong>Order By:</strong> {message.queryIntent.assumptions.orderBy}</div>
                        )}
                        {message.queryIntent.assumptions.filters && message.queryIntent.assumptions.filters.length > 0 && (
                          <div>• <strong>Filters:</strong> {message.queryIntent.assumptions.filters.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Missing Dimensions */}
                  {message.queryIntent.missingDimensions.length > 0 && (
                    <div>
                      <div className="text-orange-400 mb-1 font-semibold">Missing Dimensions Detected:</div>
                      <div className="text-orange-200">{message.queryIntent.missingDimensions.join(', ')}</div>
                    </div>
                  )}

                  {/* Context Enrichment */}
                  {message.queryIntent.contextEnrichment && (
                    <div>
                      <div className="text-purple-400 mb-1 font-semibold">Context Enrichment:</div>
                      <div className="text-purple-200 whitespace-pre-wrap">{message.queryIntent.contextEnrichment}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thought Process / Logs */}
          {message.thoughtProcess && message.thoughtProcess.length > 0 && (
            <div className="mt-4">
              <button 
                onClick={() => setIsThoughtsOpen(!isThoughtsOpen)}
                className="flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors"
              >
                {isThoughtsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Terminal size={14} />
                Thought Process & Logs
              </button>
              
              {isThoughtsOpen && (
                <div className="mt-2 p-3 bg-black/30 rounded-md font-mono text-xs text-green-400 overflow-x-auto">
                  {message.thoughtProcess.map((thought, idx) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      <div className="text-gray-400 mb-1">[{thought.step}]</div>
                      <div className="whitespace-pre-wrap">{thought.details}</div>
                    </div>
                  ))}
                  {message.sql && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-blue-400 mb-1">[SQL Generated]</div>
                      <div className="text-white">{message.sql}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Grid or Single Chart */}
          {message.isDashboard && message.dashboardWidgets ? (
            <DashboardGrid 
              title={message.dashboardTitle}
              widgets={message.dashboardWidgets}
            />
          ) : message.chartData && message.chartType && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <ChartRenderer 
                type={message.chartType} 
                data={message.chartData} 
                config={message.chartConfig || {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
