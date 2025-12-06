import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { biAgent } from '../agents/bi/graph';
import { HumanMessage } from "@langchain/core/messages";
import { AgentState } from '../agents/bi/state';

// Configuración
const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

// Variables globales
let mcpProcess: ChildProcess | null = null;

// Ruta al frontend compilado (relativa desde dist/server/)
const clientDistPath = path.join(__dirname, '../../../client/dist');

console.log(`🚀 Iniciando MCP Analytics Server en modo ${isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}...`);

// En producción, servir el frontend compilado
if (isProduction) {
  if (fs.existsSync(clientDistPath)) {
    console.log(`📁 Sirviendo archivos estáticos desde: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
  } else {
    console.warn(`⚠️ No se encontró el directorio del frontend: ${clientDistPath}`);
    console.warn(`⚠️ Ejecuta 'npm run build' en el directorio client primero`);
  }
} else {
  // En desarrollo, servir archivos estáticos desde public (legacy)
  app.use(express.static(path.join(__dirname, '../../public')));
}

app.use(express.json());

// Rutas API
app.get('/api/status', (req, res) => {
    res.json({
        status: mcpProcess ? 'running' : 'stopped',
        mcpServer: mcpProcess ? 'connected' : 'disconnected',
        port: PORT,
        environment: isProduction ? 'production' : 'development',
        endpoints: {
            api: '/api/status',
            health: '/health',
            websocket: `ws://localhost:${PORT}`
        },
        timestamp: new Date().toISOString()
    });
});

// Legacy route for backwards compatibility
app.get('/mcp-status', (req, res) => {
    res.redirect('/api/status');
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'MCP Analytics',
        uptime: process.uptime()
    });
});

