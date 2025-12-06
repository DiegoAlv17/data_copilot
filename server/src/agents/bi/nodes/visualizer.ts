import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const visualizerNode = async (state: AgentState) => {
  if (state.error) {
    return {}; // Pasamos el error tal cual
  }

  if (!state.queryResult || state.queryResult.length === 0) {
    return {
      error: "No se encontraron datos para tu consulta.",
    };
  }

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.2,
    apiKey: apiKey
  });

  const dataSample = JSON.stringify(state.queryResult.slice(0, 5)); // Solo enviamos una muestra para no saturar el contexto
  const dataColumns = Object.keys(state.queryResult[0]).join(", ");
  const dataRowCount = state.queryResult.length;

  // Incluir el tipo sugerido si existe
  const suggestedTypeHint = state.suggestedChartType 
    ? `\n\nSUGGESTED CHART TYPE: "${state.suggestedChartType}" - Consider this suggestion strongly, especially for:
       - 'card': Use when there's only 1 row of data with a single key metric
       - 'table': Use when displaying rankings or multiple columns of data
       - Only override if the data structure clearly doesn't match the suggestion.`
    : '';

  const systemPrompt = `Eres un Experto en Visualización de Datos usando conceptos de D3.js.
  Tu objetivo es decidir el mejor tipo de visualización y configuración para los datos proporcionados.
  
  **IMPORTANTE: El campo 'summary' DEBE estar en ESPAÑOL.**
  
  Consulta del Usuario: "${state.naturalQuery}"
  Columnas de Datos: ${dataColumns}
  Cantidad de Filas: ${dataRowCount}
  Muestra de Datos: ${dataSample}${suggestedTypeHint}
  
  Tipos de Gráficos Disponibles: 'bar', 'line', 'pie', 'scatter', 'table', 'card' (para valores únicos).
  
  REGLAS IMPORTANTES:
  - Usar 'card' SOLO cuando hay exactamente 1 fila con un único valor agregado (ej: total, conteo, promedio)
  - Usar 'table' para rankings, listas, o cuando se muestran múltiples columnas por fila
  - Usar 'bar' para comparar categorías (ej: ventas por región, pedidos por empleado)
  - Usar 'line' para series temporales o tendencias (datos con fechas/meses/años en el eje x)
  - Usar 'pie' para mostrar proporciones de un total (limitado a 6-8 categorías máximo)
  
  Tarea:
  1. Determinar el mejor 'visualizationType'.
  2. Crear un objeto 'chartConfig' que describa cómo mapear los datos al gráfico.
     - Para 'bar'/'line': identificar 'xKey' (categorías/tiempo) y 'yKey' (valores).
     - Para 'pie': identificar 'labelKey' y 'valueKey'.
     - Para 'card': identificar 'valueKey' y 'label'.
     - Para 'table': listar 'columns' a mostrar.
  
  Formato de salida JSON SOLAMENTE:
  {
    "visualizationType": "...",
    "chartConfig": { ... },
    "summary": "Un breve resumen de 1 oración en ESPAÑOL de lo que muestran estos datos."
  }
  `;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Generate visualization config."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    console.log(`  📊 Visualization type: ${result.visualizationType}`);

    return {
      visualizationType: result.visualizationType,
      chartConfig: result.chartConfig,
      // Agregamos un mensaje final del asistente
      messages: [new HumanMessage(result.summary || "Aquí está la visualización de tus datos.")],
    };
  } catch (error) {
    console.error("  ⚠️ Error parsing visualization config:", error);
    console.error("  Response content:", response.content.toString().substring(0, 200));
    // Fallback a tabla si falla la IA
    return {
      visualizationType: "table",
      chartConfig: { columns: Object.keys(state.queryResult[0]) },
      messages: [response],
    };
  }
};
