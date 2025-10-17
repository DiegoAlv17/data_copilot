// gemini-nl2sql.js - Módulo para convertir lenguaje natural a SQL usando Gemini

class GeminiNL2SQL {
    constructor(apiKey) {
        this.apiKey = apiKey;
        // Usar Gemini 2.5 Flash (el modelo más rápido y actual disponible)
        // Cambiar a v1 que tiene los modelos estables más recientes
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
        
        // Cache del schema real
        this.realSchemaCache = null;
        this.schemaCacheTime = null;
        this.schemaCacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        // Estado de herramientas MCP utilizadas
        this.mcpToolsUsed = [];
        this.schemaSource = 'no-loaded'; // 'mcp', 'cache', 'no-loaded', 'emergency'
        
        // Schema de emergencia (solo para casos críticos)
        this.emergencySchema = {
            database: 'postgres',
            tables: [
                {
                    table_name: 'employees',
                    columns: [
                        { column_name: 'employee_id', data_type: 'integer' },
                        { column_name: 'first_name', data_type: 'text' },
                        { column_name: 'last_name', data_type: 'text' },
                        { column_name: 'title', data_type: 'text' },
                        { column_name: 'city', data_type: 'text' },
                        { column_name: 'country', data_type: 'text' },
                        { column_name: 'hire_date', data_type: 'date' }
                    ]
                },
                {
                    table_name: 'customers',
                    columns: [
                        { column_name: 'customer_id', data_type: 'text' },
                        { column_name: 'company_name', data_type: 'text' },
                        { column_name: 'contact_name', data_type: 'text' },
                        { column_name: 'city', data_type: 'text' },
                        { column_name: 'country', data_type: 'text' }
                    ]
                },
                {
                    table_name: 'orders',
                    columns: [
                        { column_name: 'order_id', data_type: 'integer' },
                        { column_name: 'customer_id', data_type: 'text' },
                        { column_name: 'employee_id', data_type: 'integer' },
                        { column_name: 'order_date', data_type: 'date' },
                        { column_name: 'ship_city', data_type: 'text' },
                        { column_name: 'ship_country', data_type: 'text' }
                    ]
                },
                {
                    table_name: 'products',
                    columns: [
                        { column_name: 'product_id', data_type: 'integer' },
                        { column_name: 'product_name', data_type: 'text' },
                        { column_name: 'unit_price', data_type: 'numeric' },
                        { column_name: 'units_in_stock', data_type: 'integer' },
                        { column_name: 'category_id', data_type: 'integer' }
                    ]
                }
            ]
        };
    }

