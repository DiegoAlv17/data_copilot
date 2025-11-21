import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { translatorNode } from "./nodes/translator";
import { executorNode } from "./nodes/executor";
import { visualizerNode } from "./nodes/visualizer";
import { dashboardOrchestratorNode } from "./nodes/dashboard-orchestrator";
import { dashboardBuilderNode } from "./nodes/dashboard-builder";
import { intentClarifierNode } from "./nodes/intent-clarifier";

// Definir el grafo de estado
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: {
      value: (x: any, y: any) => x.concat(y),
      default: () => [],
    },
    naturalQuery: {
      value: (x: any, y: any) => y ?? x,
      default: () => "",
    },
    sqlQuery: {
      value: (x: any, y: any) => y ?? x,
    },
    queryResult: {
      value: (x: any, y: any) => y ?? x,
    },
    chartConfig: {
      value: (x: any, y: any) => y ?? x,
    },
    error: {
      value: (x: any, y: any) => y ?? x,
    },
    visualizationType: {
      value: (x: any, y: any) => y ?? x,
    },
    queryIntent: {
      value: (x: any, y: any) => y ?? x,
    },
    isDashboard: {
      value: (x: any, y: any) => y ?? x,
    },
    dashboardTitle: {
      value: (x: any, y: any) => y ?? x,
    },
    dashboardSubQueries: {
      value: (x: any, y: any) => y ?? x,
    },
    dashboardWidgets: {
      value: (x: any, y: any) => y ?? x,
    },
  },
})
  .addNode("intentClarifier", intentClarifierNode)
  .addNode("orchestrator", dashboardOrchestratorNode)
  .addNode("translator", translatorNode)
  .addNode("executor", executorNode)
  .addNode("visualizer", visualizerNode)
  .addNode("dashboardBuilder", dashboardBuilderNode)
  .addEdge(START, "intentClarifier")
  .addEdge("intentClarifier", "orchestrator")
  .addConditionalEdges(
    "orchestrator",
    (state: AgentState) => {
      return state.isDashboard ? "dashboardBuilder" : "translator";
    },
    {
      dashboardBuilder: "dashboardBuilder",
      translator: "translator",
    }
  )
  .addEdge("translator", "executor")
  .addEdge("executor", "visualizer")
  .addEdge("visualizer", END)
  .addEdge("dashboardBuilder", END);

// Compilar el grafo
export const biAgent = workflow.compile();

