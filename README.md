# 🔗 MCP PostgreSQL Analytics# 🔗 MCP PostgreSQL Analytics - Dashboard Inteligente



Implementación completa de **Model Context Protocol (MCP)** con PostgreSQL, Gemini AI y visualización de datos interactiva.Implementación completa del Model Context Protocol (MCP) con dashboard de analytics que acepta consultas en lenguaje natural y genera gráficos automáticamente.



## 🚀 Características## 🚀 Inicio Rápido



- **🤖 IA Conversacional**: Interactúa con Gemini AI usando lenguaje natural```bash

- **🔄 NL → SQL**: Conversión automática de lenguaje natural a consultas SQL# Opción 1: Inicio automático completo (recomendado)

- **📊 Visualización**: Gráficos interactivos con Chart.jsnpm run mcp:start

- **🔌 MCP Real**: Protocolo MCP completo (no simulado)

- **💬 Respuestas Contextuales**: Distingue entre saludos, consultas SQL y preguntas fuera de contexto# Opción 2: Solo Analytics Dashboard

- **⚡ Tiempo Real**: WebSocket para comunicación eficientenpm run analytics



## 📁 Estructura del Proyecto# Opción 3: Manual

npm start

``````

data_copilot/

├── src/## 🏗️ Arquitectura Completa

│   ├── server/

│   │   ├── server.js              # Servidor HTTP + WebSocket```

│   │   └── mcp-postgres-server.js # Servidor MCP PostgreSQLAdministrador

│   ├── ai/    ↓ "Quiero ver reservas por mes"

│   │   └── gemini-nl2sql.js       # Conversión NL a SQL con GeminiFrontend (UI) - Lenguaje Natural

│   ├── database/    ↓ WebSocket

│   │   └── database.js            # Conexión PostgreSQLAgente LLM (Gemini AI)

│   └── utils/    ↓ Convierte a SQL

│       ├── chart-engine.js        # Motor de visualizaciónPostgres-MCP Server

│       └── data-transformer.js    # Transformación de datos    ↓ Ejecuta consulta

├── public/Base de Datos PostgreSQL

│   ├── index.html                 # Dashboard principal    ↓ Retorna datos estructurados (JSON)

│   └── js/Motor de Gráficos (Chart.js/Recharts)

│       ├── gemini-nl2sql.js       # Cliente AI    ↓ Renderiza gráfico dinámico

│       ├── chart-engine.js        # Renderizado de gráficosFrontend (UI) - Visualización

│       └── data-transformer.js    # Procesamiento de datos```

├── scripts/

│   └── start.ps1                  # Script de inicio (Windows)## 📁 Archivos del Sistema

├── .env                           # Variables de entorno

├── package.json                   # Dependencias```

└── README.md                      # Este archivomcp-analytics/

```├── 🌐 frontend-analytics.html     # Dashboard principal con UI moderna

├── 🤖 gemini-nl2sql.js           # Integración Gemini para NL→SQL

## 🛠️ Instalación├── 📊 chart-engine.js             # Motor de gráficos Chart.js

├── 🔄 data-transformer.js         # Transformador de datos MCP→Charts

### Prerrequisitos├── 📄 mcp-websocket-proxy.js      # Proxy WebSocket MCP

├── 📄 mcp-postgres-server.js      # Servidor MCP real

- **Node.js** v18+ ([Descargar](https://nodejs.org))├── 🌐 client-mcp-direct.html      # Cliente MCP básico

- **PostgreSQL** (Supabase recomendado)├── 📄 database.js                 # Conexión PostgreSQL

- **API Key de Gemini** ([Google AI Studio](https://makersuite.google.com/app/apikey))├── 📄 .env                        # Variables de entorno + Gemini API

├── 🔧 start-mcp-analytics.ps1     # Script de inicio analytics

### Pasos└── 📚 README.md                   # Este archivo

```

1. **Clonar el repositorio**

   ```bash## 🔧 Configuración

   git clone <repository-url>

   cd data_copilotArchivo `.env`:

   ``````env

DATABASE_URI=postgresql://postgres.zdbrjkqbolnzvbqpnhhz:data-copilot@aws-1-us-east-2.pooler.supabase.com:6543/postgres

2. **Instalar dependencias**DATABASE_URL=postgresql://postgres.zdbrjkqbolnzvbqpnhhz:data-copilot@aws-1-us-east-2.pooler.supabase.com:6543/postgres

   ```bash

   npm install# Gemini API Configuration

   ```GEMINI_API_KEY=AIzaSyA3e8v6QI88u6b_jyUQQY8W2peT5E4uHmg

```

