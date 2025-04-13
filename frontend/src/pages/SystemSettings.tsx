import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  Storage as StorageIcon,
  LockOutlined as LockIcon,
  Label as LabelIcon,
  CloudSync as CloudSyncIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import AtlasAppBar from '../components/AtlasAppBar';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper-Funktion für Axios-Anfragen mit Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');

  if (!token || token.trim() === '') {
    console.error('Kein Token vorhanden oder Token leer');
    return {};
  }

  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface SystemSettings {
  app_name: string;
  company_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;

  // E-Mail-Einstellungen
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  email_from: string;

  // Sicherheitseinstellungen
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_expiry_days: number;
  require_2fa: boolean;

  // Dateispeicher-Einstellungen
  storage_provider: 'local' | 's3';
  storage_path: string;
  s3_bucket: string;
  s3_region: string;
  s3_access_key: string;
  s3_secret_key: string;

  // Label-Einstellungen
  label_prefix: string;
  next_asset_number: number;
  asset_number_padding: number;
  asset_qr_size: number;

  // Systemeinstellungen
  enable_audit_log: boolean;
  backup_enabled: boolean;
  backup_frequency_days: number;
  backup_retention_days: number;
  maintenance_mode: boolean;
}

const defaultSettings: SystemSettings = {
  app_name: 'ATLAS',
  company_name: 'Unternehmen',
  logo_url: '',
  primary_color: '#1976d2',
  secondary_color: '#dc004e',

  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  email_from: '',

  session_timeout_minutes: 30,
  max_login_attempts: 5,
  password_expiry_days: 90,
  require_2fa: false,

  storage_provider: 'local',
  storage_path: '/uploads',
  s3_bucket: '',
  s3_region: '',
  s3_access_key: '',
  s3_secret_key: '',

  label_prefix: 'ATLAS',
  next_asset_number: 1000,
  asset_number_padding: 5,
  asset_qr_size: 150,

  enable_audit_log: true,
  backup_enabled: true,
  backup_frequency_days: 1,
  backup_retention_days: 30,
  maintenance_mode: false
};

