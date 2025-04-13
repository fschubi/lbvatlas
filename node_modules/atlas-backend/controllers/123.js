const bcrypt = require("bcrypt");
const pool = require("../db");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Benutzer anhand der E-Mail suchen
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Benutzer nicht gefunden" });
    }

    // 🔐 Passwort vergleichen
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Passwort ist falsch" });
    }

    // 🔐 Token generieren (optional – kannst du später erweitern)
    const token = "dummy-token"; // Hier später JWT einbauen

    res.json({
      message: "Login erfolgreich",
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (err) {
    console.error("Login-Fehler:", err);
    res.status(500).json({ message: "Serverfehler beim Login" });
  }
};
