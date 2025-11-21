# Flujo Completo de Agentes - Data Copilot

## Diagrama de Arquitectura del Sistema

```mermaid
flowchart TB
    User["👤 Usuario"]
    Client["🌐 React Client<br/>(Puerto 5174)"]
    WS["🔌 WebSocket<br/>(ws://localhost:3004)"]
    Server["⚙️ Express Server<br/>(Puerto 3004)"]
    
    User -->|"Escribe query"| Client
    Client <-->|"WebSocket connection"| WS
    WS <-->|"Mensaje JSON"| Server
    
    Server -->|"Invoca"| BiAgent["🤖 BI Agent<br/>(LangGraph)"]
    
    subgraph "LangGraph Workflow"
        START(["START"])
        
        Orchestrator["📋 Dashboard Orchestrator<br/>Gemini 2.0 Flash"]
        
        START --> Orchestrator
        
        Orchestrator -->|"Decide tipo<br/>de respuesta"| Decision{"¿Es Dashboard<br/>Completo?"}
        
        Decision -->|"SÍ<br/>(estado financiero)"| DashboardBuilder["📊 Dashboard Builder<br/>Procesa múltiples widgets"]
        Decision -->|"NO<br/>(query simple)"| Translator["🔄 Translator Node<br/>Gemini 2.0 Flash"]
        
        subgraph "Pipeline Simple (Query Única)"
            Translator -->|"Genera SQL"| Executor["▶️ Executor Node<br/>Ejecuta SQL vía MCP"]
            Executor -->|"Obtiene datos"| Visualizer["📈 Visualizer Node<br/>Gemini 2.0 Flash"]
            Visualizer -->|"Genera config<br/>de gráfico"| END1(["END"])
        end
        
        subgraph "Pipeline Dashboard (Múltiples Queries)"
            DashboardBuilder -->|"Sub-query 1"| SubPipeline1["Pipeline completo<br/>(Translator→Executor→Visualizer)"]
            DashboardBuilder -->|"Sub-query 2"| SubPipeline2["Pipeline completo<br/>(Translator→Executor→Visualizer)"]
            DashboardBuilder -->|"Sub-query N"| SubPipelineN["Pipeline completo<br/>(Translator→Executor→Visualizer)"]
            
            SubPipeline1 --> Aggregate["🔗 Agregar Widgets"]
            SubPipeline2 --> Aggregate
            SubPipelineN --> Aggregate
            
            Aggregate --> END2(["END"])
        end
    end
    
    BiAgent -->|"Resultado"| Server
    Server -->|"Respuesta JSON"| WS
    WS -->|"Mensaje"| Client
    
    Client -->|"Renderiza"| UI["🎨 UI Components"]
    
    subgraph "React Components"
        UI -->|"type: 'result'"| SingleChart["📊 Single Chart<br/>ChartRenderer"]
        UI -->|"type: 'dashboard'"| DashboardGrid["🗂️ Dashboard Grid<br/>Múltiples widgets"]
        
        SingleChart --> D3Charts["D3.js Charts<br/>Bar | Line | Pie | Card | Table"]
        DashboardGrid --> D3Charts
    end
    
    style START fill:#90EE90
    style END1 fill:#FFB6C1
    style END2 fill:#FFB6C1
    style Decision fill:#FFD700
    style Orchestrator fill:#87CEEB
    style Translator fill:#87CEEB
    style Executor fill:#DDA0DD
    style Visualizer fill:#87CEEB
    style DashboardBuilder fill:#FFA500
```

## Flujo Detallado por Tipo de Query

