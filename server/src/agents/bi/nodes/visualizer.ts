import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const visualizerNode = async (state: AgentState) => {
  if (state.error) {
    return {}; // Pasamos el error tal cual
  }

  if (!state.queryResult || state.queryResult.length === 0) {
    return {
      error: "No data found for your query.",
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

  const systemPrompt = `You are a Data Visualization Expert using D3.js concepts.
  Your goal is to decide the best visualization type and configuration for the provided data.
  
  User Query: "${state.naturalQuery}"
  Data Columns: ${dataColumns}
  Data Sample: ${dataSample}
  
  Available Chart Types: 'bar', 'line', 'pie', 'scatter', 'table', 'card' (for single values).
  
  Task:
  1. Determine the best 'visualizationType'.
  2. Create a 'chartConfig' object that describes how to map the data to the chart.
     - For 'bar'/'line': identify 'xKey' (categories/time) and 'yKey' (values).
     - For 'pie': identify 'labelKey' and 'valueKey'.
     - For 'card': identify the 'valueKey' and 'label'.
     - For 'table': list 'columns' to show.
  
  Output JSON format ONLY:
  {
    "visualizationType": "...",
    "chartConfig": { ... },
    "summary": "A brief 1-sentence summary of what this data shows."
  }
  `;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Generate visualization config."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    return {
      visualizationType: result.visualizationType,
      chartConfig: result.chartConfig,
      // Agregamos un mensaje final del asistente
      messages: [new HumanMessage(result.summary || "Here is the visualization for your data.")],
    };
  } catch (error) {
    console.error("Error parsing visualization config:", error);
    // Fallback a tabla si falla la IA
    return {
      visualizationType: "table",
      chartConfig: { columns: Object.keys(state.queryResult[0]) },
    };
  }
};
