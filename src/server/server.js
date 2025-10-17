const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Configuración
const PORT = process.env.PORT || 3002;
const app = express();
const server = http.createServer(app);

// Variables globales
let mcpProcess = null;

console.log('🚀 Iniciando MCP Analytics Server...');

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.json());

// Rutas principales
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.get('/mcp-status', (req, res) => {
    res.json({
        status: mcpProcess ? 'running' : 'stopped',
        mcpServer: mcpProcess ? 'connected' : 'disconnected',
        port: PORT,
        endpoints: {
            dashboard: '/',
            status: '/mcp-status',
            health: '/health',
            websocket: `ws://localhost:${PORT}`
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'MCP Analytics',
        uptime: process.uptime()
    });
});

// WebSocket Server para MCP
const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', (ws) => {
    console.log('🔗 Cliente conectado al MCP proxy');
    
    ws.on('message', (message) => {
        if (mcpProcess && mcpProcess.stdin) {
            try {
                const data = JSON.parse(message);
                if (data.type === 'mcp-request') {
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
        const mcpServerPath = path.join(__dirname, 'mcp-postgres-server.js');
        const projectRoot = path.join(__dirname, '../..');
        
        mcpProcess = spawn('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            cwd: projectRoot,  // Ejecutar desde la raíz del proyecto
            env: { ...process.env }  // Pasar todas las variables de entorno
        });

        // Manejar salida del MCP Server
        mcpProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());
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

        mcpProcess.stderr.on('data', (data) => {
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