// Endpoint para el Agente de BI
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log(`🤖 Procesando consulta: "${message}"`);

        const result = await biAgent.invoke({
            naturalQuery: message,
            messages: [new HumanMessage(message)]
        }) as unknown as AgentState;


        const lastMessage = result.messages[result.messages.length - 1];
        
        res.json({
            response: lastMessage.content,
            data: result.queryResult,

            chartConfig: result.chartConfig,
            visualizationType: result.visualizationType,
            sql: result.sqlQuery,
            error: result.error
        });

    } catch (error: any) {
        console.error('Error en agente BI:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ruta catch-all para SPA (React Router) - debe estar después de las rutas API
if (isProduction && fs.existsSync(clientDistPath)) {
  app.get('*', (req, res) => {
    // No interceptar rutas de API o WebSocket
    if (req.path.startsWith('/api/') || req.path.startsWith('/health') || req.path.startsWith('/mcp')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// WebSocket Server para MCP

const wsServer = new WebSocketServer({ server });

wsServer.on('connection', (ws: WebSocket) => {
    console.log('🔗 Cliente conectado al MCP proxy');
    
    ws.on('message', async (message: string) => {
        try {
            const data = JSON.parse(message);
            
            // Handler para consultas del chat
            if (data.type === 'query') {
                console.log(`🤖 Procesando consulta via WebSocket: "${data.content}"`);
                
                try {
                    const result = await biAgent.invoke({
                        naturalQuery: data.content,
                        messages: [new HumanMessage(data.content)]
                    }) as unknown as AgentState;

                    const lastMessage = result.messages[result.messages.length - 1];
                    
                    // Verificar si es un dashboard o una visualización simple
                    if (result.isDashboard && result.dashboardWidgets) {
                        ws.send(JSON.stringify({
                            type: 'dashboard',
                            text: lastMessage.content,
                            dashboardTitle: result.dashboardTitle,
                            widgets: result.dashboardWidgets,
                            queryIntent: result.queryIntent,
                            error: result.error
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: 'result',
                            text: lastMessage.content,
                            chartData: result.queryResult,
                            chartType: result.visualizationType,
                            sql: result.sqlQuery,
                            chartConfig: result.chartConfig,
                            queryIntent: result.queryIntent,
                            error: result.error
                        }));
                    }
                } catch (error: any) {
                    console.error('Error en agente BI:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: error.message
                    }));
                }
            }
            
            // Handler para MCP requests
            if (data.type === 'mcp-request' && mcpProcess && mcpProcess.stdin) {
                // Remover wrapper y enviar JSON-RPC puro al MCP server
                const mcpRequest = {
                    jsonrpc: data.jsonrpc,
                    id: data.id,
                    method: data.method,
                    params: data.params
                };
                mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
            }
        } catch (error) {
            console.error('Error procesando mensaje WebSocket:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 Cliente desconectado del MCP proxy');
    });
    
    ws.on('error', (error) => {
        console.error('Error WebSocket:', error);
    });
});

// Función para iniciar MCP Server
function startMCPServer() {
    console.log('🚀 Iniciando MCP PostgreSQL Server...');
    
    try {
        // En desarrollo usamos ts-node, en producción el archivo compilado
        const isDev = process.env.NODE_ENV !== 'production';
        const mcpServerPath = isDev 
            ? path.join(__dirname, 'mcp-postgres-server.ts')
            : path.join(__dirname, 'mcp-postgres-server.js');
            
        const projectRoot = path.join(__dirname, '../..');
        
        // Usar ts-node para ejecutar el servidor MCP en desarrollo
        const command = isDev ? 'npx' : 'node';
        const args = isDev ? ['ts-node', mcpServerPath] : [mcpServerPath];

        mcpProcess = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            cwd: projectRoot,  // Ejecutar desde la raíz del proyecto
            env: { ...process.env }  // Pasar todas las variables de entorno
        });

        // Manejar salida del MCP Server
        mcpProcess.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n').filter((line: string) => line.trim());
            for (const line of lines) {
                try {
                    const response = JSON.parse(line);
                    // Reenviar respuesta a todos los clientes WebSocket conectados
                    wsServer.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(response));
                        }
                    });
                } catch (error) {
                    // Si no es JSON válido, es un log del servidor
                    console.log(`MCP Server: ${line}`);
                }
            }
        });

        mcpProcess.stderr?.on('data', (data) => {
            console.log(`MCP Server: ${data.toString().trim()}`);
        });

        mcpProcess.on('close', (code) => {
            console.log(`MCP Server cerrado con código: ${code}`);
            mcpProcess = null;
        });

        mcpProcess.on('error', (error) => {
            console.error('Error iniciando MCP Server:', error);
            mcpProcess = null;
        });

        console.log('✅ MCP Server iniciado correctamente');
        return true;
    } catch (error) {
        console.error('Error al iniciar MCP Server:', error);
        return false;
    }
}


// Iniciar servidor HTTP
if (require.main === module) {
    server.listen(PORT, () => {
        console.log('');
        console.log('=== 📊 MCP Analytics Dashboard ===');
        console.log('');
        console.log(`🌐 Servidor ejecutándose en puerto ${PORT}`);
        console.log(`📊 Dashboard Principal: http://localhost:${PORT}`);
        console.log(`📈 Estado del servidor: http://localhost:${PORT}/mcp-status`);
        console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
        console.log('');
        console.log('⚡ Características del dashboard:');
        console.log('   - Consultas conversacionales con Gemini AI');
        console.log('   - Conversión automática NL → SQL');
        console.log('   - Ejecución vía MCP real (no simulado)');
        console.log('   - Gráficos interactivos con Chart.js');
        console.log('   - Métricas automáticas');
        console.log('   - Múltiples tipos de gráficos');
        console.log('');
        console.log('💡 Ejemplos de consultas:');
        console.log('   "Hola" → Saludo conversacional');
        console.log('   "Muestra los empleados por país"');
        console.log('   "¿Cuáles son los productos más vendidos?"');
        console.log('   "Ventas por categoría de producto"');
        console.log('   "Evolución de pedidos por mes"');
        console.log('');
        console.log('✅ Servidor HTTP listo para conexiones');
        
        // Iniciar MCP Server después de que el HTTP esté listo
        setTimeout(() => {
            startMCPServer();
        }, 1000);
    });
}

export { app, server };


// Manejo de cierre graceful
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

function cleanup() {
    console.log('🛑 Cerrando servidor...');
    if (mcpProcess) {
        mcpProcess.kill();
    }
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promise rechazada:', reason);
});