### 1️⃣ Query Simple: "Show me top 5 products by unit price"

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as React Client
    participant S as Express Server
    participant O as Orchestrator
    participant T as Translator
    participant E as Executor
    participant V as Visualizer
    participant DB as PostgreSQL (MCP)
    
    U->>C: Escribe "Show me top 5 products..."
    C->>S: WebSocket {type: 'query', content: '...'}
    S->>O: invoke(naturalQuery)
    
    Note over O: Analiza query con Gemini
    O-->>S: {isDashboard: false}
    
    S->>T: Procesa como query simple
    Note over T: Gemini convierte NL → SQL
    T->>T: getSchemaTool()
    T-->>S: {sqlQuery: "SELECT..."}
    
    S->>E: Ejecuta SQL
    E->>DB: executeSqlTool(sqlQuery)
    DB-->>E: queryResult: [{...}]
    E-->>S: {queryResult: [...]}
    
    S->>V: Determina visualización
    Note over V: Gemini analiza datos
    V-->>S: {visualizationType: 'bar', chartConfig: {...}}
    
    S->>C: WebSocket {type: 'result', chartData, chartType, chartConfig}
    C->>C: ChartRenderer → BarChart (D3.js)
    C-->>U: Muestra gráfico de barras animado
```

### 2️⃣ Query Dashboard: "Quiero ver el estado financiero de mi empresa"

```mermaid
sequenceDiagram
    participant U as Usuario
    participant C as React Client
    participant S as Express Server
    participant O as Orchestrator
    participant DB as Dashboard Builder
    participant T as Translator
    participant E as Executor
    participant V as Visualizer
    participant PG as PostgreSQL
    
    U->>C: "Quiero ver el estado financiero..."
    C->>S: WebSocket {type: 'query', content: '...'}
    S->>O: invoke(naturalQuery)
    
    Note over O: Gemini detecta dashboard
    O-->>S: {isDashboard: true, dashboardTitle: "Financial Overview", subQueries: [8 queries]}
    
    S->>DB: Procesa dashboard con 8 sub-queries
    
    rect rgb(200, 220, 240)
    Note over DB: Widget 1: Total Revenue
    DB->>T: "Total revenue this year"
    T-->>DB: SQL
    DB->>E: Ejecuta SQL
    E->>PG: Query
    PG-->>E: Data
    DB->>V: Visualiza
    V-->>DB: {type: 'card', config: {...}}
    end
    
    rect rgb(220, 240, 200)
    Note over DB: Widget 2: Order Count
    DB->>T: "Total number of orders"
    T-->>DB: SQL
    DB->>E: Ejecuta SQL
    E->>PG: Query
    PG-->>E: Data
    DB->>V: Visualiza
    V-->>DB: {type: 'card', config: {...}}
    end
    
    rect rgb(240, 220, 200)
    Note over DB: Widget 3-8: Charts & Tables
    DB->>T: Procesa 6 sub-queries restantes
    Note over T,V: Pipeline completo x6
    end
    
    DB-->>S: {dashboardWidgets: [8 widgets]}
    S->>C: WebSocket {type: 'dashboard', widgets: [...]}
    C->>C: DashboardGrid → renderiza 8 componentes
    C-->>U: Muestra dashboard completo con grid responsive