    // Obtener schema con cache
    async getSchemaWithCache(mcpWebSocket) {
        const now = Date.now();
        
        // Verificar cache válido
        if (this.realSchemaCache && this.schemaCacheTime && 
            (now - this.schemaCacheTime) < this.schemaCacheTimeout) {
            console.log('📋 Usando schema desde cache');
            this.schemaSource = 'cache';
            this.addMCPToolUsed('get_schema', 'cache');
            return this.realSchemaCache;
        }
        
        // Intentar obtener schema fresco del MCP
        try {
            console.log('🔍 Obteniendo schema real de la BD via MCP...');
            const freshSchema = await this.getRealSchemaFromMCP(mcpWebSocket);
            
            if (freshSchema) {
                // Actualizar cache
                this.realSchemaCache = freshSchema;
                this.schemaCacheTime = now;
                this.schemaSource = 'mcp';
                this.addMCPToolUsed('get_schema', 'success');
                console.log('✅ Schema real obtenido del MCP y guardado en cache');
                return freshSchema;
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo schema MCP:', error.message);
        }
        
        // Fallback 1: Cache anterior si existe
        if (this.realSchemaCache) {
            console.log('📋 Usando schema anterior del cache (expirado pero disponible)');
            this.schemaSource = 'cache-expired';
            this.addMCPToolUsed('get_schema', 'cache-expired');
            return this.realSchemaCache;
        }
        
        // Fallback 2: Schema de emergencia
        console.warn('⚠️ Usando schema de emergencia. Funcionalidad limitada.');
        this.schemaSource = 'emergency';
        this.addMCPToolUsed('get_schema', 'emergency');
        return this.emergencySchema;
    }
    
    // Registrar herramientas MCP utilizadas
    addMCPToolUsed(toolName, status) {
        this.mcpToolsUsed.push({
            tool: toolName,
            status: status,
            timestamp: new Date().toISOString()
        });
    }
    
    // Obtener información de herramientas usadas
    getMCPToolsInfo() {
        return {
            tools: this.mcpToolsUsed,
            schemaSource: this.schemaSource,
            cacheValid: this.realSchemaCache && this.schemaCacheTime && 
                       (Date.now() - this.schemaCacheTime) < this.schemaCacheTimeout
        };
    }
    
    // Limpiar registro de herramientas
    clearMCPToolsLog() {
        this.mcpToolsUsed = [];
    }

    // Obtener schema real de la base de datos via MCP
    async getRealSchemaFromMCP(mcpWebSocket) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('⚠️ Timeout obteniendo schema MCP (10 segundos), usando fallback');
                mcpWebSocket.removeEventListener('message', handleMessage);
                resolve(null); // Usar fallback en lugar de rechazar
            }, 10000); // Aumentado a 10 segundos

            const requestId = Date.now();
            
            const schemaRequest = {
                type: 'mcp-request',
                jsonrpc: "2.0",
                id: requestId,
                method: "tools/call",
                params: {
                    name: "get_schema",
                    arguments: {}
                }
            };

            // Listener temporal para esta respuesta específica
            const handleMessage = (event) => {
                try {
                    const response = JSON.parse(event.data);
                    
                    // Debug: Ver todas las respuestas
                    console.log('📨 Respuesta MCP recibida:', response);
                    
                    if (response.id === requestId) {
                        clearTimeout(timeout);
                        mcpWebSocket.removeEventListener('message', handleMessage);
                        
                        if (response.error) {
                            console.warn('❌ Error obteniendo schema MCP:', response.error.message);
                            resolve(null);
                        } else if (response.result && response.result.content) {
                            try {
                                // El schema puede venir como texto o como JSON directo
                                const content = response.result.content[0];
                                let schemaData;
                                
                                if (content.text) {
                                    // Viene como texto
                                    console.log('📄 Schema raw recibido (texto):', content.text.substring(0, 200) + '...');
                                    schemaData = content.text;
                                } else if (content.data) {
                                    // Viene como data directo
                                    console.log('📄 Schema raw recibido (data)');
                                    schemaData = content.data;
                                } else {
                                    // El content mismo es el dato
                                    console.log('📄 Schema raw recibido (content directo)');
                                    schemaData = content;
                                }
                                
                                const parsedSchema = this.parseSchemaResponse(schemaData);
                                
                                if (parsedSchema && Object.keys(parsedSchema).length > 0) {
                                    console.log('✅ Schema parseado correctamente:', Object.keys(parsedSchema));
                                    resolve(parsedSchema);
                                } else {
                                    console.warn('⚠️ Schema parseado está vacío');
                                    resolve(null);
                                }
                            } catch (parseError) {
                                console.warn('❌ Error parseando schema:', parseError);
                                resolve(null);
                            }
                        } else {
                            console.warn('⚠️ Respuesta MCP sin contenido esperado');
                            resolve(null);
                        }
                    }
                } catch (error) {
                    console.warn('❌ Error procesando respuesta MCP:', error);
                }
            };

            mcpWebSocket.addEventListener('message', handleMessage);
            console.log('📤 Enviando solicitud de schema al MCP:', schemaRequest);
            mcpWebSocket.send(JSON.stringify(schemaRequest));
        });
    }

    // Parsear respuesta de schema del MCP
    parseSchemaResponse(schemaData) {
        try {
            console.log('🔍 Intentando parsear schema...');
            
            // Si schemaData es un objeto (no string), parsearlo directamente como JSON
            if (typeof schemaData === 'object' && schemaData !== null) {
                console.log('✅ Schema es objeto directo');
                return this.normalizeSchema(schemaData);
            }
            
            // Si es string, intentar parsearlo como JSON
            if (typeof schemaData === 'string') {
                try {
                    const jsonSchema = JSON.parse(schemaData);
                    if (jsonSchema && typeof jsonSchema === 'object') {
                        console.log('✅ Schema parseado como JSON desde string');
                        return this.normalizeSchema(jsonSchema);
                    }
                } catch (e) {
                    // No es JSON, continuar con parsing de texto
                    console.log('📝 Schema es texto plano, parseando...');
                }
            }
            
            // Si llegamos aquí, schemaData debe ser un string para parsear como texto
            if (typeof schemaData !== 'string') {
                console.warn('⚠️ Schema no es string ni objeto JSON válido');
                return null;
            }
            
            // Parseo de texto
            const lines = schemaData.split('\n');
            const parsedSchema = {};
            let currentTable = null;
            let inTableSection = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                if (!trimmedLine) continue;
                
                // Detectar nombre de tabla (múltiples formatos)
                // Formato 1: "Table: table_name" o "TABLE: table_name"
                // Formato 2: "## table_name" o "### table_name"
                // Formato 3: "table_name:" al inicio de línea
                const tablePatterns = [
                    /(?:Table|TABLE):\s*([a-zA-Z_][a-zA-Z0-9_]*)/i,
                    /^#{2,}\s*([a-zA-Z_][a-zA-Z0-9_]*)/,
                    /^([a-zA-Z_][a-zA-Z0-9_]*):$/,
                    /^-\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/
                ];
                
                let tableFound = false;
                for (const pattern of tablePatterns) {
                    const match = trimmedLine.match(pattern);
                    if (match) {
                        currentTable = match[1].toLowerCase();
                        parsedSchema[currentTable] = {
                            columns: [],
                            description: `Tabla ${currentTable} de la base de datos`
                        };
                        inTableSection = true;
                        tableFound = true;
                        console.log(`📋 Tabla encontrada: ${currentTable}`);
                        break;
                    }
                }
                
                if (tableFound) continue;
                
                // Detectar columnas (solo si estamos en una sección de tabla)
                if (currentTable && inTableSection) {
                    // Formato 1: "- column_name" o "* column_name"
                    // Formato 2: "column_name | type"
                    // Formato 3: "column_name"
                    const columnPatterns = [
                        /^[-*]\s*([a-zA-Z_][a-zA-Z0-9_]*)/,
                        /^\|?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\|/,
                        /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/,
                        /^([a-zA-Z_][a-zA-Z0-9_]*)\s+\w+/
                    ];
                    
                    // Ignorar líneas de separación
                    if (trimmedLine.match(/^[-=+|]+$/)) continue;
                    
                    for (const pattern of columnPatterns) {
                        const match = trimmedLine.match(pattern);
                        if (match) {
                            const columnName = match[1].toLowerCase();
                            if (!parsedSchema[currentTable].columns.includes(columnName)) {
                                parsedSchema[currentTable].columns.push(columnName);
                                console.log(`  ✓ Columna: ${columnName}`);
                            }
                            break;
                        }
                    }
                }
            }

            const tableCount = Object.keys(parsedSchema).length;
            console.log(`📊 Total de tablas parseadas: ${tableCount}`);
            
            return tableCount > 0 ? parsedSchema : null;
        } catch (error) {
            console.error('❌ Error parseando schema MCP:', error);
            return null;
        }
    }
    
    // Normalizar schema de diferentes formatos a formato estándar
    normalizeSchema(schema) {
        let tables = [];
        
        // Caso 1: Schema viene con formato { database: "...", tables: [...] }
        if (schema.tables && Array.isArray(schema.tables)) {
            console.log('📦 Schema con formato de tablas array');
            for (const table of schema.tables) {
                const tableName = (table.table_name || table.name).toLowerCase();
                const columns = (table.columns || []).map(col => {
                    if (typeof col === 'string') {
                        return { column_name: col.toLowerCase(), data_type: 'unknown' };
                    }
                    return {
                        column_name: (col.column_name || col.name || '').toLowerCase(),
                        data_type: col.data_type || col.type || 'unknown'
                    };
                }).filter(col => col.column_name); // Filtrar columnas vacías
                
                if (columns.length > 0) {
                    tables.push({
                        table_name: tableName,
                        columns: columns
                    });
                    console.log(`  ✓ Tabla normalizada: ${tableName} con ${columns.length} columnas`);
                }
            }
            
            return { 
                database: schema.database || 'postgres',
                tables: tables 
            };
        }
        
        // Caso 2: Schema tradicional { tableName: { columns: [...] } }
        for (const [tableName, tableInfo] of Object.entries(schema)) {
            // Si tableInfo es un array, asumimos que son las columnas
            if (Array.isArray(tableInfo)) {
                const columns = tableInfo.map(col => {
                    if (typeof col === 'string') {
                        return { column_name: col.toLowerCase(), data_type: 'unknown' };
                    }
                    return {
                        column_name: (col.name || col.column_name || '').toLowerCase(),
                        data_type: col.data_type || col.type || 'unknown'
                    };
                }).filter(col => col.column_name);
                
                if (columns.length > 0) {
                    tables.push({
                        table_name: tableName.toLowerCase(),
                        columns: columns
                    });
                }
            }
            // Si es un objeto con estructura
            else if (typeof tableInfo === 'object' && tableInfo !== null) {
                const columns = (tableInfo.columns || tableInfo.fields || []).map(col => {
                    if (typeof col === 'string') {
                        return { column_name: col.toLowerCase(), data_type: 'unknown' };
                    }
                    return {
                        column_name: (col.name || col.column_name || '').toLowerCase(),
                        data_type: col.data_type || col.type || 'unknown'
                    };
                }).filter(col => col.column_name);
                
                if (columns.length > 0) {
                    tables.push({
                        table_name: tableName.toLowerCase(),
                        columns: columns
                    });
                }
            }
        }
        
        console.log(`📊 Schema normalizado: ${tables.length} tablas`);
        return tables.length > 0 ? { database: 'postgres', tables: tables } : null;
    }

    // Construir prompt con schema real obtenido del MCP
    buildPromptWithRealSchema(naturalQuery, realSchema) {
        if (!realSchema || !realSchema.tables || !Array.isArray(realSchema.tables)) {
            console.error('❌ Schema inválido:', realSchema);
            throw new Error('Schema no disponible. No se puede generar SQL sin información de la base de datos.');
        }
        
        if (realSchema.tables.length === 0) {
            console.error('❌ Schema vacío');
            throw new Error('Schema vacío. No hay tablas disponibles en la base de datos.');
        }
        
        // Validar y construir texto del schema
        const validSchemaText = realSchema.tables
            .filter(table => {
                if (!table.columns || !Array.isArray(table.columns)) {
                    console.warn(`⚠️ Tabla ${table.table_name} sin columnas válidas, omitiendo...`);
                    return false;
                }
                if (table.columns.length === 0) {
                    console.warn(`⚠️ Tabla ${table.table_name} sin columnas, omitiendo...`);
                    return false;
                }
                return true;
            })
            .map(table => {
                const columns = table.columns.map(col => `${col.column_name}: ${col.data_type}`).join(', ');
                return `${table.table_name} (${columns})`;
            })
            .join('\n');
        
        if (!validSchemaText) {
            console.error('❌ No hay tablas válidas en el schema');
            throw new Error('Schema inválido. No hay tablas con columnas válidas.');
        }
        
        console.log('✅ Schema válido construido con', realSchema.tables.length, 'tablas');

        return `Eres un experto en SQL para PostgreSQL. Convierte el lenguaje natural a consultas SQL precisas.

SCHEMA DE LA BASE DE DATOS:
${validSchemaText}

REGLAS:
- Usa solo tablas/columnas del schema
- Usa PostgreSQL syntax
- Limita resultados (LIMIT 100 máximo)
- Usa JOINs cuando necesites múltiples tablas
- Para fechas: DATE_TRUNC, EXTRACT

CONSULTA: "${naturalQuery}"

SQL:`;
    }

    // Construir prompt conversacional que distingue entre chat y SQL
    buildConversationalPrompt(naturalQuery, realSchema) {
        console.log('🔍 buildConversationalPrompt recibió schema:', JSON.stringify(realSchema, null, 2).substring(0, 500));
        
        if (!realSchema || !realSchema.tables || realSchema.tables.length === 0) {
            console.warn('⚠️ Schema vacío en conversacional, usando formato reducido');
            return `Eres un asistente de base de datos amigable.

CÓMO RESPONDER:
1. Saludos ("Hola", "Buenos días"): Responde amigablemente en 1 línea
2. Agradecimientos ("Gracias"): Responde cortésmente en 1 línea
3. Preguntas fuera de contexto: Indica que solo ayudas con la base de datos
4. Consultas sobre datos: Genera SQL usando el schema disponible

CONSULTA: "${naturalQuery}"

RESPUESTA:`;
        }

        // Construir schema text
        const schemaText = realSchema.tables
            .map(t => `${t.table_name} (${t.columns.map(c => `${c.column_name}: ${c.data_type}`).join(', ')})`)
            .join('\n');
        
        console.log('✅ Schema text construido con', realSchema.tables.length, 'tablas');

        return `Eres un asistente experto en bases de datos PostgreSQL. Eres amigable y conversacional.

SCHEMA DE LA BASE DE DATOS:
${schemaText}

CÓMO RESPONDER:

1. **Saludos y cortesía** (responde en 1 línea):
   - "Hola" → "¡Hola! ¿Qué consulta sobre la base de datos te gustaría hacer hoy?"
   - "Gracias" → "¡De nada! ¿Hay algo más en lo que pueda ayudarte?"
   - "Buenos días" → "¡Buenos días! Estoy aquí para ayudarte con consultas SQL."

2. **Preguntas fuera de contexto** (responde en 1-2 líneas):
   - "¿Qué día es hoy?" → "Lo siento, solo tengo información sobre la base de datos. ¿Te gustaría consultar algún dato?"
   - "¿Cómo está el clima?" → "No tengo acceso a esa información. Puedo ayudarte con consultas sobre las tablas disponibles."

3. **Consultas sobre datos** (FORMATO ESPECIAL - MUY IMPORTANTE):
   Cuando el usuario pida información de la base de datos, responde EXACTAMENTE así:
   
   [SQL]
   SELECT columnas FROM tabla WHERE condiciones LIMIT 100;
   [/SQL]
   [EXPLICACION]
   Esta consulta muestra...
   [/EXPLICACION]

REGLAS SQL:
- Usa PostgreSQL syntax
- Limita resultados con LIMIT (máximo 100)
- Usa JOINs para múltiples tablas
- Usa solo las tablas y columnas del schema arriba

CONSULTA DEL USUARIO: "${naturalQuery}"

RESPUESTA:`;
    }

    // Convertir lenguaje natural a SQL con respuesta conversacional
    async convertToSQL(naturalQuery, mcpWebSocket = null) {
        if (!naturalQuery || !naturalQuery.trim()) {
            throw new Error('Consulta vacía');
        }
        
        // Limpiar log de herramientas anterior
        this.clearMCPToolsLog();

        try {
            // Verificar conexión MCP
            if (!mcpWebSocket || mcpWebSocket.readyState !== WebSocket.OPEN) {
                throw new Error('Conexión MCP no disponible. Por favor, verifica que el servidor MCP esté ejecutándose.');
            }
            
            // Paso 1: Obtener schema real del MCP (obligatorio)
            const realSchema = await this.getSchemaWithCache(mcpWebSocket);

            // Paso 2: Construir prompt conversacional con el schema del MCP
            const prompt = this.buildConversationalPrompt(naturalQuery, realSchema);
            
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5, // Balance entre precisión SQL y respuestas conversacionales naturales
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error de Gemini API: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida de Gemini API');
            }

            const fullResponse = data.candidates[0].content.parts[0].text.trim();
            
            // Extraer SQL y mensaje conversacional
            const result = this.parseConversationalResponse(fullResponse);
            
            // Si hay SQL, validarlo
            if (result.sql) {
                this.validateSQL(result.sql);
            }
            
            return result;

        } catch (error) {
            console.error('Error en convertToSQL:', error);
            throw new Error(`Error al generar SQL: ${error.message}`);
        }
    }

    // Parsear respuesta conversacional con SQL
    parseConversationalResponse(fullResponse) {
        let sql = null;
        let message = '';
        let explanation = '';
        
        // Intentar extraer con formato [SQL]...[/SQL] y [EXPLICACION]...[/EXPLICACION]
        const sqlTagMatch = fullResponse.match(/\[SQL\]\s*([\s\S]*?)\s*\[\/SQL\]/i);
        const explMatch = fullResponse.match(/\[EXPLICACION\]\s*([\s\S]*?)\s*\[\/EXPLICACION\]/i);
        
        if (sqlTagMatch) {
            sql = this.cleanSQLResponse(sqlTagMatch[1]);
            explanation = explMatch ? explMatch[1].trim() : '';
            message = explanation;
        } else {
            // Fallback: buscar SQL en formato markdown o con prefijo SQL:
            const sqlMatch = fullResponse.match(/```sql\n?([\s\S]*?)```/i) || 
                            fullResponse.match(/SQL:\s*\n?(SELECT[\s\S]*?);?\s*$/i);
            
            if (sqlMatch) {
                sql = this.cleanSQLResponse(sqlMatch[1] || sqlMatch[0]);
                // Remover el SQL del mensaje
                message = fullResponse
                    .replace(/```sql[\s\S]*?```/i, '')
                    .replace(/SQL:[\s\S]*$/i, '')
                    .replace(/\[SQL\][\s\S]*?\[\/SQL\]/i, '')
                    .replace(/\[EXPLICACION\][\s\S]*?\[\/EXPLICACION\]/i, '')
                    .trim();
            } else {
                // No hay SQL, es una respuesta conversacional pura
                message = fullResponse.trim();
            }
        }
        
        return {
            message: message || fullResponse,
            sql: sql,
            explanation: explanation,
            fullResponse: fullResponse
        };
    }

    // Limpiar respuesta SQL
    cleanSQLResponse(sqlText) {
        if (!sqlText) return null;
        
        // Remover bloques de código markdown
        sqlText = sqlText.replace(/```sql\n?/gi, '').replace(/```\n?/g, '');
        
        // Remover prefijo SQL: si existe
        sqlText = sqlText.replace(/^SQL:\s*/i, '');
        
        // Remover saltos de línea excesivos
        sqlText = sqlText.replace(/\n+/g, ' ').trim();
        
        // Asegurar que termine con punto y coma
        if (!sqlText.endsWith(';')) {
            sqlText += ';';
        }
        
        return sqlText;
    }

    // Validación básica de SQL
    validateSQL(sqlQuery) {
        const sql = sqlQuery.toLowerCase().trim();
        
        // Verificar que sea una consulta SELECT
        if (!sql.startsWith('select')) {
            throw new Error('Solo se permiten consultas SELECT');
        }
        
        // Verificar que no contenga comandos peligrosos
        const dangerousCommands = ['drop', 'delete', 'insert', 'update', 'alter', 'create', 'truncate'];
        for (const cmd of dangerousCommands) {
            if (sql.includes(cmd)) {
                throw new Error(`Comando no permitido: ${cmd.toUpperCase()}`);
            }
        }
        
        // Verificar paréntesis balanceados
        const openParens = (sql.match(/\(/g) || []).length;
        const closeParens = (sql.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            throw new Error('Paréntesis no balanceados en la consulta SQL');
        }
        
        return true;
    }

    // Sugerir mejoras para consultas ambiguas
    suggestImprovements(naturalQuery) {
        const suggestions = [];
        
        if (naturalQuery.includes('mejor') || naturalQuery.includes('top')) {
            suggestions.push('Especifica cuántos resultados quieres (ej: "top 10")');
        }
        
        if (naturalQuery.includes('ventas') && !naturalQuery.includes('por')) {
            suggestions.push('Especifica el período o agrupación (ej: "por mes", "por categoría")');
        }
        
        if (naturalQuery.includes('empleado') && naturalQuery.includes('más')) {
            suggestions.push('Especifica qué quieres medir (ej: "más ventas", "más antiguos")');
        }
        
        return suggestions;
    }

    // Obtener consultas de ejemplo basadas en el schema
    getExampleQueries() {
        return [
            {
                natural: "Muestra los empleados por país",
                sql: "SELECT country, COUNT(*) as total_empleados FROM employees GROUP BY country ORDER BY total_empleados DESC;"
            },
            {
                natural: "¿Cuáles son los 10 productos más vendidos?",
                sql: "SELECT p.product_name, SUM(od.quantity) as total_vendido FROM products p JOIN order_details od ON p.product_id = od.product_id GROUP BY p.product_id, p.product_name ORDER BY total_vendido DESC LIMIT 10;"
            },
            {
                natural: "Ventas por categoría de producto",
                sql: "SELECT c.category_name, COUNT(od.order_id) as total_ventas FROM categories c JOIN products p ON c.category_id = p.category_id JOIN order_details od ON p.product_id = od.product_id GROUP BY c.category_id, c.category_name ORDER BY total_ventas DESC;"
            },
            {
                natural: "Evolución de pedidos por mes en 2023",
                sql: "SELECT DATE_TRUNC('month', order_date) as mes, COUNT(*) as total_pedidos FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2023 GROUP BY mes ORDER BY mes;"
            },
            {
                natural: "Top 5 clientes con más pedidos",
                sql: "SELECT c.company_name, COUNT(o.order_id) as total_pedidos FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.customer_id, c.company_name ORDER BY total_pedidos DESC LIMIT 5;"
            }
        ];
    }
}

// Función global para usar en el frontend
async function convertNaturalLanguageToSQL(naturalQuery, mcpWebSocket = null) {
    // Crear o reutilizar instancia global
    if (!window.geminiNL2SQL) {
        window.geminiNL2SQL = new GeminiNL2SQL(GEMINI_API_KEY);
    }
    
    try {
        const sql = await window.geminiNL2SQL.convertToSQL(naturalQuery, mcpWebSocket);
        console.log('SQL generado:', sql);
        return sql;
    } catch (error) {
        console.error('Error en NL2SQL:', error);
        throw error;
    }
}

// Función para obtener sugerencias
function getSuggestions(naturalQuery) {
    const gemini = new GeminiNL2SQL(GEMINI_API_KEY);
    return gemini.suggestImprovements(naturalQuery);
}

// Función para obtener ejemplos
function getExampleQueries() {
    const gemini = new GeminiNL2SQL(GEMINI_API_KEY);
    return gemini.getExampleQueries();
}

// Exportar para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiNL2SQL;
}
