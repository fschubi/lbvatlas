const express = require('express');
const router = express.Router();
const switchController = require('../controllers/switchController');

// Netzwerk-Switches
router.post('/network-switches', switchController.createSwitch);
router.get('/network-switches', switchController.getAllSwitches);
router.get('/network-switches/:id', switchController.getSwitchById);
router.put('/network-switches/:id', switchController.updateSwitch);
router.delete('/network-switches/:id', switchController.deleteSwitch);

// Add more settings routes here if needed

module.exports = router;
