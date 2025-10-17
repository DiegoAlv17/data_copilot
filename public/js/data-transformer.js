// data-transformer.js - Transformador de datos ADAPTATIVO para gráficos

class DataTransformer {
    constructor() {
        this.supportedChartTypes = ['bar', 'line', 'pie', 'doughnut'];
    }

    // FUNCIÓN PRINCIPAL: Transformar datos automáticamente
    transformDataForChart(mcpData, context = {}) {
        console.log('🔄 Transformando datos:', mcpData);
        
        if (!mcpData || !mcpData.rows || mcpData.rows.length === 0) {
            console.warn('⚠️ No hay datos para transformar');
            return null;
        }

        const { columns, rows } = mcpData;
        console.log(`📊 Columnas: ${columns.join(', ')}`);
        console.log(`📈 Filas: ${rows.length}`);
        
        // Analizar estructura de datos
        const analysis = this.analyzeDataStructure(columns, rows);
        console.log('🔍 Análisis:', analysis);
        
        // Transformar según el análisis
        return this.createAdaptiveChart(columns, rows, analysis);
    }

    // Analizar automáticamente la estructura de datos
    analyzeDataStructure(columns, rows) {
        const analysis = {
            numericColumns: [],
            textColumns: [],
            dateColumns: []
        };

        columns.forEach((col, colIndex) => {
            const sampleValues = rows.slice(0, 5).map(row => row[colIndex]);
            const type = this.detectColumnType(sampleValues);
            
            if (type === 'numeric') {
                analysis.numericColumns.push(col);
            } else if (type === 'date') {
                analysis.dateColumns.push(col);
            } else {
                analysis.textColumns.push(col);
            }
        });
        
        return analysis;
    }

    // Detectar tipo de columna
    detectColumnType(values) {
        let numericCount = 0;
        let dateCount = 0;

        values.forEach(val => {
            if (val === null || val === undefined) return;
            
            const numVal = Number(val);
            if (!isNaN(numVal) && val.toString().trim() !== '') {
                numericCount++;
                return;
            }
            
            const dateVal = new Date(val);
            if (dateVal instanceof Date && !isNaN(dateVal)) {
                dateCount++;
            }
        });

        const total = values.length;
        if (numericCount / total > 0.7) return 'numeric';
        if (dateCount / total > 0.7) return 'date';
        return 'text';
    }

    // Crear gráfico adaptativo basado en análisis
    createAdaptiveChart(columns, rows, analysis) {
        console.log('🎨 Creando gráfico adapt ativo...');
        
        // CASO 1: Texto + Numérico (MÁS COMÚN)
        if (analysis.textColumns.length === 1 && analysis.numericColumns.length >= 1) {
            return this.createCategoricalChart(columns, rows, analysis);
        }
        
        // CASO 2: Fecha + Numérico (Series temporales)
        if (analysis.dateColumns.length >= 1 && analysis.numericColumns.length >= 1) {
            return this.createTimeSeriesChart(columns, rows, analysis);
        }
        
        // CASO 3: Solo numéricos
        if (analysis.numericColumns.length >= 2) {
            return this.createMultiSeriesChart(columns, rows, analysis);
        }
        
        // FALLBACK: Genérico
        return this.createGenericChart(columns, rows);
    }

    // Gráfico categórico
    createCategoricalChart(columns, rows, analysis) {
        console.log('📊 Creando gráfico categórico');
        
        const labelCol = analysis.textColumns[0];
        const labelIndex = columns.indexOf(labelCol);
        
        const labels = rows.map(row => String(row[labelIndex] || 'Sin categoría'));
        const datasets = [];
        
        analysis.numericColumns.forEach((numCol, idx) => {
            const numIndex = columns.indexOf(numCol);
            const data = rows.map(row => Number(row[numIndex]) || 0);
            const color = this.getColor(idx);
            
            datasets.push({
                label: numCol,
                data: data,
                backgroundColor: color,
                borderColor: color.replace('0.7', '1'),
                borderWidth: 2
            });
        });
        
        return {
            type: 'categorical',
            labels: labels,
            datasets: datasets,
            metrics: this.calculateMetrics(datasets, labels),
            rawData: { columns, rows }
        };
    }

