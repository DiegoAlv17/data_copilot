import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Context Validator Node
 * Filtra consultas que no son relevantes para la base de datos
 * y rechaza preguntas fuera de contexto (historia, geografía, cultura general, etc.)
 */
export const contextValidatorNode = async (state: AgentState) => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.1,
    apiKey: apiKey
  });

  console.log(`🔍 Validating context for: "${state.naturalQuery}"`);

  const systemPrompt = `You are a Context Validator for a Business Intelligence Database System.

Your ONLY job is to determine if a user's question is RELEVANT to a business database or if it's OUT OF CONTEXT.

Database Context:
- This is a Northwind database (orders, customers, products, employees, suppliers, categories)
- It contains business data: sales, orders, products, customers, employees, shipping
- It has historical data from 1996-1998

User Query: "${state.naturalQuery}"

RULES FOR IN-CONTEXT (VALID) queries:
✅ Questions about sales, revenue, orders, products, customers
✅ Business metrics and KPIs (totals, averages, trends)
✅ Employee data, customer data, product data
✅ Regional analysis, category breakdowns
✅ Time-based trends (monthly, yearly)
✅ Top performers, rankings, comparisons
✅ Greetings ("hello", "hi", "thanks") - these are valid social interactions

RULES FOR OUT-OF-CONTEXT (INVALID) queries:
❌ General knowledge questions (history, geography, science, culture)
❌ Math calculations not related to database (e.g., "what's 5+5?")
❌ Current events, news, weather
❌ Personal advice, recommendations
❌ Questions about topics completely unrelated to business data
❌ Technical questions about programming, AI, etc. (unless about this system)

EXAMPLES:

"¿Quién descubrió América?" → OUT_OF_CONTEXT (history question)
"What is the capital of France?" → OUT_OF_CONTEXT (geography)
"How do I bake a cake?" → OUT_OF_CONTEXT (cooking)
"What's the weather today?" → OUT_OF_CONTEXT (current events)
"Explain quantum physics" → OUT_OF_CONTEXT (science)

"Top 5 products by sales" → IN_CONTEXT (business query)
"Show me revenue by region" → IN_CONTEXT (business query)
"Which employee has the most orders?" → IN_CONTEXT (business query)
"Hello" → IN_CONTEXT (greeting)
"Thank you" → IN_CONTEXT (social interaction)
"What data do you have?" → IN_CONTEXT (system question)

OUTPUT FORMAT (JSON only):
{
  "isValid": true/false,
  "reason": "Brief explanation why this is or isn't relevant to the database",
  "suggestedResponse": "If invalid, a friendly message to user explaining what the system can help with"
}

IMPORTANT: Be generous with greetings, social interactions, and system-related questions. Only reject questions that are CLEARLY unrelated to business data.
`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Validate this query."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    if (!result.isValid) {
      console.log(`   ❌ Query rejected: ${result.reason}`);
      return {
        messages: [response],
        error: result.suggestedResponse || "Lo siento, solo puedo ayudarte con consultas sobre la base de datos de ventas, productos, clientes y empleados.",
        queryResult: []
      };
    }

    console.log(`   ✅ Query is valid: ${result.reason}`);
    return {
      messages: [response]
    };
  } catch (error) {
    console.error("   ⚠️ Error parsing context validation, allowing query to continue:", error);
    // Si falla el parser, permitimos que continúe (fail-safe)
    return {
      messages: [response]
    };
  }
};
