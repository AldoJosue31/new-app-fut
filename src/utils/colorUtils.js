// src/utils/colorUtils.js
export const getDivisionColor = (str) => {
  if (!str) return 'border-gray-300';
  
  // Colores de Tailwind seguros para bordes
  const colors = [
    'border-blue-500', 'border-red-500', 'border-yellow-500', 
    'border-purple-500', 'border-pink-500', 'border-indigo-500', 
    'border-orange-500', 'border-teal-500', 'border-cyan-500',
    'border-lime-500', 'border-emerald-500', 'border-fuchsia-500'
  ];
  
  // Hash simple: suma los códigos de caracteres
  const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return colors[hash % colors.length];
};