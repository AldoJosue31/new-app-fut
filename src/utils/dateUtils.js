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
 * Ejemplo: "2026-01-30" -> "Viernes 30/01/26"
 */
export const formatDateWithWeekday = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split('-');
  // Usamos el constructor (y, m-1, d) para evitar problemas de zona horaria UTC
  const date = new Date(year, month - 1, day);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = days[date.getDay()];
  return `${dayName} ${day}/${month}/${year.slice(-2)}`;
};

/**
 * Suma días a una fecha string YYYY-MM-DD y retorna string YYYY-MM-DD
 */
export const addDaysToDate = (dateStr, days) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    
    date.setDate(date.getDate() + days);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

/**
 * Verifica si un string es una fecha válida (YYYY-MM-DD)
 */
export const isValidDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr + 'T00:00:00'); // T00:00:00 ayuda al parsing en ciertos navegadores
    return !isNaN(date.getTime());
};