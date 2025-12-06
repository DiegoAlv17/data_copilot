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

  const systemPrompt = `Eres un Orquestador de Dashboards BI. Tu rol es analizar las consultas de los usuarios y determinar si requieren un dashboard completo con múltiples visualizaciones.

**IMPORTANTE: TODAS las respuestas (títulos, descripciones) DEBEN estar en ESPAÑOL.**

Consulta del Usuario: "${state.naturalQuery}"

Tarea:
1. Determinar si esta consulta necesita un SOLO gráfico o un DASHBOARD COMPLETO (múltiples gráficos).
2. Si es UN SOLO gráfico: devolver { "isDashboard": false }
3. Si es DASHBOARD: devolver { 
     "isDashboard": true,
     "dashboardTitle": "...",
     "subQueries": [
       { "query": "...", "description": "..." },
       { "query": "...", "description": "..." }
     ]
   }

Indicadores de DASHBOARD:
- "estado financiero", "resumen financiero", "dashboard", "resumen", "panorama general"
- Preguntas que piden análisis "general", "completo", "integral"
- Preguntas que combinan múltiples métricas (ej: "ventas, ingresos y ganancias")

Ejemplos de consultas de DASHBOARD:
- "Quiero ver el estado financiero de mi empresa" → Generar estas sub-consultas:
  1. "Ingresos totales de todos los pedidos" (Card - calcular desde order_details: SUM(unit_price * quantity * (1 - discount)))
  2. "Número total de pedidos" (Card - COUNT de la tabla orders)
  3. "Valor promedio por pedido" (Card - AVG de totales de pedidos)
  4. "Tendencia mensual de pedidos en 1997" (Gráfico de Línea - agrupar por mes, año 1997)
  5. "Ingresos por categoría de producto" (Gráfico de Barras - JOIN products, categories, order_details)
  6. "Pedidos por país del cliente" (Gráfico de Barras - usar customers.country)
  7. "Top 10 clientes por total gastado" (Tabla - calcular desde orders y order_details)
  8. "Top 10 productos más vendidos por cantidad" (Tabla - usar order_details.quantity)

REGLAS CRÍTICAS DE PERÍODO DE TIEMPO:
- La base de datos contiene datos históricos de 1996-1998 (dataset Northwind)
- NUNCA filtrar por 'año actual' o fechas después de 1998
- Por defecto usar 'todo el tiempo' o años específicos como 1997, 1998
- Para consultas de "últimos 12 meses", usar año 1997 o 1998

IMPORTANTE: La base de datos es estilo Northwind con tablas como orders, customers, products, categories, order_details, employees, suppliers.
- NO generar consultas pidiendo columnas como 'debt', 'department', 'profit_margin', 'assets', 'liabilities' - no existen.
- Calcular ingresos desde: order_details (unit_price * quantity * (1 - discount))
- Para análisis financiero, usar datos disponibles: orders, order_details, products, customers.
- Vendors = Suppliers (usar tabla suppliers)

Al crear un Dashboard Financiero, SIEMPRE incluir:
- Al menos 2-3 tarjetas KPI (totales, promedios, conteos)
- 1-2 gráficos de tendencia (líneas mostrando evolución en el tiempo)
- 2-3 gráficos de desglose (barras/pie por categoría, región, etc.)
- 1-2 tablas (mejores desempeños, rankings)

Ejemplos de consultas SIMPLES:
- "Top 5 productos por precio" → Un solo gráfico de barras
- "Tendencia de ventas este año" → Un solo gráfico de línea
- "Ingresos totales" → Una sola tarjeta

Formato de salida JSON SOLAMENTE (sin explicaciones):
{
  "isDashboard": true/false,
  "dashboardTitle": "... (EN ESPAÑOL)",
  "subQueries": [ { "query": "...", "description": "... (EN ESPAÑOL)" } ]
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