    // Series temporales
    createTimeSeriesChart(columns, rows, analysis) {
        console.log('📈 Creando series temporales');
        
        const dateCol = analysis.dateColumns[0];
        const dateIndex = columns.indexOf(dateCol);
        
        const sortedRows = [...rows].sort((a, b) => 
            new Date(a[dateIndex]) - new Date(b[dateIndex])
        );
        
        const labels = sortedRows.map(row => 
            this.formatDate(new Date(row[dateIndex]))
        );
        
        const datasets = [];
        
        analysis.numericColumns.forEach((numCol, idx) => {
            const numIndex = columns.indexOf(numCol);
            const data = sortedRows.map(row => Number(row[numIndex]) || 0);
            const color = this.getColor(idx);
            
            datasets.push({
                label: numCol,
                data: data,
                backgroundColor: color.replace('0.7', '0.2'),
                borderColor: color.replace('0.7', '1'),
                borderWidth: 3,
                fill: true,
                tension: 0.4
            });
        });
        
        return {
            type: 'time_series',
            labels: labels,
            datasets: datasets,
            metrics: this.calculateMetrics(datasets, labels),
            rawData: { columns, rows }
        };
    }

    // Múltiples series
    createMultiSeriesChart(columns, rows, analysis) {
        console.log('📊 Creando multi-series');
        
        const labels = rows.map((_, idx) => `Fila ${idx + 1}`);
        const datasets = [];
        
        analysis.numericColumns.forEach((numCol, idx) => {
            const numIndex = columns.indexOf(numCol);
            const data = rows.map(row => Number(row[numIndex]) || 0);
            const color = this.getColor(idx);
            
            datasets.push({
                label: numCol,
                data: data,
                backgroundColor: color,
                borderColor: color.replace('0.7', '1'),
                borderWidth: 2
            });
        });
        
        return {
            type: 'multi_series',
            labels: labels,
            datasets: datasets,
            metrics: this.calculateMetrics(datasets, labels),
            rawData: { columns, rows }
        };
    }

    // Gráfico genérico (fallback)
    createGenericChart(columns, rows) {
        console.log('📊 Creando gráfico genérico');
        
        const labels = rows.map((row, idx) => 
            String(row[0] || `Fila ${idx + 1}`)
        );
        
        const datasets = [];
        
        for (let colIdx = 1; colIdx < columns.length; colIdx++) {
            const data = rows.map(row => Number(row[colIdx]) || 0);
            const color = this.getColor(colIdx - 1);
            
            datasets.push({
                label: columns[colIdx],
                data: data,
                backgroundColor: color,
                borderColor: color.replace('0.7', '1'),
                borderWidth: 2
            });
        }
        
        return {
            type: 'generic',
            labels: labels,
            datasets: datasets,
            metrics: this.calculateMetrics(datasets, labels),
            rawData: { columns, rows }
        };
    }

    // Calcular métricas
    calculateMetrics(datasets, labels) {
        const metrics = {};
        
        datasets.forEach(dataset => {
            const data = dataset.data;
            const total = data.reduce((sum, val) => sum + val, 0);
            const avg = total / data.length;
            
            if (datasets.length === 1) {
                metrics['Total'] = this.formatNumber(total);
                metrics['Promedio'] = this.formatNumber(avg);
                metrics['Máximo'] = this.formatNumber(Math.max(...data));
                metrics['Mínimo'] = this.formatNumber(Math.min(...data));
            } else {
                metrics[`${dataset.label} (Total)`] = this.formatNumber(total);
            }
        });
        
        metrics['Registros'] = labels.length;
        return metrics;
    }

    // Obtener color según índice
    getColor(index) {
        const colors = [
            'rgba(102, 126, 234, 0.7)',
            'rgba(118, 75, 162, 0.7)',
            'rgba(244, 114, 182, 0.7)',
            'rgba(251, 146, 60, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(168, 85, 247, 0.7)'
        ];
        return colors[index % colors.length];
    }

    // Formatear fecha
    formatDate(date) {
        if (!date || isNaN(date)) return 'Fecha inválida';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }

    // Formatear número
    formatNumber(num) {
        if (isNaN(num)) return '0';
        if (Number.isInteger(num)) return num.toLocaleString('es-ES');
        return num.toLocaleString('es-ES', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }
}

// Instancia global
const dataTransformer = new DataTransformer();

// Función global de transformación
function transformDataForChart(mcpData, context = {}) {
    return dataTransformer.transformDataForChart(mcpData, context);
}
