import { AgentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

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

  const systemPrompt = `Eres un Validador de Contexto ESTRICTO para un Sistema de Inteligencia de Negocios.

Tu ÚNICA tarea es determinar si la pregunta del usuario es RELEVANTE para una base de datos de negocios o si está FUERA DE CONTEXTO.

Contexto de la Base de Datos:
- Esta es una base de datos Northwind (pedidos, clientes, productos, empleados, proveedores, categorías)
- Contiene datos de negocio: ventas, pedidos, productos, clientes, empleados, envíos
- Tiene datos históricos de 1996-1998
- NO contiene datos de deportes, fútbol, mundiales, equipos deportivos, ni eventos actuales

Consulta del Usuario: "${state.naturalQuery}"

REGLAS PARA CONSULTAS VÁLIDAS (EN CONTEXTO):
✅ Preguntas sobre ventas, ingresos, pedidos, productos, clientes de la base de datos
✅ Métricas de negocio y KPIs (totales, promedios, tendencias)
✅ Datos de empleados, clientes, productos de Northwind
✅ Análisis regional, desglose por categorías de productos
✅ Tendencias temporales de ventas (mensual, anual)
✅ Top performers, rankings de productos/clientes/empleados
✅ Saludos ("hola", "gracias", "buenos días") - son interacciones sociales válidas

REGLAS PARA CONSULTAS INVÁLIDAS (FUERA DE CONTEXTO) - RECHAZAR INMEDIATAMENTE:
❌ DEPORTES: fútbol, mundiales, copas, equipos, jugadores, partidos, Argentina/Brasil/etc en contexto deportivo
❌ Preguntas de conocimiento general (historia, geografía, ciencia, cultura)
❌ Cálculos matemáticos no relacionados con la base de datos
❌ Eventos actuales, noticias, clima
❌ Cualquier cosa sobre el Mundial 2026, Copa América, Champions League, etc.
❌ Consejos personales, recomendaciones
❌ Preguntas sobre temas no relacionados con datos de negocio/ventas

EJEMPLOS DE RECHAZO INMEDIATO:

"¿Cuál es el grupo de Argentina en el mundial 2026?" → FUERA_DE_CONTEXTO (deportes)
"¿Quién ganó la Champions League?" → FUERA_DE_CONTEXTO (deportes)
"¿Quién descubrió América?" → FUERA_DE_CONTEXTO (historia)
"¿Cuál es la capital de Francia?" → FUERA_DE_CONTEXTO (geografía)
"¿Cómo hago un pastel?" → FUERA_DE_CONTEXTO (cocina)

EJEMPLOS VÁLIDOS:

"Top 5 productos por ventas" → EN_CONTEXTO
"Muéstrame los ingresos por región" → EN_CONTEXTO
"¿Qué empleado tiene más pedidos?" → EN_CONTEXTO
"Hola" → EN_CONTEXTO
"Gracias" → EN_CONTEXTO

FORMATO DE SALIDA (SOLO JSON, sin explicación adicional):
{"isValid": false, "reason": "Pregunta sobre deportes/mundial, fuera del contexto de datos de negocio"}

o

{"isValid": true, "reason": "Consulta válida sobre datos de negocio"}
`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Valida esta consulta y responde SOLO con JSON."),
  ]);

  try {
    const rawContent = response.content.toString();
    console.log(`   📋 Raw validator response: ${rawContent.substring(0, 200)}`);
    
    const content = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    console.log(`   🔍 Parsed result: isValid=${result.isValid}, reason=${result.reason}`);

    if (!result.isValid) {
      console.log(`   ❌ Query REJECTED - Out of context: ${result.reason}`);
      
      // Crear un mensaje amigable en español para el usuario
      const friendlyMessage = `Lo siento, esa pregunta está fuera de mi área de conocimiento. 

Soy un asistente especializado en análisis de datos de negocio. Puedo ayudarte con consultas sobre:

📊 **Ventas y pedidos** - Tendencias, totales, comparaciones
👥 **Clientes** - Análisis por región, comportamiento de compra
📦 **Productos** - Rankings, categorías, inventario
👨‍💼 **Empleados** - Rendimiento, productividad
🚚 **Envíos** - Tiempos, costos, proveedores

Por ejemplo, puedes preguntarme:
• "¿Cuáles son los 5 productos más vendidos?"
• "Muéstrame las ventas por mes"
• "¿Qué clientes han gastado más?"`;

      return {
        messages: [new AIMessage(friendlyMessage)],
        error: friendlyMessage,
        queryResult: []
      };
    }

    console.log(`   ✅ Query APPROVED: ${result.reason}`);
    return {
      messages: [response]
    };
  } catch (parseError) {
    console.error("   ⚠️ Error parsing context validation response:", parseError);
    console.error("   ⚠️ Raw response was:", response.content.toString());
    
    // Si falla el parser, verificar manualmente si parece fuera de contexto
    const rawLower = response.content.toString().toLowerCase();
    if (rawLower.includes('"isvalid": false') || rawLower.includes('"isvalid":false') || 
        rawLower.includes('fuera_de_contexto') || rawLower.includes('out_of_context')) {
      console.log(`   ❌ Query REJECTED (detected from raw response)`);
      const friendlyMessage = `Lo siento, esa pregunta está fuera de mi área de conocimiento. Solo puedo ayudarte con consultas sobre ventas, productos, clientes y empleados de nuestra base de datos de negocio.`;
      return {
        messages: [new AIMessage(friendlyMessage)],
        error: friendlyMessage,
        queryResult: []
      };
    }
    
    // Si no podemos determinar, permitimos continuar (fail-safe)
    console.log(`   ⚠️ Could not parse, allowing query to continue`);
    return {
      messages: [response]
    };
  }
};
