/**
 * Index-Datei zur zentralen Bereitstellung aller Controller
 */

const roleController = require('./roleController');
const authController = require('./authController');
const userController = require('./userController');
const deviceController = require('./deviceController');
const licenseController = require('./licenseController');
const certificateController = require('./certificateController');
const accessoryController = require('./accessoryController');
const inventoryController = require('./inventoryController');
const todoController = require('./todoController');
const ticketController = require('./ticketController');
const reportController = require('./reportController');
const userGroupController = require('./userGroupController');
const settingsController = require('./settingsController');

module.exports = {
  roleController,
  authController,
  userController,
  deviceController,
  licenseController,
  certificateController,
  accessoryController,
  inventoryController,
  todoController,
  ticketController,
  reportController,
  userGroupController,
  settingsController
};
