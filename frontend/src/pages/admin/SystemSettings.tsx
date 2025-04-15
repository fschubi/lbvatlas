import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import MainLayout from '../../layout/MainLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
};

const SystemSettings: React.FC = () => {
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // URL-Parameter für den Tab auslesen
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setTabValue(tabIndex);
      }
    }
  }, [location]);

  // Allgemeine Einstellungen
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'ATLAS Asset Management',
    siteUrl: 'https://atlas.example.com',
    logoUrl: '',
    defaultLanguage: 'de',
    defaultCurrency: 'EUR',
    sessionTimeout: 30,
    itemsPerPage: 25,
    enableUserRegistration: false,
    requireEmailVerification: true
  });

  // E-Mail-Einstellungen
  const [emailSettings, setEmailSettings] = useState({
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: 'atlas@example.com',
    senderName: 'ATLAS System',
    enableSsl: true,
    enableNotifications: true
  });

  // Backup-Einstellungen
  const [backupSettings, setBackupSettings] = useState({
    autoBackupEnabled: true,
    backupInterval: 'daily',
    backupTime: '03:00',
    backupRetention: 30,
    backupLocation: '/backups',
    includeAttachments: true
  });

  // Rollen-Einstellungen
  const [roleSettings, setRoleSettings] = useState({
    roles: [
      { id: 1, name: 'admin', description: 'Administrator mit vollen Rechten', permissions: 36 },
      { id: 2, name: 'manager', description: 'Manager mit erweiterten Rechten', permissions: 24 },
      { id: 3, name: 'support', description: 'Support-Mitarbeiter', permissions: 12 },
      { id: 4, name: 'user', description: 'Standardbenutzer', permissions: 8 }
    ],
    permissions: [],
    selectedRoleId: 1 // Admin ist standardmäßig ausgewählt
  });

  // Berechtigungsmodule und Aktionen basierend auf der Datenbankstruktur
  const permissionModules = [
    { name: 'users', label: 'Benutzer', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'roles', label: 'Rollen', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'devices', label: 'Geräte', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'licenses', label: 'Lizenzen', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'certificates', label: 'Zertifikate', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'accessories', label: 'Zubehör', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'inventory', label: 'Inventar', actions: ['create', 'read', 'update', 'delete'] },
    { name: 'settings', label: 'Einstellungen', actions: ['read', 'update'] },
    { name: 'audit', label: 'Audit-Logs', actions: ['read'] }
  ];

  // Simulierte Rollenstatus (in Echtumgebung würden diese von der API abgerufen)
  const rolePermissions = {
    1: {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      devices: ['create', 'read', 'update', 'delete'],
      licenses: ['create', 'read', 'update', 'delete'],
      certificates: ['create', 'read', 'update', 'delete'],
      accessories: ['create', 'read', 'update', 'delete'],
      inventory: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
      audit: ['read']
    },
    2: {
      users: ['create', 'read', 'update'],
      roles: [],
      devices: ['create', 'read', 'update'],
      licenses: ['create', 'read', 'update'],
      certificates: ['create', 'read', 'update'],
      accessories: ['create', 'read', 'update'],
      inventory: ['create', 'read', 'update'],
      settings: [],
      audit: []
    },
    3: {
      users: [],
      roles: [],
      devices: ['read', 'update'],
      licenses: ['read', 'update'],
      certificates: ['read', 'update'],
      accessories: ['read', 'update'],
      inventory: [],
      settings: [],
      audit: []
    },
    4: {
      users: [],
      roles: [],
      devices: ['read'],
      licenses: ['read'],
      certificates: ['read'],
      accessories: ['read'],
      inventory: [],
      settings: [],
      audit: []
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGeneralSettingsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEmailSettingsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setEmailSettings({
      ...emailSettings,
      [name]: type === 'checkbox' ? checked :
              name === 'smtpPort' ? parseInt(value) || 0 : value
    });
  };

  const handleBackupSettingsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setBackupSettings({
      ...backupSettings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const saveGeneralSettings = async () => {
    setIsLoading(true);
    try {
      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Allgemeine Einstellungen wurden erfolgreich gespeichert.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Einstellungen.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    setIsLoading(true);
    try {
      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'E-Mail-Einstellungen wurden erfolgreich gespeichert.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der E-Mail-Einstellungen.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBackupSettings = async () => {
    setIsLoading(true);
    try {
      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Backup-Einstellungen wurden erfolgreich gespeichert.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Backup-Einstellungen.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBackupNow = async () => {
    setIsLoading(true);
    try {
      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSnackbar({
        open: true,
        message: 'Backup wurde erfolgreich erstellt.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen des Backups.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveRoleSettings = async () => {
    setIsLoading(true);
    try {
      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Rollen und Berechtigungen wurden erfolgreich gespeichert.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Rollen und Berechtigungen.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRoleSelect = (roleId: number) => {
    setRoleSettings({
      ...roleSettings,
      selectedRoleId: roleId
    });
  };

  const getSelectedRolePermissions = () => {
    return rolePermissions[roleSettings.selectedRoleId as keyof typeof rolePermissions] || {};
  };

  const hasPermission = (module: string, action: string) => {
    const permissions = getSelectedRolePermissions();
    const modulePermissions = permissions[module as keyof typeof permissions];
    return modulePermissions ? (modulePermissions as string[]).includes(action) : false;
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Systemeinstellungen
        </Typography>

        <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Allgemeine Einstellungen" {...a11yProps(0)} />
            <Tab label="E-Mail-Konfiguration" {...a11yProps(1)} />
            <Tab label="Backup & Wiederherstellung" {...a11yProps(2)} />
            <Tab label="Rollen & Berechtigungen" {...a11yProps(3)} />
          </Tabs>

          {/* Allgemeine Einstellungen */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Systemname"
                  name="siteName"
                  value={generalSettings.siteName}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="System-URL"
                  name="siteUrl"
                  value={generalSettings.siteUrl}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Logo URL"
                  name="logoUrl"
                  value={generalSettings.logoUrl}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                  helperText="URL zum System-Logo für E-Mails und Berichte"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Standardsprache"
                  name="defaultLanguage"
                  value={generalSettings.defaultLanguage}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="de">Deutsch</option>
                  <option value="en">Englisch</option>
                  <option value="fr">Französisch</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Standardwährung"
                  name="defaultCurrency"
                  value={generalSettings.defaultCurrency}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US-Dollar ($)</option>
                  <option value="GBP">Britisches Pfund (£)</option>
                  <option value="CHF">Schweizer Franken (CHF)</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session-Timeout (Minuten)"
                  name="sessionTimeout"
                  type="number"
                  InputProps={{ inputProps: { min: 1, max: 1440 } }}
                  value={generalSettings.sessionTimeout}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Einträge pro Seite"
                  name="itemsPerPage"
                  type="number"
                  InputProps={{ inputProps: { min: 10, max: 100 } }}
                  value={generalSettings.itemsPerPage}
                  onChange={handleGeneralSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Benutzereinstellungen
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generalSettings.enableUserRegistration}
                      onChange={handleGeneralSettingsChange}
                      name="enableUserRegistration"
                      color="primary"
                    />
                  }
                  label="Benutzerregistrierung aktivieren"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generalSettings.requireEmailVerification}
                      onChange={handleGeneralSettingsChange}
                      name="requireEmailVerification"
                      color="primary"
                    />
                  }
                  label="E-Mail-Verifizierung verlangen"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={saveGeneralSettings}
                    disabled={isLoading}
                  >
                    Einstellungen speichern
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* E-Mail-Konfiguration */}
          <TabPanel value={tabValue} index={1}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Die E-Mail-Konfiguration wird für Systembenachrichtigungen, Passwort-Zurücksetzung und andere automatisierte E-Mails verwendet.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP-Server"
                  name="smtpServer"
                  value={emailSettings.smtpServer}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP-Port"
                  name="smtpPort"
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP-Benutzername"
                  name="smtpUsername"
                  value={emailSettings.smtpUsername}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP-Passwort"
                  name="smtpPassword"
                  type={showSmtpPassword ? 'text' : 'password'}
                  value={emailSettings.smtpPassword}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          edge="end"
                        >
                          {showSmtpPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Absender E-Mail"
                  name="senderEmail"
                  value={emailSettings.senderEmail}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Absendername"
                  name="senderName"
                  value={emailSettings.senderName}
                  onChange={handleEmailSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.enableSsl}
                      onChange={handleEmailSettingsChange}
                      name="enableSsl"
                      color="primary"
                    />
                  }
                  label="SSL/TLS aktivieren"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSettings.enableNotifications}
                      onChange={handleEmailSettingsChange}
                      name="enableNotifications"
                      color="primary"
                    />
                  }
                  label="E-Mail-Benachrichtigungen aktivieren"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setSnackbar({
                        open: true,
                        message: 'E-Mail-Test wurde gesendet.',
                        severity: 'success'
                      });
                    }}
                  >
                    Test-E-Mail senden
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={saveEmailSettings}
                    disabled={isLoading}
                  >
                    E-Mail-Einstellungen speichern
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Backup & Wiederherstellung */}
          <TabPanel value={tabValue} index={2}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Regelmäßige Backups sind wichtig, um Datenverlust zu vermeiden. Es wird empfohlen, tägliche automatische Backups zu konfigurieren.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupSettings.autoBackupEnabled}
                      onChange={handleBackupSettingsChange}
                      name="autoBackupEnabled"
                      color="primary"
                    />
                  }
                  label="Automatische Backups aktivieren"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup-Intervall"
                  name="backupInterval"
                  value={backupSettings.backupInterval}
                  onChange={handleBackupSettingsChange}
                  margin="normal"
                  variant="outlined"
                  select
                  SelectProps={{ native: true }}
                  disabled={!backupSettings.autoBackupEnabled}
                >
                  <option value="hourly">Stündlich</option>
                  <option value="daily">Täglich</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="monthly">Monatlich</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup-Zeit"
                  name="backupTime"
                  type="time"
                  value={backupSettings.backupTime}
                  onChange={handleBackupSettingsChange}
                  margin="normal"
                  variant="outlined"
                  disabled={!backupSettings.autoBackupEnabled}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Aufbewahrungsdauer (Tage)"
                  name="backupRetention"
                  type="number"
                  InputProps={{ inputProps: { min: 1 } }}
                  value={backupSettings.backupRetention}
                  onChange={handleBackupSettingsChange}
                  margin="normal"
                  variant="outlined"
                  disabled={!backupSettings.autoBackupEnabled}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup-Speicherort"
                  name="backupLocation"
                  value={backupSettings.backupLocation}
                  onChange={handleBackupSettingsChange}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupSettings.includeAttachments}
                      onChange={handleBackupSettingsChange}
                      name="includeAttachments"
                      color="primary"
                    />
                  }
                  label="Anhänge und Dokumente ins Backup einschließen"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Manuelles Backup
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<BackupIcon />}
                    onClick={createBackupNow}
                    disabled={isLoading}
                  >
                    Backup jetzt erstellen
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<RestoreIcon />}
                    disabled={isLoading}
                  >
                    Backup wiederherstellen
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={saveBackupSettings}
                    disabled={isLoading}
                  >
                    Backup-Einstellungen speichern
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Rollen & Berechtigungen */}
          <TabPanel value={tabValue} index={3}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Hier können Sie die Benutzerrollen und deren Berechtigungen im System verwalten.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Benutzerrollen</Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    size="small"
                  >
                    Neue Rolle erstellen
                  </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Beschreibung</TableCell>
                        <TableCell align="center">Berechtigungen</TableCell>
                        <TableCell align="center">Aktionen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roleSettings.roles.map((role) => (
                        <TableRow
                          key={role.id}
                          onClick={() => handleRoleSelect(role.id)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: roleSettings.selectedRoleId === role.id ? 'action.selected' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={role.name}
                              color={role.name === 'admin' ? 'primary' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{role.description}</TableCell>
                          <TableCell align="center">{role.permissions}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={role.name === 'admin'}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Berechtigungsmatrix für {roleSettings.roles.find(r => r.id === roleSettings.selectedRoleId)?.name}
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Modul</TableCell>
                        <TableCell align="center">Erstellen</TableCell>
                        <TableCell align="center">Lesen</TableCell>
                        <TableCell align="center">Bearbeiten</TableCell>
                        <TableCell align="center">Löschen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {permissionModules.map((module) => (
                        <TableRow key={module.name}>
                          <TableCell component="th" scope="row">
                            <Typography variant="body2" fontWeight="medium">
                              {module.label}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {module.actions.includes('create') ? (
                              <Chip
                                label={hasPermission(module.name, 'create') ? "Ja" : "Nein"}
                                color={hasPermission(module.name, 'create') ? "success" : "default"}
                                size="small"
                                variant={hasPermission(module.name, 'create') ? "filled" : "outlined"}
                              />
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {module.actions.includes('read') ? (
                              <Chip
                                label={hasPermission(module.name, 'read') ? "Ja" : "Nein"}
                                color={hasPermission(module.name, 'read') ? "success" : "default"}
                                size="small"
                                variant={hasPermission(module.name, 'read') ? "filled" : "outlined"}
                              />
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {module.actions.includes('update') ? (
                              <Chip
                                label={hasPermission(module.name, 'update') ? "Ja" : "Nein"}
                                color={hasPermission(module.name, 'update') ? "success" : "default"}
                                size="small"
                                variant={hasPermission(module.name, 'update') ? "filled" : "outlined"}
                              />
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {module.actions.includes('delete') ? (
                              <Chip
                                label={hasPermission(module.name, 'delete') ? "Ja" : "Nein"}
                                color={hasPermission(module.name, 'delete') ? "success" : "default"}
                                size="small"
                                variant={hasPermission(module.name, 'delete') ? "filled" : "outlined"}
                              />
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Die Berechtigungen werden über die Datenbank verwaltet und beeinflussen die Zugriffsebenen im System.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Vererbung und Hierarchie
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Im ATLAS-System ist eine hierarchische Berechtigungsstruktur implementiert:
                  Admin → Manager → Support → User
                </Alert>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Höhere Rollen erben automatisch alle Berechtigungen der untergeordneten Rollen.
                  Die Vererbungshierarchie kann bei Bedarf in der Datenbank angepasst werden.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SecurityIcon />}
                    onClick={saveRoleSettings}
                    disabled={isLoading}
                  >
                    Rolleneinstellungen speichern
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default SystemSettings;
