#!/usr/bin/env node

// MCP PostgreSQL Server
// Implementa el Model Context Protocol para interactuar con PostgreSQL

const { spawn } = require('child_process');
const path = require('path');

class MCPPostgreSQLServer {
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
                name: 'describe_table',
                description: 'Get the schema description of a table',
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
                description: 'Get the complete database schema',
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
                    } catch (error) {
                        this.sendError(null, -32700, 'Parse error', error.message);
                    }
                }
            }
        });

        // Log de inicio
        console.error('MCP PostgreSQL Server iniciado');
        console.error('Conexión a base de datos:', process.env.POSTGRES_CONNECTION_STRING ? 'Configurada' : 'No configurada');
    }

    async handleRequest(request) {
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
        } catch (error) {
            this.sendError(id, -32603, 'Internal error', error.message);
        }
    }

    async handleToolCall(id, params) {
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
        } catch (error) {
            this.sendError(id, -32603, 'Tool execution error', error.message);
        }
    }

    async executeQuery(query) {
        // Importar dinámicamente la conexión a la base de datos
        const { query: dbQuery } = await import('../database/database.js');
        
        try {
            const result = await dbQuery(query);
            return {
                success: true,
                rows: result,
                rowCount: result.length
            };
        } catch (error) {
            console.error('Error ejecutando consulta:', error);
            throw new Error(`Database error: ${error.message}`);
        }
    }

    async describeTable(tableName) {
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
        } catch (error) {
            throw new Error(`Error describing table ${tableName}: ${error.message}`);
        }
    }

    async getSchema() {
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        try {
            const tablesResult = await this.executeQuery(tablesQuery);
            const tables = tablesResult.rows.map(row => row.table_name);
            
            const schema = {
                database: 'postgres',
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

            return schema;
        } catch (error) {
            throw new Error(`Error getting schema: ${error.message}`);
        }
    }

    sendResponse(id, result) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
        process.stdout.write(JSON.stringify(response) + '\n');
    }

    sendError(id, code, message, data = null) {
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

// Configurar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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
