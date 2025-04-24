import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import UserDetailTabs from './UserDetailTabs';
import UserForm from './UserForm';

// Platzhalterkomponente für nicht implementierte Tabs
const PlaceholderTab: React.FC<{ userId: number, userName: string, title: string }> = ({ userId, userName, title }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">{title} für {userName}</Typography>
    </Box>
    <Box sx={{ p: 3, bgcolor: '#333', border: '1px solid #444', borderRadius: 1 }}>
      <Alert severity="info">
        Diese Funktionalität wird in einem zukünftigen Update implementiert.
      </Alert>
    </Box>
  </Box>
);

// Wrapper-Komponenten für die verschiedenen Tabs
const UserDevicesTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Geräte" />
);

const UserLicensesTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Lizenzen" />
);

const UserCertificatesTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Zertifikate" />
);

const UserAccessoriesTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Zubehör" />
);

const UserInventoryTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Inventar" />
);

const UserDocumentsTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Dokumente" />
);

const UserProtocolsTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Übergabeprotokolle" />
);

const UserSettingsTab: React.FC<{ userId: number, userName: string, isReadOnly?: boolean }> = ({ userId, userName, isReadOnly }) => (
  <PlaceholderTab userId={userId} userName={userName} title="Einstellungen" />
);

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId?: number | null;
  mode?: 'create' | 'edit' | 'view';
  onSave?: (userData: any) => void;
  onDelete?: (userId: number) => void;
  fullWidth?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showAllTabs?: boolean;
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  open,
  onClose,
  userId = null,
  mode = 'view',
  onSave,
  onDelete,
  fullWidth = true,
  maxWidth = 'lg',
  showAllTabs = true
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  useEffect(() => {
    if (open && userId) {
      loadUserData();
    } else if (open && mode === 'create') {
      // Initialisiere mit leeren Daten für neue Benutzer
      setUserData({
        id: null,
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'user',
        active: true,
        receive_emails: true,
        // Weitere Standardwerte hier hinzufügen
      });
    }
  }, [open, userId, mode]);

  const loadUserData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // API-Aufruf zum Laden der Benutzerdaten
      // In einer realen Implementierung durch einen tatsächlichen API-Aufruf ersetzen
      // Mock-Daten für die Demo
      setTimeout(() => {
        const mockUserData = {
          id: userId,
          username: 'benutzer' + userId,
          first_name: 'Test',
          last_name: 'Benutzer',
          email: `benutzer${userId}@example.com`,
          role: 'user',
          active: true,
          receive_emails: true,
        };
        setUserData(mockUserData);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Benutzerdaten',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    setIsLoading(true);
    try {
      // API-Aufruf zum Speichern oder Aktualisieren von Benutzerdaten
      // Simuliere eine erfolgreiche Antwort
      setTimeout(() => {
        const savedData = {
          ...formData,
          id: userId || Date.now() // Falls neuer Benutzer, generiere eine ID
        };
        setUserData(savedData);

        setSnackbar({
          open: true,
          message: `Benutzer erfolgreich ${mode === 'create' ? 'erstellt' : 'aktualisiert'}`,
          severity: 'success'
        });

        if (onSave) {
          onSave(savedData);
        }

        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error(`Fehler beim ${mode === 'create' ? 'Erstellen' : 'Aktualisieren'} des Benutzers:`, error);
      setSnackbar({
        open: true,
        message: `Fehler beim ${mode === 'create' ? 'Erstellen' : 'Aktualisieren'} des Benutzers`,
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;

    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    setIsLoading(true);
    try {
      // API-Aufruf zum Löschen des Benutzers
      // Simuliere eine erfolgreiche Antwort
      setTimeout(() => {
        setSnackbar({
          open: true,
          message: 'Benutzer erfolgreich gelöscht',
          severity: 'success'
        });

        if (onDelete) {
          onDelete(userId);
        }

        onClose();
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen des Benutzers',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTabChange = (tabIndex: number) => {
    setTabValue(tabIndex);
  };

  // Titel des Dialogs basierend auf dem Modus
  const dialogTitle = mode === 'create'
    ? 'Neuen Benutzer erstellen'
    : mode === 'edit'
      ? 'Benutzer bearbeiten'
      : 'Benutzerdetails';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      aria-labelledby="user-detail-dialog-title"
    >
      <DialogTitle id="user-detail-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{dialogTitle}</Typography>
          <IconButton edge="end" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && !userData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          userData && (
            <UserDetailTabs
              initialTab={tabValue}
              onTabChange={handleTabChange}
              userData={userData}
              profileContent={
                <UserForm
                  userData={userData}
                  onSave={handleSave}
                  mode={mode}
                  isLoading={isLoading}
                />
              }
              devicesContent={
                <UserDevicesTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                />
              }
              licensesContent={
                <UserLicensesTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                />
              }
              certificatesContent={
                <UserCertificatesTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                />
              }
              accessoriesContent={showAllTabs ?
                <UserAccessoriesTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                /> : undefined
              }
              inventoryContent={showAllTabs ?
                <UserInventoryTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                /> : undefined
              }
              documentsContent={showAllTabs ?
                <UserDocumentsTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                /> : undefined
              }
              protocolsContent={showAllTabs ?
                <UserProtocolsTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                /> : undefined
              }
              settingsContent={showAllTabs ?
                <UserSettingsTab
                  userId={userData.id}
                  userName={`${userData.first_name} ${userData.last_name}`}
                  isReadOnly={mode === 'view'}
                /> : undefined
              }
            />
          )
        )}
      </DialogContent>

      <DialogActions>
        {mode !== 'view' && (
          <Button
            onClick={() => userData && handleSave(userData)}
            color="primary"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        )}
        {mode === 'edit' && onDelete && (
          <Button
            onClick={handleDelete}
            color="error"
            disabled={isLoading}
          >
            Löschen
          </Button>
        )}
        <Button onClick={onClose} color="inherit" disabled={isLoading}>
          Schließen
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default UserDetailDialog;
