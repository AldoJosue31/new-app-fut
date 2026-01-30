/**
 * Convierte una hora en formato 24h (HH:mm) a formato 12h (hh:mm AM/PM)
 */
export const formatTimeTo12Hour = (time24) => {
  if (!time24) return "";
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Convierte una fecha "YYYY-MM-DD" a "Día DD/MM/YY"
 */
export const formatDateWithWeekday = (dateStr) => {
  if (!dateStr) return "";
  // Crear fecha asegurando que no haya problemas de zona horaria (usando partes)
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, month - 1, day);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = days[date.getDay()];
  return `${dayName} ${day}/${month}/${year.slice(-2)}`;
};

/**
 * Suma días a una fecha en formato string YYYY-MM-DD y retorna el mismo formato
 * @param {string} dateStr - Fecha base "2023-01-01"
 * @param {number} days - Días a sumar (puede ser negativo)
 * @returns {string} - Nueva fecha "2023-01-08"
 */
export const addDaysToDate = (dateStr, days) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Crear fecha manejando zona horaria local para evitar saltos de día
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    
    date.setDate(date.getDate() + days);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};