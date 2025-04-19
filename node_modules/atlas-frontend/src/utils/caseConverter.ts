/**
 * Hilfsfunktionen zur Konvertierung zwischen camelCase und snake_case.
 */

// Konvertiert ein Objekt oder einen Wert rekursiv von snake_case zu camelCase
export const toCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  return Object.keys(obj).reduce((acc: any, key: string) => {
    // Ersetze _ gefolgt von einem Kleinbuchstaben durch den Großbuchstaben
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    // Wende die Konvertierung rekursiv auf verschachtelte Objekte an
    acc[camelKey] = typeof obj[key] === 'object' ? toCamelCase(obj[key]) : obj[key];
    return acc;
  }, {});
};

// Konvertiert ein Objekt oder einen Wert rekursiv von camelCase zu snake_case
export const toSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  return Object.keys(obj).reduce((acc: any, key: string) => {
    // Ersetze Großbuchstaben durch _ gefolgt vom Kleinbuchstaben
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    // Wende die Konvertierung rekursiv auf verschachtelte Objekte an
    acc[snakeKey] = typeof obj[key] === 'object' ? toSnakeCase(obj[key]) : obj[key];
    return acc;
  }, {});
};
