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
  
  CRITICAL RULES:
  1. Generate ONLY the SQL query. Do not include markdown formatting like \`\`\`sql.
  2. Use only SELECT statements.
  3. **NEVER invent or assume columns that don't exist in the schema above.**
  4. **If the user asks for columns like 'department', 'debt', 'ratio', or any financial metric not explicitly in the schema, return: "ERROR: I cannot answer that with the available data."**
  5. **Use ONLY PostgreSQL syntax:**
     - For dates: DATE_TRUNC('month', column), EXTRACT(YEAR FROM column), column::date
     - NEVER use generic functions like date(column, interval) or non-PostgreSQL syntax
  6. **CRITICAL TIME FILTER:**
     - This is a Northwind database with data from 1996-1998
     - NEVER use CURRENT_DATE, NOW(), or 'current year'
     - For "current year" requests, use: WHERE EXTRACT(YEAR FROM order_date) = 1997
     - For "last 12 months", use: WHERE order_date >= '1997-01-01' AND order_date < '1998-01-01'
     - Default to ALL TIME (no date filter) unless specifically asked
  7. Always limit results to the specified limit or 100 rows unless specified otherwise.
  8. Apply filters based on the assumptions provided (e.g., exclude discontinued products, filter by time period).
  9. Use appropriate aggregations (SUM, COUNT, AVG) based on the metric assumption.
  10. ORDER BY the specified metric in DESC or ASC as indicated.
  11. Include JOINs when necessary to get related data from multiple tables.
  12. Use proper column aliases for clarity.
  13. **Before generating SQL, verify that ALL columns you plan to use exist in the schema above.**
  `;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(state.naturalQuery),
  ]);

  const sqlQuery = response.content.toString().trim().replace(/```sql/g, "").replace(/```/g, "").trim();

  console.log(`  📝 SQL Generated: ${sqlQuery}`);

  return {
    sqlQuery,
    messages: [response],
  };
};
