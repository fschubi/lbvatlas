const express = require('express');
const router = express.Router();

// Eine einfache GET-Route, die immer funktioniert
router.get('/', (req, res) => {
  res.json({
    message: 'Benutzergruppen-API funktioniert',
    groups: []
  });
});

// Eine einfache GET-Route für eine einzelne Gruppe
router.get('/:id', (req, res) => {
  res.json({
    message: `Benutzergruppe mit ID ${req.params.id}`,
    group: {
      id: req.params.id,
      name: `Gruppe ${req.params.id}`,
      description: 'Testbeschreibung'
    }
  });
});

module.exports = router;
