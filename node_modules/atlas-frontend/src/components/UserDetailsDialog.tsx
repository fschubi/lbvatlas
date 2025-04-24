import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Devices as DevicesIcon,
  VpnKey as VpnKeyIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { usersApi, ApiResponse } from '../utils/api';
import { User } from '../types/user';
import { Device } from '../types/device';
import { License } from '../types/license';
import { Accessory } from '../types/accessory';
import handleApiError from '../utils/errorHandler';
import AtlasTable, { AtlasColumn } from './AtlasTable';

interface UserDetailDialogProps {
  userId: number | null;
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-details-tabpanel-${index}`}
      aria-labelledby={`user-details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  userId,
  open,
  onClose,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State für die Einstellungen
  const [isLoginActive, setIsLoginActive] = useState<boolean>(true);
  const [canReceiveEmails, setCanReceiveEmails] = useState<boolean>(true);
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // States für Asset-Daten
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState<boolean>(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState<boolean>(false);
  const [accessoriesError, setAccessoriesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndAssets = async () => {
      if (!userId || !open) {
        setUser(null);
        setError(null);
        setSettingsError(null);
        setDevices([]);
        setDevicesLoading(false);
        setDevicesError(null);
        setLicenses([]);
        setLicensesLoading(false);
        setLicensesError(null);
        setAccessories([]);
        setAccessoriesLoading(false);
        setAccessoriesError(null);
        return;
      }
      setLoading(true);
      setError(null);
      setSettingsError(null);
      setDevices([]);
      setDevicesLoading(true);
      setDevicesError(null);
      setLicenses([]);
      setLicensesLoading(true);
      setLicensesError(null);
      setAccessories([]);
      setAccessoriesLoading(true);
      setAccessoriesError(null);

      try {
        // User-Daten zuerst abrufen
        const userResponse = await usersApi.getById(userId);
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
          setIsLoginActive(userResponse.data.active ?? true);
          setCanReceiveEmails(userResponse.data.can_receive_emails ?? true);
        } else {
          throw new Error(userResponse.message || 'Benutzer nicht gefunden.');
        }

        // Assets parallel abrufen
        const [devicesResponse, licensesResponse, accessoriesResponse] = await Promise.all([
          usersApi.getUserDevices(userId),
          usersApi.getUserLicenses(userId),
          usersApi.getUserAccessories(userId)
        ]);

        // Geräte verarbeiten
        if (devicesResponse.success && Array.isArray(devicesResponse.data)) {
          setDevices(devicesResponse.data);
        } else {
          setDevicesError(devicesResponse.message || 'Fehler beim Laden der Geräte.');
        }
        setDevicesLoading(false);

        // Lizenzen verarbeiten
        if (licensesResponse.success && Array.isArray(licensesResponse.data)) {
          setLicenses(licensesResponse.data);
        } else {
          setLicensesError(licensesResponse.message || 'Fehler beim Laden der Lizenzen.');
        }
        setLicensesLoading(false);

        // Zubehör verarbeiten
        if (accessoriesResponse.success && Array.isArray(accessoriesResponse.data)) {
          setAccessories(accessoriesResponse.data);
        } else {
          setAccessoriesError(accessoriesResponse.message || 'Fehler beim Laden des Zubehörs.');
        }
        setAccessoriesLoading(false);

      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(`Fehler beim Laden der Benutzerdaten: ${errorMessage}`);
        setUser(null);
        setDevicesError(errorMessage);
        setDevicesLoading(false);
        setLicensesError(errorMessage);
        setLicensesLoading(false);
        setAccessoriesError(errorMessage);
        setAccessoriesLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndAssets();
  }, [userId, open]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  type UserSetting = 'active' | 'can_receive_emails';

  const handleSettingChange = async (settingName: UserSetting, value: boolean) => {
    if (!userId || !user) return;

    setSettingsLoading(true);
    setSettingsError(null);

    const previousValues = { active: isLoginActive, can_receive_emails: canReceiveEmails };
    if (settingName === 'active') setIsLoginActive(value);
    if (settingName === 'can_receive_emails') setCanReceiveEmails(value);

    try {
      const updateData: Partial<User> = { [settingName]: value };
      const response = await usersApi.update(userId, updateData);

      if (!response.success || !response.data) {
        throw new Error(response.message || `Fehler beim Speichern der Einstellung ${settingName}.`);
      }

      setUser(prev => prev ? { ...prev, ...response.data } : null);

      setIsLoginActive(response.data.active ?? true);
      setCanReceiveEmails(response.data.can_receive_emails ?? true);

    } catch (err) {
      if (settingName === 'active') setIsLoginActive(previousValues.active);
      if (settingName === 'can_receive_emails') setCanReceiveEmails(previousValues.can_receive_emails);

      const errorMessage = handleApiError(err);
      setSettingsError(`Fehler: ${errorMessage}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  const renderField = (label: string, value: string | number | undefined | null) => (
    <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: -0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1">
        {value ?? '-'}
      </Typography>
    </Grid>
  );

  const deviceColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Seriennummer', dataKey: 'serialNumber' }];
  const licenseColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Key', dataKey: 'key_code' }];
  const accessoryColumns: AtlasColumn[] = [{ label: 'Name', dataKey: 'name' }, { label: 'Typ', dataKey: 'type' }];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
        Benutzerdetails: {loading ? 'Lade...' : user ? `${user.first_name} ${user.last_name}` : 'Nicht gefunden'}
        {user && (
          <Chip
            label={user.active ? 'Aktiv' : 'Inaktiv'}
            color={user.active ? 'success' : 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="Benutzerdetails Tabs" variant="scrollable">
            <Tab icon={<PersonIcon />} iconPosition="start" label="Übersicht" id="user-details-tab-0" aria-controls="user-details-tabpanel-0" />
            <Tab icon={<GroupIcon />} iconPosition="start" label="Gruppen" id="user-details-tab-1" aria-controls="user-details-tabpanel-1" />
            <Tab icon={<SettingsIcon />} iconPosition="start" label="Einstellungen" id="user-details-tab-2" aria-controls="user-details-tabpanel-2" />
            <Tab icon={<DevicesIcon />} iconPosition="start" label="Geräte" id="user-details-tab-3" aria-controls="user-details-tabpanel-3" />
            <Tab icon={<VpnKeyIcon />} iconPosition="start" label="Lizenzen" id="user-details-tab-4" aria-controls="user-details-tabpanel-4" />
            <Tab icon={<ExtensionIcon />} iconPosition="start" label="Zubehör" id="user-details-tab-5" aria-controls="user-details-tabpanel-5" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 5 }} />}
          {!loading && user && (
            <Grid container spacing={1} sx={{ px: 1, py: 2 }}>
              {renderField('Benutzername', user.username)}
              {renderField('E-Mail', user.email)}
              {renderField('Vorname', user.first_name)}
              {renderField('Nachname', user.last_name)}
              {renderField('Anzeigename', user.display_name ?? `${user.first_name || ''} ${user.last_name || ''}`.trim())}
              {renderField('Rolle', user.role)}
              {renderField('Abteilung', user.department?.name)}
              {renderField('Standort', user.location?.name)}
              {renderField('Raum', user.room?.name)}
              {renderField('Telefon', user.phone)}
              {renderField('Status', user.active ? 'Aktiv' : 'Inaktiv')}
              {renderField('Letzter Login', user.last_login ? new Date(user.last_login).toLocaleString('de-DE') : 'Nie')}
              {renderField('Erstellt am', user.created_at ? new Date(user.created_at).toLocaleString('de-DE') : '-')}
              {renderField('Aktualisiert am', user.updated_at ? new Date(user.updated_at).toLocaleString('de-DE') : '-')}
            </Grid>
          )}
          {!loading && !user && !error && (
            <Typography sx={{ p: 3, textAlign: 'center' }}>Keine Benutzerdaten zum Anzeigen.</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography>Gruppenverwaltung (Platzhalter - benötigt API)</Typography>
          <AtlasTable columns={[{ label: 'Gruppenname', dataKey: 'name' }]} rows={[]} loading={false} emptyMessage="Benutzer ist in keinen Gruppen." height={300} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Kontoeinstellungen</Typography>
          {settingsError && (
            <Alert severity="error" sx={{ mb: 2 }}>{settingsError}</Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
            {settingsLoading && (
              <CircularProgress size={24} sx={{ position: 'absolute', top: 8, right: 8 }} />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={isLoginActive}
                  onChange={(e) => handleSettingChange('active', e.target.checked)}
                  name="loginActive"
                  color="success"
                  disabled={settingsLoading}
                />
              }
              label="Login aktiviert"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={canReceiveEmails}
                  onChange={(e) => handleSettingChange('can_receive_emails', e.target.checked)}
                  name="emailActive"
                  color="primary"
                  disabled={settingsLoading}
                />
              }
              label="E-Mail-Benachrichtigungen aktiviert"
            />
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Hinweis: Änderungen werden direkt gespeichert.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Zugeordnete Geräte</Typography>
          <AtlasTable columns={deviceColumns} rows={[]} loading={false} emptyMessage="Keine Geräte zugeordnet." height={300} />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>Zugeordnete Lizenzen</Typography>
          <AtlasTable columns={licenseColumns} rows={[]} loading={false} emptyMessage="Keine Lizenzen zugeordnet." height={300} />
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>Zugeordnetes Zubehör</Typography>
          <AtlasTable columns={accessoryColumns} rows={[]} loading={false} emptyMessage="Kein Zubehör zugeordnet." height={300} />
        </TabPanel>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog;