const SystemSettings: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const [expandedPanel, setExpandedPanel] = useState<string | false>('general');

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Einstellungen aus der API laden
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/settings`, getAuthConfig());

      if (response.data && response.data.success) {
        setSettings({
          ...defaultSettings,
          ...response.data.data
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Systemeinstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Systemeinstellungen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Einstellungen speichern
  const saveSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/admin/settings`,
        settings,
        getAuthConfig()
      );

      if (response.data && response.data.success) {
        setSnackbar({
          open: true,
          message: 'Systemeinstellungen erfolgreich gespeichert',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Systemeinstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Systemeinstellungen',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Accordion Panel wechseln
  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Textfeld-Änderung verarbeiten
  const handleTextChange = (key: keyof SystemSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [key]: event.target.value
    });
  };

  // Numerisches Feld-Änderung verarbeiten
  const handleNumberChange = (key: keyof SystemSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [key]: parseInt(event.target.value, 10) || 0
    });
  };

  // Boolean-Feld-Änderung verarbeiten
  const handleBooleanChange = (key: keyof SystemSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [key]: event.target.checked
    });
  };

  // Select-Feld-Änderung verarbeiten
  const handleSelectChange = (key: keyof SystemSettings) => (event: React.ChangeEvent<{ value: unknown }>) => {
    setSettings({
      ...settings,
      [key]: event.target.value
    });
  };

  // Beim ersten Laden Einstellungen abrufen
  useEffect(() => {
    fetchSettings();
  }, []);

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AtlasAppBar onMenuClick={() => {}} />

      <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Systemeinstellungen
          </Typography>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={loading}
          >
            Einstellungen speichern
          </Button>
        </Box>

        {/* Allgemeine Einstellungen */}
        <Accordion
          expanded={expandedPanel === 'general'}
          onChange={handleAccordionChange('general')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="general-settings-content"
            id="general-settings-header"
          >
            <SettingsIcon sx={{ mr: 2 }} />
            <Typography variant="h6">Allgemeine Einstellungen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Anwendungsname"
                  value={settings.app_name}
                  onChange={handleTextChange('app_name')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Unternehmensname"
                  value={settings.company_name}
                  onChange={handleTextChange('company_name')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Logo URL"
                  value={settings.logo_url}
                  onChange={handleTextChange('logo_url')}
                  margin="normal"
                  helperText="URL zum Firmenlogo (für Header)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Primärfarbe"
                  value={settings.primary_color}
                  onChange={handleTextChange('primary_color')}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: settings.primary_color,
                            borderRadius: '4px'
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sekundärfarbe"
                  value={settings.secondary_color}
                  onChange={handleTextChange('secondary_color')}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: settings.secondary_color,
                            borderRadius: '4px'
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* E-Mail-Einstellungen */}
        <Accordion
          expanded={expandedPanel === 'email'}
          onChange={handleAccordionChange('email')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="email-settings-content"
            id="email-settings-header"
          >
            <EmailIcon sx={{ mr: 2 }} />
            <Typography variant="h6">E-Mail-Einstellungen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="SMTP Host"
                  value={settings.smtp_host}
                  onChange={handleTextChange('smtp_host')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="SMTP Port"
                  type="number"
                  value={settings.smtp_port}
                  onChange={handleNumberChange('smtp_port')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Benutzername"
                  value={settings.smtp_user}
                  onChange={handleTextChange('smtp_user')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Passwort"
                  type="password"
                  value={settings.smtp_password}
                  onChange={handleTextChange('smtp_password')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-Mail Absender"
                  value={settings.email_from}
                  onChange={handleTextChange('email_from')}
                  margin="normal"
                  helperText="Absender für alle System-E-Mails (z.B. 'ATLAS <noreply@example.com>')"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sicherheitseinstellungen */}
        <Accordion
          expanded={expandedPanel === 'security'}
          onChange={handleAccordionChange('security')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="security-settings-content"
            id="security-settings-header"
          >
            <LockIcon sx={{ mr: 2 }} />
            <Typography variant="h6">Sicherheitseinstellungen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sitzungs-Timeout (Minuten)"
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={handleNumberChange('session_timeout_minutes')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max. Login-Versuche"
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={handleNumberChange('max_login_attempts')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Passwort-Ablauf (Tage)"
                  type="number"
                  value={settings.password_expiry_days}
                  onChange={handleNumberChange('password_expiry_days')}
                  margin="normal"
                  helperText="0 = Passwörter laufen nie ab"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.require_2fa}
                      onChange={handleBooleanChange('require_2fa')}
                      color="primary"
                    />
                  }
                  label="Zwei-Faktor-Authentifizierung erzwingen"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Dateispeicher-Einstellungen */}
        <Accordion
          expanded={expandedPanel === 'storage'}
          onChange={handleAccordionChange('storage')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="storage-settings-content"
            id="storage-settings-header"
          >
            <StorageIcon sx={{ mr: 2 }} />
            <Typography variant="h6">Dateispeicher-Einstellungen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="storage-provider-label">Speicheranbieter</InputLabel>
                  <Select
                    labelId="storage-provider-label"
                    value={settings.storage_provider}
                    onChange={(handleSelectChange('storage_provider') as any)}
                    label="Speicheranbieter"
                  >
                    <MenuItem value="local">Lokaler Speicher</MenuItem>
                    <MenuItem value="s3">Amazon S3</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {settings.storage_provider === 'local' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Lokaler Speicherpfad"
                    value={settings.storage_path}
                    onChange={handleTextChange('storage_path')}
                    margin="normal"
                  />
                </Grid>
              )}

              {settings.storage_provider === 's3' && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="S3 Bucket Name"
                      value={settings.s3_bucket}
                      onChange={handleTextChange('s3_bucket')}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="S3 Region"
                      value={settings.s3_region}
                      onChange={handleTextChange('s3_region')}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="S3 Access Key"
                      value={settings.s3_access_key}
                      onChange={handleTextChange('s3_access_key')}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="S3 Secret Key"
                      type="password"
                      value={settings.s3_secret_key}
                      onChange={handleTextChange('s3_secret_key')}
                      margin="normal"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Label-Einstellungen */}
        <Accordion
          expanded={expandedPanel === 'labels'}
          onChange={handleAccordionChange('labels')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="labels-settings-content"
            id="labels-settings-header"
          >
            <LabelIcon sx={{ mr: 2 }} />
            <Typography variant="h6">Label-Einstellungen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Asset-Tag Präfix"
                  value={settings.label_prefix}
                  onChange={handleTextChange('label_prefix')}
                  margin="normal"
                  helperText="Präfix für Asset-Tags, z.B. 'ATLAS'"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nächste Asset-Nummer"
                  type="number"
                  value={settings.next_asset_number}
                  onChange={handleNumberChange('next_asset_number')}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Asset-Nummer Padding"
                  type="number"
                  value={settings.asset_number_padding}
                  onChange={handleNumberChange('asset_number_padding')}
                  margin="normal"
                  helperText="Anzahl der Stellen für Asset-Tags, z.B. 5 für 'ATLAS-00001'"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="QR-Code Größe (px)"
                  type="number"
                  value={settings.asset_qr_size}
                  onChange={handleNumberChange('asset_qr_size')}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Systemwartung */}
        <Accordion
          expanded={expandedPanel === 'maintenance'}
          onChange={handleAccordionChange('maintenance')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="maintenance-settings-content"
            id="maintenance-settings-header"
          >
            <CloudSyncIcon sx={{ mr: 2 }} />
            <Typography variant="h6">Systemwartung</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enable_audit_log}
                      onChange={handleBooleanChange('enable_audit_log')}
                      color="primary"
                    />
                  }
                  label="Audit-Log aktivieren"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.backup_enabled}
                      onChange={handleBooleanChange('backup_enabled')}
                      color="primary"
                    />
                  }
                  label="Automatisches Backup aktivieren"
                />
              </Grid>

              {settings.backup_enabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Backup-Frequenz (Tage)"
                      type="number"
                      value={settings.backup_frequency_days}
                      onChange={handleNumberChange('backup_frequency_days')}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Backup-Aufbewahrung (Tage)"
                      type="number"
                      value={settings.backup_retention_days}
                      onChange={handleNumberChange('backup_retention_days')}
                      margin="normal"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenance_mode}
                      onChange={handleBooleanChange('maintenance_mode')}
                      color="warning"
                    />
                  }
                  label="Wartungsmodus aktivieren (System wird für alle Benutzer außer Administratoren gesperrt)"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