```

## Detalle de Componentes del Sistema

### 🤖 Agentes LangGraph

#### 1. Dashboard Orchestrator
**Función:** Punto de decisión inicial
- **Input:** `naturalQuery` del usuario
- **Proceso:** Usa Gemini 2.0 Flash para analizar la intención
- **Output:** 
  - `isDashboard: false` → Ruta a Translator
  - `isDashboard: true` + `subQueries[]` → Ruta a Dashboard Builder

#### 2. Translator Node
**Función:** Conversión NL → SQL
- **Input:** Query en lenguaje natural
- **Herramientas:** `getSchemaTool()` para contexto de la BD
- **LLM:** Gemini 2.0 Flash con temperatura 0.1
- **Output:** `sqlQuery` (string SQL válido)

#### 3. Executor Node
**Función:** Ejecución de SQL
- **Input:** `sqlQuery`
- **Herramientas:** `executeSqlTool()` vía MCP
- **MCP Server:** PostgreSQL Server (spawned child process)
- **Output:** `queryResult` (array de objetos)

#### 4. Visualizer Node
**Función:** Determina mejor tipo de gráfico
- **Input:** `queryResult` + `naturalQuery`
- **LLM:** Gemini 2.0 Flash con temperatura 0.2
- **Análisis:** Columnas, tipo de datos, cantidad de registros
- **Output:** 
  - `visualizationType`: 'bar' | 'line' | 'pie' | 'card' | 'table'
  - `chartConfig`: {xKey, yKey, label, etc.}

#### 5. Dashboard Builder
**Función:** Orquestador de múltiples widgets
- **Input:** Array de `subQueries`
- **Proceso:** 
  - Itera sobre cada sub-query
  - Ejecuta pipeline completo (T→E→V) para cada una
  - Agrega resultados a array de widgets
- **Output:** `dashboardWidgets[]`

### 🎨 Componentes React + D3.js

#### ChartRenderer
**Función:** Router de visualizaciones
- Recibe `type`, `data`, `config`
- Selecciona componente correcto
- Maneja estados de error y carga

#### Componentes D3.js
1. **BarChart** - Barras verticales con animación, labels en tope
2. **LineChart** - Línea con curva monotone, puntos animados
3. **PieChart** - Circular con leyenda, hover effects, porcentajes
4. **Card** - KPI grande con formato (currency, %, number)
5. **Table** - Tabla responsive con sorting (futuro)

#### DashboardGrid
**Función:** Layout responsive para múltiples widgets
- CSS Grid adaptativo (1-3 columnas)
- Borders con hover effects
- Títulos por widget

---

## Estados del Agente (AgentState)

```typescript
interface AgentState {
  // Siempre presentes
  messages: BaseMessage[];
  naturalQuery: string;
  
  // Query simple
  sqlQuery?: string;
  queryResult?: any[];
  visualizationType?: string;
  chartConfig?: any;
  error?: string;
  
  // Dashboard
  isDashboard?: boolean;
  dashboardTitle?: string;
  dashboardSubQueries?: {query: string, description: string}[];
  dashboardWidgets?: DashboardWidget[];
}
```

## Formato de Mensajes WebSocket

### Cliente → Servidor
```json
{
  "type": "query",
  "content": "Show me top 5 products by unit price"
}
```

### Servidor → Cliente (Query Simple)
```json
{
  "type": "result",
  "text": "This bar chart displays...",
  "chartData": [{...}],
  "chartType": "bar",
  "chartConfig": {"xKey": "product_name", "yKey": "unit_price"},
  "sql": "SELECT..."
}
```

### Servidor → Cliente (Dashboard)
```json
{
  "type": "dashboard",
  "text": "I've created a comprehensive Financial Overview...",
  "dashboardTitle": "Financial Overview",
  "widgets": [
    {
      "query": "Total revenue this year",
      "description": "Total Revenue",
      "data": [{...}],
      "chartType": "card",
      "chartConfig": {...}
    },
    // ... 7 widgets más
  ]
}
```

---

## Ejemplo Real: "Quiero ver el estado financiero de mi empresa"

### Sub-queries generadas por Orchestrator:
1. **"Total revenue this year"** → Card ($1,265,793.04)
2. **"Total number of orders"** → Card (830 orders)
3. **"Average order value"** → Card ($1,524.10)
4. **"Monthly revenue trend for the last 12 months"** → Line Chart
5. **"Sales by product category"** → Bar Chart (8 categorías)
6. **"Sales by country"** → Bar Chart (21 países)
7. **"Top 10 customers by total revenue"** → Table
8. **"Top 10 best-selling products"** → Table

### Layout del Dashboard:
```
┌─────────────┬─────────────┬─────────────┐
│  Card 1     │  Card 2     │  Card 3     │
│  Revenue    │  Orders     │  AOV        │
├─────────────┴─────────────┴─────────────┤
│  Line Chart - Revenue Trend (12 months)  │
├─────────────┬─────────────────────────────┤
│ Bar Chart   │  Bar Chart                  │
│ By Category │  By Country                 │
├─────────────┴─────────────────────────────┤
│  Table - Top 10 Customers                 │
├───────────────────────────────────────────┤
│  Table - Top 10 Products                  │
└───────────────────────────────────────────┘
```

