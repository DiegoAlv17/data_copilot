import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Dashboard Orchestrator Node
 * Detecta si la consulta del usuario requiere un dashboard completo (múltiples gráficos)
 * y descompone la query en sub-consultas específicas.
 */
export const dashboardOrchestratorNode = async (state: AgentState) => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.3,
    apiKey: apiKey
  });

  const systemPrompt = `You are a BI Dashboard Orchestrator. Your role is to analyze user queries and determine if they require a comprehensive dashboard with multiple visualizations.

User Query: "${state.naturalQuery}"

Task:
1. Determine if this query needs a SINGLE chart or a COMPLETE DASHBOARD (multiple charts).
2. If SINGLE chart: return { "isDashboard": false }
3. If DASHBOARD: return { 
     "isDashboard": true,
     "dashboardTitle": "...",
     "subQueries": [
       { "query": "...", "description": "..." },
       { "query": "...", "description": "..." }
     ]
   }

Dashboard indicators:
- "estado financiero", "financial overview", "dashboard", "resumen", "overview"
- Questions asking for "overall", "complete", "comprehensive" analysis
- Questions combining multiple metrics (e.g., "sales, revenue, and profit")

Examples of DASHBOARD queries:
- "Quiero ver el estado financiero de mi empresa" → Generate these sub-queries (using ONLY available data):
  1. "Total revenue from all orders" (Card - calculate from order_details: SUM(unit_price * quantity * (1 - discount)))
  2. "Total number of orders" (Card - COUNT from orders table)
  3. "Average order value" (Card - AVG of order totals)
  4. "Monthly order trend for 1997" (Line Chart - group by month, year 1997)
  5. "Revenue by product category" (Bar Chart - JOIN products, categories, order_details)
  6. "Orders by customer country" (Bar Chart - use customers.country)
  7. "Top 10 customers by total spent" (Table - calculate from orders and order_details)
  8. "Top 10 best-selling products by quantity" (Table - use order_details.quantity)

CRITICAL TIME PERIOD RULES:
- The database contains historical data from 1996-1998 (Northwind dataset)
- NEVER filter by 'current year' or dates after 1998
- Default to 'all time' or specific years like 1997, 1998
- For "last 12 months" queries, use year 1997 or 1998

IMPORTANT: The database is a Northwind-style database with tables like orders, customers, products, categories, order_details, employees, suppliers.
- DO NOT generate queries asking for columns like 'debt', 'department', 'profit_margin', 'assets', 'liabilities' - they don't exist.
- Calculate revenue from: order_details (unit_price * quantity * (1 - discount))
- For financial analysis, use available data: orders, order_details, products, customers.
- Vendors = Suppliers (use suppliers table)

- "Show me a complete sales overview" → Sales by region, by product, trends, top performers
- "Dashboard de ventas" → Multiple sales metrics

When creating a Financial Dashboard, ALWAYS include:
- At least 2-3 KPI cards (totals, averages, counts)
- 1-2 trend charts (line charts showing evolution over time)
- 2-3 breakdown charts (bar/pie charts by category, region, etc.)
- 1-2 tables (top performers, rankings)

Examples of SINGLE queries:
- "Top 5 products by price" → Single bar chart
- "Sales trend this year" → Single line chart
- "Total revenue" → Single card

Output JSON format ONLY (no explanations):
{
  "isDashboard": true/false,
  "dashboardTitle": "...",
  "subQueries": [ ... ]
}`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Analyze the query."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    return {
      isDashboard: result.isDashboard,
      dashboardTitle: result.dashboardTitle,
      dashboardSubQueries: result.subQueries,
    };
  } catch (error) {
    console.error("Error parsing dashboard orchestrator response:", error);
    // Si falla, asumimos que es una query simple
    return {
      isDashboard: false,
    };
  }
};
