/**
 * Clase personalizada para manejar errores operativos de la aplicación.
 * Extiende la clase Error nativa de Node.js.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indica que es un error previsto, no un bug no controlado
    
    // Captura el stack trace excluyendo el constructor de esta clase (limpia los logs)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Función helper para crear instancias de AppError de forma rápida y legible.
 * 
 * @param {number} statusCode - Código de estado HTTP (ej. 400, 404, 500)
 * @param {string} message - Mensaje de error descriptivo
 * @returns {AppError} Instancia de AppError
 */
const createError = (statusCode, message) => {
  return new AppError(message, statusCode);
};

module.exports = {
  AppError,
  createError
};
