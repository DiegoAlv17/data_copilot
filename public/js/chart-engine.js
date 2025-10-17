// chart-engine.js - Motor de gráficos con Chart.js

class ChartEngine {
    constructor() {
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        };
    }

    // Crear gráfico principal
    createChart(canvas, data, type = 'bar') {
        if (!canvas || !data) {
            throw new Error('Canvas o datos no válidos');
        }

        const ctx = canvas.getContext('2d');
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const config = this.buildChartConfig(data, type);
        
        try {
            return new Chart(ctx, config);
        } catch (error) {
            console.error('Error creando gráfico:', error);
            throw new Error(`Error al crear gráfico: ${error.message}`);
        }
    }

    // Construir configuración del gráfico
    buildChartConfig(data, type) {
        const baseConfig = {
            type: type,
            data: {
                labels: data.labels,
                datasets: data.datasets
            },
            options: { ...this.defaultOptions }
        };

        // Personalizar según el tipo de gráfico
        switch (type) {
            case 'bar':
                return this.configureBarChart(baseConfig, data);
            case 'line':
                return this.configureLineChart(baseConfig, data);
            case 'pie':
            case 'doughnut':
                return this.configurePieChart(baseConfig, data, type);
            case 'scatter':
                return this.configureScatterChart(baseConfig, data);
            case 'radar':
                return this.configureRadarChart(baseConfig, data);
            default:
                return baseConfig;
        }
    }

    // Configurar gráfico de barras
    configureBarChart(config, data) {
        config.options.scales = {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        return this.formatAxisValue(value);
                    }.bind(this)
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 0
                }
            }
        };

        // Configurar datasets para barras
        config.data.datasets.forEach(dataset => {
            dataset.borderRadius = 4;
            dataset.borderSkipped = false;
        });

        return config;
    }

    // Configurar gráfico de líneas
    configureLineChart(config, data) {
        config.options.scales = {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        return this.formatAxisValue(value);
                    }.bind(this)
                }
            },
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            }
        };

        // Configurar datasets para líneas
        config.data.datasets.forEach(dataset => {
            dataset.fill = dataset.fill !== undefined ? dataset.fill : false;
            dataset.tension = dataset.tension || 0.4;
            dataset.pointRadius = 4;
            dataset.pointHoverRadius = 6;
            dataset.pointBackgroundColor = dataset.borderColor;
        });

        return config;
    }

    // Configurar gráfico circular
    configurePieChart(config, data, type) {
        config.type = type;
        
        config.options.plugins.legend.position = 'right';
        config.options.plugins.tooltip.callbacks = {
            label: function(context) {
                const dataset = context.dataset;
                const total = dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${this.formatAxisValue(context.raw)} (${percentage}%)`;
            }.bind(this)
        };

        // Para gráfico de dona, configurar el cutout
        if (type === 'doughnut') {
            config.options.cutout = '60%';
        }

        return config;
    }

    // Configurar gráfico de dispersión
    configureScatterChart(config, data) {
        config.options.scales = {
            x: {
                type: 'linear',
                position: 'bottom',
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            },
            y: {
                type: 'linear',
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        };

        // Configurar datasets para scatter
        config.data.datasets.forEach(dataset => {
            dataset.showLine = false;
            dataset.pointRadius = 6;
            dataset.pointHoverRadius = 8;
        });

        return config;
    }

    // Configurar gráfico radar
    configureRadarChart(config, data) {
        config.options.scales = {
            r: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                pointLabels: {
                    font: {
                        size: 12
                    }
                }
            }
        };

        // Configurar datasets para radar
        config.data.datasets.forEach(dataset => {
            dataset.fill = dataset.fill !== undefined ? dataset.fill : true;
            dataset.pointRadius = 4;
            dataset.pointHoverRadius = 6;
        });

        return config;
    }

    // Formatear valores del eje
    formatAxisValue(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        } else if (value % 1 !== 0) {
            return value.toFixed(1);
        } else {
            return value.toString();
        }
    }

    // Determinar el mejor tipo de gráfico para los datos
    suggestChartType(data) {
        if (!data || !data.datasets || data.datasets.length === 0) {
            return 'bar';
        }

        const datasetCount = data.datasets.length;
        const dataPointCount = data.labels ? data.labels.length : 0;
        const dataType = data.type;

        // Series temporales -> línea
        if (dataType === 'time_series') {
            return 'line';
        }

        // Muchas categorías -> gráfico circular
        if (dataPointCount <= 8 && datasetCount === 1 && dataType === 'categorical') {
            return 'pie';
        }

        // Múltiples datasets -> líneas
        if (datasetCount > 1) {
            return 'line';
        }

        // Por defecto barras
        return 'bar';
    }

    // Actualizar gráfico existente
    updateChart(chart, newData, newType = null) {
        if (!chart || !newData) {
            return false;
        }

        try {
            // Si cambió el tipo, necesitamos recrear
            if (newType && chart.config.type !== newType) {
                return false; // Indica que necesita recrearse
            }

            // Actualizar datos
            chart.data.labels = newData.labels;
            chart.data.datasets = newData.datasets;
            
            // Actualizar opciones si es necesario
            if (newData.options) {
                Object.assign(chart.options, newData.options);
            }

            chart.update('active');
            return true;
        } catch (error) {
            console.error('Error actualizando gráfico:', error);
            return false;
        }
    }

    // Exportar gráfico como imagen
    exportChart(chart, filename = 'chart.png') {
        if (!chart) {
            throw new Error('Gráfico no válido');
        }

        try {
            const canvas = chart.canvas;
            const url = canvas.toDataURL('image/png');
            
            // Crear enlace de descarga
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('Error exportando gráfico:', error);
            throw new Error(`Error al exportar: ${error.message}`);
        }
    }

    // Obtener estadísticas del gráfico
    getChartStats(chart) {
        if (!chart || !chart.data) {
            return null;
        }

        const stats = {
            type: chart.config.type,
            datasets: chart.data.datasets.length,
            dataPoints: chart.data.labels ? chart.data.labels.length : 0,
            totalValues: 0,
            averageValue: 0,
            maxValue: 0,
            minValue: 0
        };

        // Calcular estadísticas de valores
        const allValues = [];
        chart.data.datasets.forEach(dataset => {
            if (Array.isArray(dataset.data)) {
                dataset.data.forEach(value => {
                    if (typeof value === 'number') {
                        allValues.push(value);
                    }
                });
            }
        });

        if (allValues.length > 0) {
            stats.totalValues = allValues.reduce((sum, val) => sum + val, 0);
            stats.averageValue = stats.totalValues / allValues.length;
            stats.maxValue = Math.max(...allValues);
            stats.minValue = Math.min(...allValues);
        }

        return stats;
    }

    // Crear animación personalizada
    createCustomAnimation(type = 'fadeIn') {
        const animations = {
            fadeIn: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            slideUp: {
                duration: 1200,
                easing: 'easeOutBounce'
            },
            zoomIn: {
                duration: 800,
                easing: 'easeInOutBack'
            }
        };

        return animations[type] || animations.fadeIn;
    }
}

// Función global para crear gráficos
function createChart(canvas, data, type = 'bar') {
    const engine = new ChartEngine();
    return engine.createChart(canvas, data, type);
}

// Función global para sugerir tipo de gráfico
function suggestChartType(data) {
    const engine = new ChartEngine();
    return engine.suggestChartType(data);
}

// Función global para exportar gráfico
function exportChart(chart, filename) {
    const engine = new ChartEngine();
    return engine.exportChart(chart, filename);
}
