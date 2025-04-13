// Netzwerk-Switches
router.post('/network-switches', settingsController.createNetworkSwitch);
router.get('/network-switches', settingsController.getNetworkSwitches);
router.get('/network-switches/:id', settingsController.getNetworkSwitchById);
router.put('/network-switches/:id', settingsController.updateNetworkSwitch);
router.delete('/network-switches/:id', settingsController.deleteNetworkSwitch);
