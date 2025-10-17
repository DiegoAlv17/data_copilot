const postgres = require('postgres');
require('dotenv').config();

// Configuración de la conexión a PostgreSQL usando el paquete postgres de Supabase
const connectionString = process.env.DATABASE_URI || process.env.DATABASE_URL;
const sql = postgres(connectionString, {
  // Configuraciones específicas para Supabase
  ssl: 'require',
  max: 10, // Máximo de conexiones
  idle_timeout: 20,
  connect_timeout: 10
});

// Función para probar la conexión con reintentos
const testConnection = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Ejecutar una consulta simple para verificar la conexión
      const result = await sql`SELECT NOW() as server_time, version() as postgres_version`;
      console.log('✅ Conexión exitosa a la base de datos PostgreSQL');
      console.log('🕒 Tiempo del servidor:', result[0].server_time);
      console.log('� Versión PostgreSQL:', result[0].postgres_version.split(' ')[0]);
      
      return true;
    } catch (err) {
      console.error(`❌ Intento ${i + 1}/${retries} - Error al conectar a la base de datos:`, err.message);
      
      if (i === retries - 1) {
        console.error('⚠️ No se pudo establecer conexión después de varios intentos');
        console.log('🔧 El servidor continuará ejecutándose, pero sin conexión a la base de datos');
        return false;
      }
      
      console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Función genérica para ejecutar consultas SQL
const query = async (queryText) => {
  try {
    // Usar template string literal para consultas directas
    const result = await sql.unsafe(queryText);
    return result;
  } catch (error) {
    console.error('Error ejecutando consulta SQL:', error.message);
    throw error;
  }
};

module.exports = {
  sql,
  testConnection,
  query
};
