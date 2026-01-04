import { useState, useMemo } from 'react';

export const useSort = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];

    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const { key, direction, customOrder } = sortConfig;
        
        let aValue = a[key];
        let bValue = b[key];

        // Lógica especial para órdenes personalizados (ej. Posiciones)
        if (customOrder) {
          const rankA = customOrder[aValue] || 99; // 99 si no existe
          const rankB = customOrder[bValue] || 99;
          return direction === 'ascending' ? rankA - rankB : rankB - rankA;
        }

        // Lógica estándar para strings y números
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key, customOrder = null) => {
    let direction = 'ascending';
    // Si ya estamos ordenando por esta key y es ascendente, cambiamos a descendente
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction, customOrder });
  };

  return { items: sortedItems, requestSort, sortConfig };
};