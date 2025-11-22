#!/usr/bin/env node

// MCP PostgreSQL Server
// Implementa el Model Context Protocol para interactuar con PostgreSQL

import path from 'path';
import dotenv from 'dotenv';
import { query as dbQuery } from '../database/database';

// Configurar variables de entorno
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}

class MCPPostgreSQLServer {
    private tools: Tool[];
    private requestId: number;

    constructor() {
        this.tools = [
            {
                name: 'execute_query',
                description: 'Execute a SQL query against the PostgreSQL database',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The SQL query to execute'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'get_tables_list',
                description: 'Get lightweight list of all table names (optimized for large databases)',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'get_selected_tables_schema',
                description: 'Get detailed schema for specific tables only (optimized)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table_names: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of table names to get schema for'
                        }
                    },
                    required: ['table_names']
                }
            },
            {
                name: 'get_table_columns',
                description: 'Get only the column names and data types for a specific table (lightweight)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table_name: {
                            type: 'string',
                            description: 'Name of the table to get columns for'
                        }
                    },
                    required: ['table_name']
                }
            },
            {
                name: 'describe_table',
                description: 'Get the schema description of a single table',
                inputSchema: {
                    type: 'object',
                    properties: {
                        table_name: {
                            type: 'string',
                            description: 'Name of the table to describe'
                        }
                    },
                    required: ['table_name']
                }
            },
            {
                name: 'get_schema',
                description: 'Get the complete database schema (use get_selected_tables_schema for better performance)',
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];

        this.requestId = 0;
        this.setupProtocol();
    }

    setupProtocol() {
        // Configurar entrada/salida estándar para JSON-RPC
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const request = JSON.parse(line);
                        this.handleRequest(request);
                    } catch (error: any) {
                        this.sendError(null, -32700, 'Parse error', error.message);
                    }
                }
            }
        });

        // Log de inicio
        console.error('MCP PostgreSQL Server iniciado');
        console.error('Conexión a base de datos:', process.env.POSTGRES_CONNECTION_STRING ? 'Configurada' : 'No configurada');
    }

    async handleRequest(request: any) {
        const { id, method, params } = request;

        try {
            switch (method) {
                case 'initialize':
                    this.sendResponse(id, {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                            resources: {}
                        },
                        serverInfo: {
                            name: 'mcp-postgres-server',
                            version: '1.0.0'
                        }
                    });
                    break;

                case 'tools/list':
                    this.sendResponse(id, { tools: this.tools });
                    break;

                case 'tools/call':
                    await this.handleToolCall(id, params);
                    break;

                default:
                    this.sendError(id, -32601, 'Method not found');
            }
        } catch (error: any) {
            this.sendError(id, -32603, 'Internal error', error.message);
        }
    }

    async handleToolCall(id: any, params: any) {
        const { name, arguments: args } = params;

        try {
            switch (name) {
                case 'execute_query':
                    const queryResult = await this.executeQuery(args.query);
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(queryResult, null, 2)
                            }
                        ]
                    });
                    break;

                case 'get_tables_list':
                    const tablesList = await this.getTablesList();
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(tablesList, null, 2)
                            }
                        ]
                    });
                    break;

                case 'get_selected_tables_schema':
                    const selectedSchema = await this.getSelectedTablesSchema(args.table_names);
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(selectedSchema, null, 2)
                            }
                        ]
                    });
                    break;

                case 'get_table_columns':
                    const tableColumns = await this.getTableColumns(args.table_name);
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(tableColumns, null, 2)
                            }
                        ]
                    });
                    break;

                case 'describe_table':
                    const tableSchema = await this.describeTable(args.table_name);
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(tableSchema, null, 2)
                            }
                        ]
                    });
                    break;

                case 'get_schema':
                    const schema = await this.getSchema();
                    this.sendResponse(id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(schema, null, 2)
                            }
                        ]
                    });
                    break;

                default:
                    this.sendError(id, -32601, 'Tool not found');
            }
        } catch (error: any) {
            this.sendError(id, -32603, 'Tool execution error', error.message);
        }
    }

    async executeQuery(query: string) {
        try {
            const result = await dbQuery(query);
            return {
                success: true,
                rows: result,
                rowCount: result.length
            };
        } catch (error: any) {
            console.error('Error ejecutando consulta:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }

    async describeTable(tableName: string) {
        const query = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = $1 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;

        try {
            const result = await this.executeQuery(query.replace('$1', `'${tableName}'`));
            return {
                table_name: tableName,
                columns: result.rows
            };
        } catch (error: any) {
            throw new Error(`Error describing table ${tableName}: ${error.message}`);
        }
    }

    // NUEVO: Obtener solo columnas (nombre y tipo) de una tabla específica
    async getTableColumns(tableName: string) {
        const query = `
            SELECT 
                column_name,
                data_type
            FROM information_schema.columns 
            WHERE table_name = $1 
              AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;

        try {
            const result = await this.executeQuery(query.replace('$1', `'${tableName}'`));
            console.error(`✅ [MCP] Columnas obtenidas para tabla '${tableName}': ${result.rows.length} columnas`);
            return {
                table_name: tableName,
                columns: result.rows
            };
        } catch (error: any) {
            throw new Error(`Error getting columns for table ${tableName}: ${error.message}`);
        }
    }

    // NUEVO: Obtener solo la lista de nombres de tablas (ultra rápido)
    async getTablesList() {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        try {
            const result = await this.executeQuery(query);
            const tableNames = result.rows.map((row: any) => row.table_name);
            
            console.error(`✅ [MCP] Lista de tablas obtenida: ${tableNames.length} tablas`);
            
            return {
                database: 'postgres',
                table_count: tableNames.length,
                tables: tableNames
            };
        } catch (error: any) {
            throw new Error(`Error getting tables list: ${error.message}`);
        }
    }

    // NUEVO: Obtener schema solo de tablas específicas (optimizado)
    async getSelectedTablesSchema(tableNames: string[]) {
        if (!Array.isArray(tableNames) || tableNames.length === 0) {
            throw new Error('table_names must be a non-empty array');
        }

        try {
            const schema: any = {
                database: 'postgres',
                table_count: tableNames.length,
                tables: []
            };

            console.error(`🔍 [MCP] Obteniendo schema para ${tableNames.length} tablas: ${tableNames.join(', ')}`);

            // Obtener descripción de tablas solicitadas
            for (const tableName of tableNames) {
                try {
                    const tableDesc = await this.describeTable(tableName);
                    schema.tables.push(tableDesc);
                } catch (error: any) {
                    console.error(`⚠️ [MCP] Error getting schema for table ${tableName}:`, error.message);
                    // Continuar con otras tablas
                }
            }

            console.error(`✅ [MCP] Schema selectivo obtenido: ${schema.tables.length}/${tableNames.length} tablas`);

            return schema;
        } catch (error: any) {
            throw new Error(`Error getting selected tables schema: ${error.message}`);
        }
    }

    // EXISTENTE: Obtener schema completo (ahora con warning)
    async getSchema() {
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        try {
            const tablesResult = await this.executeQuery(tablesQuery);
            const tables = tablesResult.rows.map((row: any) => row.table_name);
            
            console.error(`⚠️ [MCP] get_schema completo solicitado: ${tables.length} tablas`);
            console.error(`💡 [MCP] Consid era usar get_selected_tables_schema para mejor performance`);
            
            const schema: any = {
                database: 'postgres',
                table_count: tables.length,
                tables: []
            };

            // Obtener descripción de cada tabla
            for (const tableName of tables) {
                try {
                    const tableDesc = await this.describeTable(tableName);
                    schema.tables.push(tableDesc);
                } catch (error) {
                    console.error(`Error getting schema for table ${tableName}:`, error);
                }
            }

            console.error(`✅ [MCP] Schema completo obtenido: ${schema.tables.length} tablas`);

            return schema;
        } catch (error: any) {
            throw new Error(`Error getting schema: ${error.message}`);
        }
    }

    sendResponse(id: any, result: any) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }

    sendError(id: any, code: number, message: string, data: any = null) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            error: {
                code: code,
                message: message,
                data: data
            }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }
}

// Verificar conexión de base de datos
if (!process.env.DATABASE_URI && !process.env.POSTGRES_CONNECTION_STRING) {
    console.error('Error: DATABASE_URI o POSTGRES_CONNECTION_STRING no configurado');
    process.exit(1);
}

// Si no hay POSTGRES_CONNECTION_STRING, usar DATABASE_URI
if (!process.env.POSTGRES_CONNECTION_STRING) {
    process.env.POSTGRES_CONNECTION_STRING = process.env.DATABASE_URI;
}

// Inicializar servidor MCP
const server = new MCPPostgreSQLServer();

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.error('MCP PostgreSQL Server terminado');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.error('MCP PostgreSQL Server terminado');
    process.exit(0);
});
