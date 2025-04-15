const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Basis-Routen für Rollen
router.get('/', authenticateToken, roleController.getAllRoles);
router.get('/:id', authenticateToken, roleController.getRoleById);
router.post('/', authenticateToken, checkPermission('roles.create'), roleController.createRole);
router.put('/:id', authenticateToken, checkPermission('roles.update'), roleController.updateRole);
router.delete('/:id', authenticateToken, checkPermission('roles.delete'), roleController.deleteRole);

// Berechtigungs-Routen
router.get('/:id/permissions', authenticateToken, roleController.getRolePermissions);
router.post('/:id/permissions', authenticateToken, checkPermission('roles.assign_permissions'), roleController.assignPermission);
router.delete('/:id/permissions/:permissionId', authenticateToken, checkPermission('roles.remove_permissions'), roleController.removePermission);

module.exports = router;
