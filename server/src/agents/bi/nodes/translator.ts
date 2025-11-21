import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSchemaTool } from "../tools/databaseTools";

export const translatorNode = async (state: AgentState) => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY is not set");
  }
  
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    maxOutputTokens: 2048,
    apiKey: apiKey
  });



  // Obtenemos el esquema primero para incluirlo en el contexto
  const schema = await getSchemaTool.func("");

  // Construir contexto enriquecido del Intent Clarifier
  let enrichedContext = "";
  if (state.queryIntent) {
    enrichedContext = `
INTENT ANALYSIS:
- Original Query: "${state.queryIntent.originalQuery}"
- Enriched Query: "${state.queryIntent.enrichedQuery}"
- Assumptions: ${JSON.stringify(state.queryIntent.assumptions, null, 2)}
- Additional Context: ${state.queryIntent.contextEnrichment || "None"}

The user's intent has been clarified. Use the enriched query and assumptions to generate the most accurate SQL.
`;
  }

  const systemPrompt = `You are an expert SQL Data Analyst. 
  Your task is to translate natural language questions into valid PostgreSQL queries.
  
  Database Schema:
  ${schema}
  
  ${enrichedContext}
  
  Rules:
  1. Generate ONLY the SQL query. Do not include markdown formatting like \`\`\`sql.
  2. Use only SELECT statements.
  3. If the user asks for something not in the schema, return "ERROR: I cannot answer that with the available data."
  4. Always limit results to the specified limit or 100 rows unless specified otherwise.
  5. Use standard PostgreSQL syntax.
  6. Apply filters based on the assumptions provided (e.g., exclude discontinued products, filter by time period).
  7. Use appropriate aggregations (SUM, COUNT, AVG) based on the metric assumption.
  8. ORDER BY the specified metric in DESC or ASC as indicated.
  9. Include JOINs when necessary to get related data from multiple tables.
  10. Use proper column aliases for clarity.
  `;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(state.naturalQuery),
  ]);

  const sqlQuery = response.content.toString().trim().replace(/```sql/g, "").replace(/```/g, "").trim();

  return {
    sqlQuery,
    messages: [response],
  };
};
