import { AgentState } from "../state";
import { executeSqlTool } from "../tools/databaseTools";

export const executorNode = async (state: AgentState) => {
  if (!state.sqlQuery || state.sqlQuery.startsWith("ERROR:")) {
    return {
      error: state.sqlQuery || "No SQL query generated",
    };
  }

  try {
    const resultJson = await executeSqlTool.func(state.sqlQuery);
    
    if (resultJson.startsWith("Error")) {
        return { error: resultJson };
    }

    const queryResult = JSON.parse(resultJson);

    return {
      queryResult,
    };
  } catch (error: any) {
    return {
      error: `Execution failed: ${error.message}`,
    };
  }
};
