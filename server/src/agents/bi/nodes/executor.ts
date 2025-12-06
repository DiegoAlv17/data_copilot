import { AgentState } from "../state";
import { executeSqlTool } from "../tools/databaseTools";

export const executorNode = async (state: AgentState) => {
  if (!state.sqlQuery || state.sqlQuery.startsWith("ERROR:")) {
    console.error(`  ❌ Invalid SQL query: ${state.sqlQuery}`);
    return {
      error: state.sqlQuery || "No se generó consulta SQL",
    };
  }

  console.log(`  🔧 Executing SQL...`);
  try {
    const resultJson = await executeSqlTool.func(state.sqlQuery);
    
    if (resultJson.startsWith("Error")) {
        console.error(`  ❌ SQL Error: ${resultJson}`);
        return { error: `Error en la consulta SQL: ${resultJson}` };
    }

    const queryResult = JSON.parse(resultJson);
    console.log(`  ✅ Query returned ${queryResult.length} rows`);

    return {
      queryResult,
    };
  } catch (error: any) {
    console.error(`  ❌ Execution failed: ${error.message}`);
    return {
      error: `Error al ejecutar la consulta: ${error.message}`,
    };
  }
};
