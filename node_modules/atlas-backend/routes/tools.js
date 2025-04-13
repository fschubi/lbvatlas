const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

router.post("/hash", async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Kein Passwort übergeben." });
  }

  const hash = await bcrypt.hash(password, 10);
  res.json({ password, hash });
});

module.exports = router;
