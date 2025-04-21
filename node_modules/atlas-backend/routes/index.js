const express = require('express');
const router = express.Router();

// Import individual route files
const authRoutes = require('./auth');
const userRoutes = require('./userRoutes'); // Assuming this handles general user management
const licenseTypeRoutes = require('./licenseTypeRoutes');
const locationRoutes = require('./locationRoutes');
const userGroupRoutes = require('./userGroupRoutes');
const roleRoutes = require('./roleRoutes');
const deviceModelRoutes = require('./deviceModelRoutes');
const networkOutletRoutes = require('./networkOutletRoutes');
const networkPortRoutes = require('./networkPortRoutes');
const networkSocketRoutes = require('./networkSocketRoutes');
const switchRoutes = require('./switchRoutes');
const auditRoutes = require('./auditRoutes');
const assetTagSettingsRoutes = require('./assetTagSettingsRoutes');
const permissionRoutes = require('./permissionRoutes');
const supplierRoutes = require('./supplierRoutes');
const labelTemplateRoutes = require('./labelTemplateRoutes');
const labelSettingsRoutes = require('./labelSettingsRoutes');
const departmentRoutes = require('./departmentRoutes');
const manufacturerRoutes = require('./manufacturerRoutes');
const categoryRoutes = require('./categoryRoutes');
const roomRoutes = require('./roomRoutes');
const systemSettingsRoutes = require('./systemSettingsRoutes');
const simpleUserGroupRoutes = require('./simpleUserGroupRoutes');
const accessoriesRoutes = require('./accessories');
const certificatesRoutes = require('./certificates');
const documentsRoutes = require('./documents');
const inventoryRoutes = require('./inventory');
const inventorySessionsRoutes = require('./inventorySessions');
const licensesRoutes = require('./licenses');
const passwordRoutes = require('./passwordRoutes');
const reportsRoutes = require('./reports');
const settingsRoutes = require('./settingsRoutes');
const ticketsRoutes = require('./tickets');
const todosRoutes = require('./todos');
const toolsRoutes = require('./tools');
const devicesRoutes = require('./devices'); // Added devices route

// --- Register routes with base paths ---
// Authentication
router.use('/auth', authRoutes);

// Core Data Routes (Examples - adjust prefixes as needed)
router.use('/users', userRoutes);
router.use('/devices', devicesRoutes);
router.use('/licenses', licensesRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/accessories', accessoriesRoutes);
router.use('/documents', documentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/todos', todosRoutes);

// Settings & Configuration Routes
router.use('/settings', settingsRoutes); // General settings endpoint?
router.use('/settings/license-types', licenseTypeRoutes);
router.use('/settings/locations', locationRoutes);
router.use('/settings/user-groups', userGroupRoutes); // Might need adjustment based on simpleUserGroupRoutes
router.use('/settings/roles', roleRoutes);
router.use('/settings/device-models', deviceModelRoutes);
router.use('/settings/suppliers', supplierRoutes);
router.use('/settings/manufacturers', manufacturerRoutes);
router.use('/settings/departments', departmentRoutes);
router.use('/settings/categories', categoryRoutes);
router.use('/settings/rooms', roomRoutes);
router.use('/settings/asset-tags', assetTagSettingsRoutes);
router.use('/settings/label-templates', labelTemplateRoutes);
router.use('/settings/label-settings', labelSettingsRoutes);
router.use('/settings/system', systemSettingsRoutes);
router.use('/settings/permissions', permissionRoutes);
// Consider where simpleUserGroupRoutes fits best

// Network Related Routes
router.use('/network/outlets', networkOutletRoutes);
router.use('/network/ports', networkPortRoutes);
router.use('/network/sockets', networkSocketRoutes);
router.use('/network/switches', switchRoutes);

// Inventory Routes
router.use('/inventory', inventoryRoutes);
router.use('/inventory-sessions', inventorySessionsRoutes);

// Other Routes
router.use('/audit-log', auditRoutes);
router.use('/password', passwordRoutes);
router.use('/tools', toolsRoutes);

// Fallback for unhandled routes within /api scope if needed
router.use((req, res, next) => {
  res.status(404).json({ message: 'API Route not found' });
});

module.exports = router;
