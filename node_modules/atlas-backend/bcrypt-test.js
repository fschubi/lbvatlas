const bcrypt = require('bcrypt');

const password = '124erich53B2!';
const hash = '$2b$10$KMZ7OaWxQzjw.Ny13AYzZOUr1L0YqKgmIK9IasT3fW66mNd4tVsLa';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    return console.error("❌ Fehler:", err);
  }
  console.log("✅ Vergleichsergebnis:", result);
});
