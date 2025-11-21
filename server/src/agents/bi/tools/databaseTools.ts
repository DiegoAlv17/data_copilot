import { DynamicTool } from "@langchain/core/tools";
import { query, testConnection } from "../../../database/database";
import { z } from "zod";

// Herramienta para obtener el esquema de la base de datos
// En un entorno real MCP, esto llamaría al servidor MCP. Aquí usamos la conexión directa por simplicidad en esta fase.
export const getSchemaTool = new DynamicTool({
  name: "get_database_schema",
  description: "Returns the schema of the database, including table names and column definitions. Use this to understand the database structure before generating SQL queries.",
  func: async () => {
    const schemaQuery = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position;
    `;
    try {
      const result = await query(schemaQuery);
      
      // Formatear para que sea legible por el LLM
      const tables: Record<string, string[]> = {};
      result.forEach((row: any) => {
        if (!tables[row.table_name]) {
          tables[row.table_name] = [];
        }
        tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
      });

      let schemaString = "Database Schema:\n";
      for (const [table, columns] of Object.entries(tables)) {
        schemaString += `Table: ${table}\nColumns:\n  - ${columns.join("\n  - ")}\n\n`;
      }
      return schemaString;
    } catch (error: any) {
      return `Error getting schema: ${error.message}`;
    }
  },
});

// Herramienta para ejecutar consultas SQL (Solo lectura por seguridad)
export const executeSqlTool = new DynamicTool({
  name: "execute_sql",
  description: "Executes a SQL query against the database. Only SELECT statements are allowed.",
  func: async (input: string) => {
    try {
        // Validación básica de seguridad
        const trimmedInput = input.trim().toLowerCase();
        if (!trimmedInput.startsWith("select") && !trimmedInput.startsWith("with")) {
            return "Error: Only SELECT queries are allowed for safety reasons.";
        }
        if (trimmedInput.includes("drop ") || trimmedInput.includes("delete ") || trimmedInput.includes("update ") || trimmedInput.includes("insert ")) {
            return "Error: Destructive operations are not allowed.";
        }

        const result = await query(input);
        return JSON.stringify(result);
    } catch (error: any) {
        return `Error executing SQL: ${error.message}`;
    }
  },
});
