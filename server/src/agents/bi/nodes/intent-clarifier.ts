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

  const systemPrompt = `Eres un Agente Clarificador de Intención para un sistema de Inteligencia de Negocios.

**IMPORTANTE: TODAS las respuestas DEBEN estar en ESPAÑOL.**

Tu rol es analizar las consultas de los usuarios e identificar CONTEXTO FALTANTE o AMBIGÜEDADES que podrían llevar a resultados incompletos o incorrectos.

Contexto del Esquema de Base de Datos:
${schemaContext}

Consulta del Usuario: "${state.naturalQuery}"

ANÁLISIS CRÍTICO - Hazte estas preguntas:

1. **Dimensión Temporal:**
   - ¿Hay un período de tiempo especificado? (este año, último mes, Q1, histórico, etc.)
   - Si no, ¿cuál debería ser el valor por defecto? (todo el tiempo, año actual, últimos 12 meses?)

2. **Dimensión Geográfica:**
   - ¿Hay una región/país/territorio especificado?
   - ¿Los resultados deberían filtrarse por geografía o mostrar todos?

3. **Dimensión Categórica:**
   - Para productos: ¿qué categoría? ¿todas las categorías?
   - Para clientes: ¿qué segmento? ¿todos los segmentos?
   - Para empleados: ¿qué departamento/región?

4. **Nivel de Agregación:**
   - ¿Cuál es la agrupación? (por producto, por categoría, por mes, por región?)
   - ¿Es un ranking (top N), un total, un promedio, una tendencia?

5. **Clarificación de Métrica:**
   - ¿"Top" por qué métrica? (ingresos, cantidad, ganancia, precio?)
   - ¿Debería incluir métricas relacionadas? (ej: top productos + sus ingresos + cantidad vendida)

6. **Reglas de Negocio:**
   - ¿Deberían excluirse productos descontinuados?
   - ¿Solo considerar clientes activos?
   - ¿Algún otro filtro de lógica de negocio?

EJEMPLOS:

Consulta: "Top 5 productos"
Análisis:
- ❌ Falta: ¿Top por qué? (ingresos, cantidad, precio?)
- ❌ Falta: ¿Período de tiempo? (todo el tiempo, este año, último mes?)
- ❌ Falta: ¿Categoría? (todas o específica?)
- ❌ Falta: ¿Región? (todos los países o específico?)
- ❌ Falta: ¿Incluir descontinuados? (sí/no?)

Intención Enriquecida:
"Top 5 productos por ingresos totales (todo el tiempo, todas las categorías, todas las regiones, incluyendo productos descontinuados)"

Consulta: "Tendencia mensual de ventas"
Análisis:
- ❌ Falta: ¿Cuántos meses? (últimos 12 meses, este año, año pasado?)
- ❌ Falta: ¿Por qué? (ventas totales, por producto, por categoría, por región?)
- ❌ Falta: ¿Qué métrica? (ingresos, cantidad, pedidos?)

Intención Enriquecida:
"Ingresos totales mensuales de los últimos 12 meses"

FORMATO DE SALIDA (solo JSON, sin explicaciones):
{
  "isAmbiguous": true/false,
  "missingDimensions": ["temporal", "geográfica", "métrica", etc.],
  "internalQuestions": [
    "¿Qué período de tiempo se debe considerar?",
    "¿Se deben filtrar los resultados por región?",
    "¿Qué métrica define 'top'?"
  ],
  "enrichedQuery": "... (EN ESPAÑOL)",
  "assumptions": {
    "timePeriod": "todo el tiempo" | "año actual" | "últimos 12 meses" | etc.,
    "region": "todas" | "específica",
    "metric": "ingresos" | "cantidad" | "ganancia" | etc.,
    "limit": 5 | 10 | null,
    "groupBy": ["producto", "categoría", etc.],
    "orderBy": "DESC" | "ASC",
    "filters": ["excluir_descontinuados: true", etc.]
  },
  "contextEnrichment": "Contexto adicional sobre qué datos incluir basado en reglas de negocio (EN ESPAÑOL)"
}

IMPORTANTE: 
- Usar el esquema de la base de datos para entender las dimensiones disponibles
- Hacer suposiciones RAZONABLES basadas en prácticas comunes de BI
- Para consultas "top N" sin métrica especificada, usar ingresos por defecto
- **CRÍTICO: Esta es una base de datos Northwind con datos históricos de 1996-1998**
- Para consultas basadas en tiempo sin período, usar "todo el tiempo" o "año 1997"
- NUNCA asumir "año actual" - usar "todo el tiempo" o años específicos (1996, 1997, 1998)
- Siempre considerar reglas de negocio (excluir descontinuados, solo activos, etc.)
- **TODAS las respuestas de texto deben estar en ESPAÑOL**
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
        contextEnrichment: "Sin contexto adicional"
      }
    };
  }
};