3. **Configurar variables de entorno**

   ## 🎯 ¿Cómo Funciona?

   Crear archivo `.env` en la raíz:

   ```env### 1. **Consulta en Lenguaje Natural**

   # Gemini AI```

   GEMINI_API_KEY=tu_api_key_aquiUsuario: "Muestra los empleados por país"

   ```

   # PostgreSQL (Supabase)

   DATABASE_URI=postgresql://user:password@host:port/database### 2. **Conversión con Gemini AI**

   POSTGRES_CONNECTION_STRING=postgresql://user:password@host:port/database```sql

   ```SELECT country, COUNT(*) as total_empleados 

FROM employees 

4. **Iniciar el servidor**GROUP BY country 

   ORDER BY total_empleados DESC;

   **Windows (PowerShell):**```

   ```powershell

   .\scripts\start.ps1### 3. **Ejecución via MCP**

   ``````

   WebSocket → MCP Server → PostgreSQL → Resultados JSON

   **Linux/Mac:**```

   ```bash

   npm start### 4. **Visualización Automática**

   ``````

Datos → Transformador → Chart.js → Gráfico Interactivo

5. **Abrir el dashboard**```

   

   Navega a: http://localhost:3002## 🛠️ Herramientas y Características



## 💡 Uso### 🤖 **Agente LLM (Gemini)**

- Conversión inteligente de lenguaje natural a SQL

### Consultas de Ejemplo- Validación de consultas generadas

- Soporte para consultas complejas con JOINs

**Saludos y Conversación:**- Manejo de fechas, agregaciones y filtros

```

"Hola"### 📊 **Motor de Gráficos**

"¿Cómo estás?"- **Tipos soportados**: Barras, Líneas, Circular, Dona, Dispersión, Radar

"Gracias"- **Interactividad**: Hover, zoom, exportación PNG

```- **Responsive**: Adaptable a diferentes pantallas

- **Animaciones**: Transiciones suaves

**Consultas SQL:**

```### 🔄 **Transformador de Datos**

"Muestra los empleados por país"- **Auto-detección**: Reconoce tipos de datos automáticamente

"¿Cuáles son los productos más vendidos?"- **Series temporales**: Gráficos de evolución temporal

"Ventas por categoría de producto"- **Datos categóricos**: Distribuciones y comparaciones

"Evolución de pedidos por mes"- **Métricas automáticas**: Total, promedio, máximo, mínimo

"Top 5 clientes con más órdenes"

```### 🌐 **Frontend Moderno**

- **Chat interface**: Para consultas en lenguaje natural

**Preguntas Fuera de Contexto:**- **Panel de gráficos**: Visualización en tiempo real

```- **Métricas rápidas**: KPIs automáticos

"¿Qué día es hoy?"- **Ejemplos integrados**: Consultas predefinidas

"¿Cómo está el clima?"

```## 🔗 Enlaces y Puertos

→ Gemini responderá educadamente que solo puede ayudar con consultas de base de datos

- **Analytics Dashboard**: `file://frontend-analytics.html`

## 🏗️ Arquitectura- **Cliente MCP Básico**: `file://client-mcp-direct.html`

- **Estado MCP**: http://localhost:3002/mcp-status

```- **WebSocket Endpoint**: ws://localhost:3002

┌─────────────────┐

│   Frontend      │## 📊 Consultas de Ejemplo

│  (index.html)   │

└────────┬────────┘### 📈 **Análisis de Empleados**

         │ WebSocket```

         ↓"Muestra los empleados por país"

┌─────────────────┐"¿Cuántos empleados hay en cada región?"

│  HTTP Server    │"Empleados contratados por año"

│  (server.js)    │```

└────────┬────────┘

         │### 🛒 **Análisis de Ventas**

         ↓```

┌─────────────────┐      ┌──────────────┐"¿Cuáles son los productos más vendidos?"

│   MCP Server    │◄────►│  PostgreSQL  │"Ventas por categoría de producto"

│ (mcp-postgres-  │      │   Database   │"Evolución de pedidos por mes"

│   server.js)    │      └──────────────┘```

└─────────────────┘

         ↑### 👥 **Análisis de Clientes**

         │```

┌─────────────────┐"Top 10 clientes con más pedidos"

│   Gemini AI     │"Distribución de clientes por país"

│  (NL → SQL)     │"Clientes más activos este año"

└─────────────────┘```

```

### 📦 **Análisis de Productos**

## 🔧 Scripts Disponibles```

"Productos con mayor stock"

```bash"Categorías más populares"

npm start          # Iniciar servidor en producción"Productos descontinuados"

npm run dev        # Iniciar servidor en desarrollo```

npm run mcp:start  # Iniciar solo MCP server

