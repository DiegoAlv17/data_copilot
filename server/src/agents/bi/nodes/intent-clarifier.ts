import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSchemaTool } from "../tools/databaseTools";

/**
 * Intent Clarifier Node
 * Analiza queries ambiguas y enriquece el contexto haciendo preguntas internas
 * para determinar dimensiones faltantes (región, categoría, período, etc.)
 */
export const intentClarifierNode = async (state: AgentState) => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.3,
    apiKey: apiKey
  });

  console.log(`🔍 Analyzing query intent: "${state.naturalQuery}"`);

  // Obtener esquema de la base de datos para contexto
  let schemaContext = "";
  try {
    const schemaResult = await getSchemaTool.invoke({});
    schemaContext = JSON.stringify(schemaResult, null, 2);
  } catch (error) {
    console.error("Error fetching schema:", error);
  }

  const systemPrompt = `You are an Intent Clarifier Agent for a Business Intelligence system.

Your role is to analyze user queries and identify MISSING CONTEXT or AMBIGUITIES that could lead to incomplete or incorrect results.

Database Schema Context:
${schemaContext}

User Query: "${state.naturalQuery}"

CRITICAL ANALYSIS - Ask yourself these questions:

1. **Temporal Dimension:**
   - Is there a time period specified? (this year, last month, Q1, historical, etc.)
   - If not, what should be the default? (all time, current year, last 12 months?)

2. **Geographic Dimension:**
   - Is there a region/country/territory specified?
   - Should results be filtered by geography or show all?

3. **Categorical Dimension:**
   - For products: which category? all categories?
   - For customers: which segment? all segments?
   - For employees: which department/region?

4. **Aggregation Level:**
   - What is the grouping? (by product, by category, by month, by region?)
   - Is it a ranking (top N), a total, an average, a trend?

5. **Metric Clarification:**
   - "Top" by what metric? (revenue, quantity, profit, price?)
   - Should it include related metrics? (e.g., top products + their revenue + quantity sold)

6. **Business Rules:**
   - Should discontinued products be excluded?
   - Should only active customers be considered?
   - Any other business logic filters?

EXAMPLES:

Query: "Top 5 products"
Analysis:
- ❌ Missing: Top by what? (revenue, quantity, price?)
- ❌ Missing: Time period? (all time, this year, last month?)
- ❌ Missing: Category? (all or specific?)
- ❌ Missing: Region? (all countries or specific?)
- ❌ Missing: Include discontinued? (yes/no?)

Enriched Intent:
"Top 5 products by total revenue (all time, all categories, all regions, including discontinued products)"

Query: "Monthly sales trend"
Analysis:
- ❌ Missing: How many months? (last 12 months, this year, last year?)
- ❌ Missing: By what? (total sales, by product, by category, by region?)
- ❌ Missing: Which metric? (revenue, quantity, orders?)

Enriched Intent:
"Monthly total revenue for the last 12 months"

Query: "Customer revenue"
Analysis:
- ✅ Somewhat clear but could be enriched
- ❌ Missing: Total or breakdown? (total per customer, top N?)
- ❌ Missing: Time period?

Enriched Intent:
"Top 10 customers by total revenue (all time)"

OUTPUT FORMAT (JSON only, no explanations):
{
  "isAmbiguous": true/false,
  "missingDimensions": ["temporal", "geographic", "metric", etc.],
  "internalQuestions": [
    "What time period should be considered?",
    "Should results be filtered by region?",
    "What metric defines 'top'?"
  ],
  "enrichedQuery": "...",
  "assumptions": {
    "timePeriod": "all time" | "current year" | "last 12 months" | etc.,
    "region": "all" | "specific",
    "metric": "revenue" | "quantity" | "profit" | etc.,
    "limit": 5 | 10 | null,
    "groupBy": ["product", "category", etc.],
    "orderBy": "DESC" | "ASC",
    "filters": ["exclude_discontinued: true", etc.]
  },
  "contextEnrichment": "Additional context about what data to include based on business rules"
}

IMPORTANT: 
- Use the database schema to understand available dimensions
- Make REASONABLE assumptions based on common BI practices
- For "top N" queries without specified metric, default to revenue
- **CRITICAL: This is a Northwind database with historical data from 1996-1998**
- For time-based queries without period, default to "all time" or "year 1997"
- NEVER assume "current year" - use "all time" or specific years (1996, 1997, 1998)
- Always consider business rules (exclude discontinued, active only, etc.)
`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Analyze the query and identify missing context."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    console.log(`   ℹ️  Ambiguous: ${result.isAmbiguous}`);
    console.log(`   ℹ️  Missing dimensions: ${result.missingDimensions?.join(", ") || "none"}`);
    console.log(`   ℹ️  Enriched query: "${result.enrichedQuery}"`);

    // Actualizar la query natural con la versión enriquecida
    return {
      messages: [response],
      naturalQuery: result.enrichedQuery || state.naturalQuery,
      queryIntent: {
        isAmbiguous: result.isAmbiguous,
        missingDimensions: result.missingDimensions,
        internalQuestions: result.internalQuestions,
        originalQuery: state.naturalQuery,
        enrichedQuery: result.enrichedQuery,
        assumptions: result.assumptions,
        contextEnrichment: result.contextEnrichment
      }
    };
  } catch (error) {
    console.error("Error parsing intent clarifier response:", error);
    console.error("Response content:", response.content.toString());
    // Si falla, continuar con la query original pero incluir messages
    return {
      messages: [response],
      queryIntent: {
        isAmbiguous: false,
        originalQuery: state.naturalQuery,
        enrichedQuery: state.naturalQuery,
        assumptions: {},
        contextEnrichment: "No additional context"
      }
    };
  }
};
