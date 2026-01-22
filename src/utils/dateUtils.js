/**
 * Convierte una hora en formato 24h (HH:mm) a formato 12h (hh:mm AM/PM)
 * @param {string} time24 - Hora en formato "14:30"
 * @returns {string} - Hora formateada "2:30 PM"
 */
export const formatTimeTo12Hour = (time24) => {
  if (!time24) return "";
  
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // la hora '0' debe ser '12'
  
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Convierte una fecha "YYYY-MM-DD" a "Día DD/MM/YY"
 * Ejemplo: "2025-08-31" -> "Domingo 31/08/25"
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