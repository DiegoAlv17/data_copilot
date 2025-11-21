import { BaseMessage } from "@langchain/core/messages";

export interface DashboardWidget {
  query: string;
  description: string;
  sqlQuery?: string;
  data?: any[];
  chartType?: string;
  chartConfig?: any;
}

export interface QueryIntent {
  isAmbiguous: boolean;
  missingDimensions?: string[];
  internalQuestions?: string[];
  originalQuery: string;
  enrichedQuery: string;
  assumptions?: {
    timePeriod?: string;
    region?: string;
    metric?: string;
    limit?: number;
    groupBy?: string[];
    orderBy?: string;
    filters?: string[];
  };
  contextEnrichment?: string;
}

export interface AgentState {
  messages: BaseMessage[];
  naturalQuery: string;
  sqlQuery?: string;
  queryResult?: any[];
  chartConfig?: any;
  error?: string;
  visualizationType?: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'card';
  
  // Intent analysis
  queryIntent?: QueryIntent;
  
  // Dashboard support
  isDashboard?: boolean;
  dashboardTitle?: string;
  dashboardSubQueries?: { query: string; description: string }[];
  dashboardWidgets?: DashboardWidget[];
}