```## 🎨 Tipos de Gráficos Disponibles



## 📊 Tipos de Gráficos Soportados| Tipo | Ideal Para | Ejemplo |

|------|------------|---------|

- 📈 **Barras**: Comparaciones categóricas| 📊 **Barras** | Comparaciones categóricas | Empleados por país |

- 📉 **Líneas**: Tendencias temporales| 📈 **Líneas** | Series temporales | Ventas por mes |

- 🥧 **Pastel**: Distribuciones porcentuales| 🥧 **Circular** | Distribuciones (≤8 categorías) | Productos por categoría |

- 🍩 **Dona**: Distribuciones con centro vacío| 🍩 **Dona** | Proporciones con centro libre | Participación de mercado |

- 📊 **Mixtos**: Combinaciones de tipos

## 🚀 Flujo de Trabajo Completo

## 🔐 Seguridad

1. **Usuario** escribe consulta en lenguaje natural

- Las credenciales se almacenan en `.env` (no incluido en Git)2. **Gemini AI** convierte la consulta a SQL válido

- Validación de SQL para prevenir inyecciones3. **MCP WebSocket Proxy** envía la consulta al servidor MCP

- Límite de 100 filas por consulta4. **MCP PostgreSQL Server** ejecuta la consulta en la base de datos

- Timeout de 10 segundos en operaciones MCP5. **PostgreSQL** retorna los datos estructurados

6. **Data Transformer** adapta los datos para gráficos

## 🐛 Troubleshooting7. **Chart Engine** genera la visualización con Chart.js

8. **Frontend** muestra el gráfico y métricas automáticas

### Error: "Conexión MCP no disponible"

- Verifica que el puerto 3002 esté libre## 🔧 Comandos Útiles

- Asegúrate de que `DATABASE_URI` esté configurado correctamente

```bash

### Error: "Schema vacío"# Iniciar sistema completo

- Verifica la conexión a PostgreSQLnpm run mcp:start

- Revisa que las tablas existan en la base de datos

# Solo abrir dashboard

### Gráficos no se muestrannpm run analytics

- Abre la consola del navegador (F12)

- Verifica que Chart.js se haya cargado correctamente# Solo abrir cliente MCP básico

npm run client

## 📝 Licencia

# Solo proxy WebSocket

ISCnpm run proxy



## 👤 Autor# Solo servidor MCP

npm run server

MCP PostgreSQL Analytics Team```



## 🤝 Contribuciones## 🎯 Características Técnicas



Las contribuciones son bienvenidas. Por favor:### ✅ **MCP Real**

1. Fork el proyecto- Protocolo JSON-RPC 2.0 completo

2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)- Conexión stdio nativa (como Claude Desktop)

3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)- Herramientas MCP: execute_query, describe_table, get_schema

4. Push a la rama (`git push origin feature/nueva-funcionalidad`)

5. Abre un Pull Request### ✅ **Gemini AI**

- API key integrada

## 🔗 Enlaces Útiles- Prompt engineering optimizado para SQL

- Validación de consultas generadas

- [Model Context Protocol Spec](https://modelcontextprotocol.io)- Manejo de errores inteligente

- [Gemini API Docs](https://ai.google.dev/docs)

- [Chart.js Documentation](https://www.chartjs.org/docs/)### ✅ **Chart.js Avanzado**

- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)- Múltiples tipos de gráficos

- Animaciones y transiciones
- Exportación de imágenes
- Configuración responsive

### ✅ **WebSocket en Tiempo Real**
- Comunicación bidireccional
- Reconexión automática
- Estado de conexión visual
- Manejo de errores robusto

## 📖 Documentación Adicional

- Ver `MCP-DIRECT-README.md` para detalles técnicos del MCP
- Código fuente completamente documentado
- Ejemplos de uso en cada módulo

## 🚀 Despliegue en Producción (Render)

### Opción 1: Usando render.yaml (recomendado)

1. Sube tu código a GitHub
2. En [Render Dashboard](https://dashboard.render.com/), crea un nuevo "Blueprint"
3. Conecta tu repositorio de GitHub
4. Render detectará automáticamente el archivo `render.yaml`

### Opción 2: Configuración manual

1. Crea un nuevo **Web Service** en Render
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build Command**: `npm run render:build`
   - **Start Command**: `npm start`
4. Agrega las **Variables de Entorno**:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = Tu URL de PostgreSQL
   - `GOOGLE_API_KEY` = Tu API key de Gemini
   
### Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV` | `production` para despliegue |
| `DATABASE_URL` | URL de conexión PostgreSQL (ej: `postgresql://user:pass@host:5432/db`) |
| `GOOGLE_API_KEY` | API Key de Google AI Studio para Gemini |
| `PORT` | (Opcional) Puerto del servidor, Render lo asigna automáticamente |

### Base de Datos

Puedes usar:
- **Render PostgreSQL**: Crea una base de datos PostgreSQL en Render
- **Supabase**: Servicio gratuito de PostgreSQL
- **Neon**: PostgreSQL serverless

Asegúrate de importar los datos de Northwind en tu base de datos.

---
*🔗 Dashboard MCP Analytics - Lenguaje Natural → SQL → Gráficos*
*Compatible con protocolo Claude Desktop • Powered by Gemini AI • Chart.js*
