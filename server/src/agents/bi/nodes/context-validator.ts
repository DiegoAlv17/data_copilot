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

  const systemPrompt = `Eres un Validador de Contexto para un Sistema de Inteligencia de Negocios.

Tu ÚNICA tarea es determinar si la pregunta del usuario es RELEVANTE para una base de datos de negocios o si está FUERA DE CONTEXTO.

Contexto de la Base de Datos:
- Esta es una base de datos Northwind (pedidos, clientes, productos, empleados, proveedores, categorías)
- Contiene datos de negocio: ventas, pedidos, productos, clientes, empleados, envíos
- Tiene datos históricos de 1996-1998

Consulta del Usuario: "${state.naturalQuery}"

REGLAS PARA CONSULTAS VÁLIDAS (EN CONTEXTO):
✅ Preguntas sobre ventas, ingresos, pedidos, productos, clientes
✅ Métricas de negocio y KPIs (totales, promedios, tendencias)
✅ Datos de empleados, clientes, productos
✅ Análisis regional, desglose por categorías
✅ Tendencias temporales (mensual, anual)
✅ Top performers, rankings, comparaciones
✅ Saludos ("hola", "gracias", "buenos días") - son interacciones sociales válidas

REGLAS PARA CONSULTAS INVÁLIDAS (FUERA DE CONTEXTO):
❌ Preguntas de conocimiento general (historia, geografía, ciencia, cultura, deportes)
❌ Cálculos matemáticos no relacionados con la base de datos (ej: "cuánto es 5+5?")
❌ Eventos actuales, noticias, clima, deportes actuales
❌ Consejos personales, recomendaciones
❌ Preguntas sobre temas completamente no relacionados con datos de negocio
❌ Preguntas técnicas sobre programación, IA, etc. (a menos que sea sobre este sistema)

EJEMPLOS:

"¿Quién descubrió América?" → FUERA_DE_CONTEXTO (pregunta de historia)
"¿Cuál es la capital de Francia?" → FUERA_DE_CONTEXTO (geografía)
"¿Cómo hago un pastel?" → FUERA_DE_CONTEXTO (cocina)
"¿Cuál es el grupo de Argentina en el mundial?" → FUERA_DE_CONTEXTO (deportes)
"Explica la física cuántica" → FUERA_DE_CONTEXTO (ciencia)

"Top 5 productos por ventas" → EN_CONTEXTO (consulta de negocio)
"Muéstrame los ingresos por región" → EN_CONTEXTO (consulta de negocio)
"¿Qué empleado tiene más pedidos?" → EN_CONTEXTO (consulta de negocio)
"Hola" → EN_CONTEXTO (saludo)
"Gracias" → EN_CONTEXTO (interacción social)
"¿Qué datos tienes?" → EN_CONTEXTO (pregunta sobre el sistema)

FORMATO DE SALIDA (solo JSON):
{
  "isValid": true/false,
  "reason": "Breve explicación de por qué es o no es relevante para la base de datos"
}

IMPORTANTE: Sé generoso con saludos, interacciones sociales y preguntas relacionadas con el sistema. Solo rechaza preguntas que sean CLARAMENTE no relacionadas con datos de negocio.
`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("Valida esta consulta."),
  ]);

  try {
    const content = response.content.toString().replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(content);

    if (!result.isValid) {
      console.log(`   ❌ Query rejected: ${result.reason}`);
      
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
