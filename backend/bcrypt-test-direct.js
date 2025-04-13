const bcrypt = require('bcrypt');

const eingabePasswort = 'atlas2024!';
const gespeicherterHash = '$2b$10$T8zGgNWNXZQWRm3hdEPOgOD0Ax0CGhPB7QFjrdc1kF4m0Vnrj7szu';

(async () => {
  const result = await bcrypt.compare(eingabePasswort, gespeicherterHash);
  console.log("✅ Direkter Vergleich:", result);
})();
