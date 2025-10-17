# start.ps1 - Script de inicio para MCP Analytics Dashboard

Write-Host "🚀 Iniciando MCP Analytics Dashboard..." -ForegroundColor Green
Write-Host ""

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Node.js no encontrado. Instalalo desde https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Navegar al directorio raíz del proyecto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# Verificar dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "✗ Error: Archivo .env no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "⚙️  Configuración verificada:" -ForegroundColor Cyan
Write-Host "- Base de datos: PostgreSQL (Supabase)" -ForegroundColor White
Write-Host "- MCP Server: src/server/mcp-postgres-server.js" -ForegroundColor White
Write-Host "- WebSocket Proxy: puerto 3002" -ForegroundColor White
Write-Host "- Gemini API: Integrado" -ForegroundColor White
Write-Host ""

# Verificar si el puerto 3002 esta en uso
$portInUse = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Puerto 3002 en uso. Cerrando procesos..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -eq "node"
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Iniciar MCP Proxy en background
Write-Host "🌐 Iniciando servidor..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot
    node src/server/server.js
}

# Esperar a que el servidor esté listo
Start-Sleep -Seconds 3

# Verificar que el servidor esté corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/mcp-status" -UseBasicParsing -TimeoutSec 5
    $status = $response.Content | ConvertFrom-Json
    Write-Host "✓ Estado: $($status.status)" -ForegroundColor Cyan
    Write-Host "✓ MCP Server: $($status.mcpServer)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠ Advertencia: No se pudo verificar el estado del MCP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 📊 MCP Analytics Dashboard ===" -ForegroundColor Green
Write-Host ""

# Abrir el Analytics Dashboard en el navegador
try {
    Write-Host "🌐 Abriendo Analytics Dashboard..." -ForegroundColor Green
    Start-Process "http://localhost:3002"
} catch {
    Write-Host "⚠ No se pudo abrir automáticamente. Abre manualmente:" -ForegroundColor Yellow
    Write-Host "   URL: http://localhost:3002" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 Enlaces importantes:" -ForegroundColor Cyan
Write-Host "   🌐 Analytics Dashboard: http://localhost:3002" -ForegroundColor White
Write-Host "   📊 Estado MCP: http://localhost:3002/mcp-status" -ForegroundColor White
Write-Host "   🔌 WebSocket: ws://localhost:3002" -ForegroundColor White
Write-Host ""

Write-Host "⚡ Características del dashboard:" -ForegroundColor Cyan
Write-Host "   - Consultas conversacionales con Gemini AI" -ForegroundColor White
Write-Host "   - Conversión automática NL → SQL" -ForegroundColor White
Write-Host "   - Ejecución vía MCP real (no simulado)" -ForegroundColor White
Write-Host "   - Gráficos interactivos con Chart.js" -ForegroundColor White
Write-Host "   - Métricas automáticas" -ForegroundColor White
Write-Host "   - Múltiples tipos de gráficos" -ForegroundColor White
Write-Host ""

Write-Host "💡 Ejemplos de consultas:" -ForegroundColor Yellow
Write-Host "   'Hola' → Saludo conversacional" -ForegroundColor White
Write-Host "   'Muestra los empleados por país'" -ForegroundColor White
Write-Host "   '¿Cuáles son los productos más vendidos?'" -ForegroundColor White
Write-Host "   'Ventas por categoría de producto'" -ForegroundColor White
Write-Host "   'Evolución de pedidos por mes'" -ForegroundColor White
Write-Host ""

Write-Host "⌨️  Presiona Ctrl+C para detener el servidor..." -ForegroundColor Yellow
Write-Host "📋 Logs del servidor:" -ForegroundColor Yellow

# Mostrar logs del servidor
try {
    while ($true) {
        $jobState = Get-Job -Id $serverJob.Id
        if ($jobState.State -eq "Completed" -or $jobState.State -eq "Failed") {
            Write-Host "⚠ El servidor se ha detenido inesperadamente" -ForegroundColor Yellow
            break
        }
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "🛑 Deteniendo servidor..." -ForegroundColor Yellow
} finally {
    # Limpiar
    Remove-Job -Job $serverJob -Force -ErrorAction SilentlyContinue
    Write-Host "✓ MCP Analytics Dashboard cerrado" -ForegroundColor Green
}
