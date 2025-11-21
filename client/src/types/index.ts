export interface DashboardWidget {
  query: string;
  description: string;
  data?: any[];
  chartType?: string;
  chartConfig?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  chartData?: any;
  chartType?: 'bar' | 'line' | 'pie' | 'card' | 'table';
  chartConfig?: any;
  sql?: string;
  kpis?: any;
  thoughtProcess?: {
    step: string;
    details: string;
  }[];
  // Dashboard support
  isDashboard?: boolean;
  dashboardTitle?: string;
  dashboardWidgets?: DashboardWidget[];
  // Intent Clarifier support
  queryIntent?: {
    isAmbiguous: boolean;
    missingDimensions: string[];
    internalQuestions: string[];
    originalQuery: string;
    enrichedQuery: string;
    assumptions: {
      timePeriod?: string;
      region?: string;
      metric?: string;
      limit?: number;
      groupBy?: string[];
      orderBy?: string;
      filters?: string[];
    };
    contextEnrichment: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface AgentState {
  messages: ChatMessage[];
  currentChart?: any;
  isLoading: boolean;
  isConnected: boolean;
}
