import { AgentState, DashboardWidget } from "../state";
import { translatorNode } from "./translator";
import { executorNode } from "./executor";
import { visualizerNode } from "./visualizer";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Dashboard Builder Node
 * Procesa cada sub-query del dashboard y genera múltiples widgets
 */
export const dashboardBuilderNode = async (state: AgentState) => {
  if (!state.isDashboard || !state.dashboardSubQueries || state.dashboardSubQueries.length === 0) {
    return {}; // No es un dashboard, continuar con flujo normal
  }

  console.log(`📊 Building dashboard with ${state.dashboardSubQueries.length} widgets...`);

  const widgets: DashboardWidget[] = [];

  // Procesar cada sub-query secuencialmente
  for (const subQuery of state.dashboardSubQueries) {
    try {
      console.log(`  ➜ Processing: "${subQuery.query}"`);

      // Crear un estado temporal para esta sub-query
      const subState: AgentState = {
        messages: [new HumanMessage(subQuery.query)],
        naturalQuery: subQuery.query,
      };

      // Ejecutar el pipeline completo para esta sub-query
      const translatedState = await translatorNode(subState);
      
      if ('error' in translatedState && translatedState.error) {
        console.error(`    ✗ Translation error: ${translatedState.error}`);
        continue;
      }

      const executedState = await executorNode({ ...subState, ...translatedState });
      
      if ('error' in executedState && executedState.error) {
        console.error(`    ✗ Execution error: ${executedState.error}`);
        continue;
      }

      const visualizedState = await visualizerNode({ ...subState, ...translatedState, ...executedState });

      // Agregar widget al dashboard
      widgets.push({
        query: subQuery.query,
        description: subQuery.description,
        sqlQuery: translatedState.sqlQuery,
        data: executedState.queryResult,
        chartType: visualizedState.visualizationType,
        chartConfig: visualizedState.chartConfig,
      });

      console.log(`    ✓ Widget created: ${visualizedState.visualizationType}`);

    } catch (error: any) {
      console.error(`    ✗ Error processing sub-query "${subQuery.query}":`, error.message);
    }
  }

  if (widgets.length === 0) {
    return {
      error: "Failed to generate any widgets for the dashboard.",
    };
  }

  console.log(`✅ Dashboard built successfully with ${widgets.length} widgets`);

  return {
    dashboardWidgets: widgets,
    messages: [
      new HumanMessage(
        `I've created a comprehensive ${state.dashboardTitle || 'dashboard'} with ${widgets.length} visualizations.`
      ),
    ],
  };
};
