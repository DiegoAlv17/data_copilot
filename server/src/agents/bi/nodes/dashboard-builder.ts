import { AgentState, DashboardWidget } from "../state";
import { translatorNode } from "./translator";
import { executorNode } from "./executor";
import { visualizerNode } from "./visualizer";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Extrae el tipo de gráfico sugerido de la descripción
 * Ej: "Card - Shows total orders" -> "card"
 */
function extractSuggestedChartType(description: string): string | undefined {
  const match = description.match(/^(Card|Bar Chart|Line Chart|Pie Chart|Table)\s*[-–]/i);
  if (match) {
    const type = match[1].toLowerCase();
    if (type === 'bar chart') return 'bar';
    if (type === 'line chart') return 'line';
    if (type === 'pie chart') return 'pie';
    return type;
  }
  return undefined;
}

/**
 * Limpia la descripción removiendo el prefijo del tipo de gráfico
 * Ej: "Card - Shows total orders" -> "Shows total orders"
 */
function cleanDescription(description: string): string {
  return description.replace(/^(Card|Bar Chart|Line Chart|Pie Chart|Table)\s*[-–]\s*/i, '').trim();
}

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
      
      // Extraer tipo de gráfico sugerido de la descripción
      const suggestedChartType = extractSuggestedChartType(subQuery.description);
      const cleanedDescription = cleanDescription(subQuery.description);

      // Crear un estado temporal para esta sub-query
      const subState: AgentState = {
        messages: [new HumanMessage(subQuery.query)],
        naturalQuery: subQuery.query,
        suggestedChartType: suggestedChartType, // Pasar el tipo sugerido
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
        description: cleanedDescription, // Usar descripción limpia
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
      error: "No se pudo generar ningún widget para el dashboard.",
    };
  }

  console.log(`✅ Dashboard built successfully with ${widgets.length} widgets`);

  return {
    dashboardWidgets: widgets,
    messages: [
      new HumanMessage(
        `He creado un ${state.dashboardTitle || 'dashboard'} completo con ${widgets.length} visualizaciones.`
      ),
    ],
  };
};
