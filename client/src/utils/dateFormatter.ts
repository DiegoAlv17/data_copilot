/**
 * Utilidad para detectar y formatear fechas en los gráficos
 */

/**
 * Detecta si un string es una fecha válida
 * Soporta formatos ISO y otros formatos comunes
 */
export function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  
  // Patrones comunes de fechas
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format: 2024-01-15T00:00:00
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY o MM/DD/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];
  
  if (datePatterns.some(pattern => pattern.test(value))) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  return false;
}

/**
 * Detecta si un array de datos contiene fechas en una clave específica
 */
export function containsDates(data: any[], key: string): boolean {
  if (!data || data.length === 0) return false;
  
  // Verificar los primeros elementos para determinar si son fechas
  const samplesToCheck = Math.min(5, data.length);
  let dateCount = 0;
  
  for (let i = 0; i < samplesToCheck; i++) {
    if (isDateString(data[i][key])) {
      dateCount++;
    }
  }
  
  // Si la mayoría de las muestras son fechas, consideramos que la columna contiene fechas
  return dateCount >= samplesToCheck * 0.8;
}

/**
 * Formatea una fecha según el rango de datos
 * - Si todos son del mismo año: muestra "Mes día" (ej: "Ene 15")
 * - Si hay múltiples años: muestra "Mes 'YY" (ej: "Ene '24")
 * - Si son del mismo mes: muestra solo el día
 */
export function formatDateForChart(
  value: string, 
  options?: { 
    locale?: string;
    showYear?: boolean;
    shortFormat?: boolean;
  }
): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  const locale = options?.locale || 'es-ES';
  const showYear = options?.showYear ?? false;
  const shortFormat = options?.shortFormat ?? true;
  
  if (shortFormat) {
    const month = date.toLocaleDateString(locale, { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    
    if (showYear) {
      return `${month} '${year}`;
    }
    return `${month} ${day}`;
  }
  
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: showYear ? '2-digit' : undefined
  });
}

/**
 * Analiza los datos para determinar el mejor formato de fecha
 */
export function analyzeDateRange(data: any[], key: string): {
  hasMultipleYears: boolean;
  hasSameMonth: boolean;
  minDate: Date | null;
  maxDate: Date | null;
} {
  if (!data || data.length === 0) {
    return { hasMultipleYears: false, hasSameMonth: true, minDate: null, maxDate: null };
  }
  
  const dates = data
    .map(d => new Date(d[key]))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (dates.length === 0) {
    return { hasMultipleYears: false, hasSameMonth: true, minDate: null, maxDate: null };
  }
  
  const years = new Set(dates.map(d => d.getFullYear()));
  const months = new Set(dates.map(d => `${d.getFullYear()}-${d.getMonth()}`));
  
  return {
    hasMultipleYears: years.size > 1,
    hasSameMonth: months.size === 1,
    minDate: dates[0],
    maxDate: dates[dates.length - 1]
  };
}

/**
 * Crea un formateador de fechas optimizado para el eje X de los gráficos
 */
export function createAxisDateFormatter(data: any[], key: string): (value: string) => string {
  const analysis = analyzeDateRange(data, key);
  
  return (value: string): string => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    
    const locale = 'es-ES';
    
    // Si hay múltiples años, mostrar mes y año
    if (analysis.hasMultipleYears) {
      const month = date.toLocaleDateString(locale, { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${month} '${year}`;
    }
    
    // Si todos son del mismo mes, mostrar solo el día
    if (analysis.hasSameMonth) {
      return date.getDate().toString();
    }
    
    // Por defecto, mostrar mes y día
    const month = date.toLocaleDateString(locale, { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };
}
