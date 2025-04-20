/**
 * Konvertiert einen String oder die Schlüssel eines Objekts von camelCase zu snake_case.
 * @param {string|object} input - Der Eingabestring oder das Objekt.
 * @returns {string|object} Der konvertierte String oder das Objekt.
 */
const toSnakeCase = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(toSnakeCase); // Rekursiv für Arrays
    }
    const newObj = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        // Rekursiv für verschachtelte Objekte
        newObj[snakeKey] = toSnakeCase(input[key]);
      }
    }
    return newObj;
  }
  return input; // Gibt andere Typen unverändert zurück
};

/**
 * Konvertiert einen String oder die Schlüssel eines Objekts von snake_case zu camelCase.
 * @param {string|object} input - Der Eingabestring oder das Objekt.
 * @returns {string|object} Der konvertierte String oder das Objekt.
 */
const toCamelCase = (input) => {
  if (typeof input === 'string') {
    return input.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }
  if (typeof input === 'object' && input !== null) {
     if (Array.isArray(input)) {
      return input.map(toCamelCase); // Rekursiv für Arrays
    }
    const newObj = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
         // Rekursiv für verschachtelte Objekte
        newObj[camelKey] = toCamelCase(input[key]);
      }
    }
    return newObj;
  }
  return input; // Gibt andere Typen unverändert zurück
};

module.exports = { toSnakeCase, toCamelCase };
