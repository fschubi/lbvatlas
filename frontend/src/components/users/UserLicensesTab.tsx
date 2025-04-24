import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../AtlasTable';
import { License } from '../../types/license';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UserLicensesTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

interface AssignLicenseDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (licenseId: number, notes: string) => void;
  availableLicenses: License[];
  isLoading: boolean;
}

// Dialog-Komponente zum Zuweisen von Lizenzen
const AssignLicenseDialog: React.FC<AssignLicenseDialogProps> = ({
  open,
  onClose,
  onAssign,
  availableLicenses,
  isLoading
}) => {
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedLicenseId('');
      setNotes('');
    }
  }, [open]);

  const handleAssign = () => {
    if (selectedLicenseId && typeof selectedLicenseId === 'number') {
      onAssign(selectedLicenseId, notes);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Lizenz zuweisen</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="license-select-label">Lizenz auswählen</InputLabel>
            <Select
              labelId="license-select-label"
              id="license-select"
              value={selectedLicenseId}
              label="Lizenz auswählen"
              onChange={(e) => setSelectedLicenseId(e.target.value as number)}
              disabled={isLoading || availableLicenses.length === 0}
            >
              {availableLicenses.map((license) => (
                <MenuItem key={license.id} value={license.id}>
                  {license.name} - {license.type || 'Unbekannter Typ'}
                </MenuItem>
              ))}
              {availableLicenses.length === 0 && (
                <MenuItem disabled value="">Keine Lizenzen verfügbar</MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField
            label="Notizen/Informationen zur Zuweisung"
            multiline
            rows={3}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Abbrechen
        </Button>
        <Button
          onClick={handleAssign}
          color="primary"
          variant="contained"
          disabled={isLoading || !selectedLicenseId}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Zuweisen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserLicensesTab: React.FC<UserLicensesTabProps> = ({
  userId,
  userName,
  isReadOnly = false
}) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Spalten für die Lizententabelle definieren
  const columns: AtlasColumn<License>[] = [
    { label: 'Name', dataKey: 'name', width: 150 },
    { label: 'Typ', dataKey: 'type', width: 150 },
    { label: 'Key/Code', dataKey: 'key_code', width: 200 },
    { label: 'Gültig bis', dataKey: 'expiry_date', width: 150 },
    { label: 'Status', dataKey: 'status', width: 100 },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 160,
      render: (_: any, row: License) => (
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Lizenzdetails anzeigen">
            <IconButton
              size="small"
              onClick={() => handleViewLicense(row.id)}
              disabled={loading}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Lizenzdaten per E-Mail senden">
            <IconButton
              size="small"
              onClick={() => handleSendLicenseDetails(row.id)}
              disabled={loading}
            >
              <EmailIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {!isReadOnly && (
            <Tooltip title="Lizenz entfernen">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveLicense(row.id)}
                disabled={loading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )
    }
  ];

  // Benutzerlizenzen laden
  useEffect(() => {
    const fetchUserLicenses = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        // In einer realen Anwendung würde hier ein API-Aufruf stehen
        // Hier verwenden wir Beispieldaten
        const mockLicenses: License[] = [
          {
            id: 1,
            name: 'Microsoft 365',
            type: 'Software',
            key_code: 'XXXX-XXXX-XXXX-XXXX',
            status: 'Aktiv',
            expiry_date: '2024-12-31',
            created_at: '2023-01-01',
            updated_at: '2023-01-01'
          },
          {
            id: 2,
            name: 'Adobe Creative Cloud',
            type: 'Software',
            key_code: 'AAAA-BBBB-CCCC-DDDD',
            status: 'Aktiv',
            expiry_date: '2024-06-30',
            created_at: '2023-02-15',
            updated_at: '2023-02-15'
          }
        ];

        // Kurze Verzögerung für Demonstrationszwecke
        setTimeout(() => {
          setLicenses(mockLicenses);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Fehler beim Laden der Lizenzen.');
        setLoading(false);
      }
    };

    fetchUserLicenses();
  }, [userId]);

  const handleAssignLicense = () => {
    // Implementierung der Lizenzzuweisung (später)
    console.log('Lizenz zuweisen an Benutzer ID:', userId);
  };

  // Funktion zum Anzeigen von Lizenzdetails
  const handleViewLicense = (licenseId: number) => {
    // Implementierung der Lizenzdetails
    setSnackbar({
      open: true,
      message: 'Lizenzdetails anzeigen: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  // Funktion zum Senden von Lizenzdetails per E-Mail
  const handleSendLicenseDetails = (licenseId: number) => {
    // Implementierung des E-Mail-Versands
    setSnackbar({
      open: true,
      message: 'Lizenzdetails per E-Mail senden: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  const handleRemoveLicense = async (licenseId: number) => {
    if (!userId) return;

    if (!window.confirm('Möchten Sie die Zuweisung dieser Lizenz wirklich aufheben?')) {
      return;
    }

    setLoading(true);
    try {
      // Hier würde normalerweise ein API-Aufruf stehen
      // Für diese Demo simulieren wir eine erfolgreiche Entfernung
      setTimeout(() => {
        // Lizenz aus zugewiesenen Lizenzen finden
        const licenseToRemove = licenses.find(license => license.id === licenseId);

        if (licenseToRemove) {
          // Lizenz aus zugewiesenen Lizenzen entfernen
          setLicenses(prev => prev.filter(license => license.id !== licenseId));

          setSnackbar({
            open: true,
            message: `Lizenz ${licenseToRemove.name} erfolgreich entfernt`,
            severity: 'success'
          });
        }

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Fehler beim Entfernen der Lizenz:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Entfernen der Lizenz',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Zugewiesene Lizenzen für {userName}
        </Typography>

        {!isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={loading}
          >
            Lizenz zuweisen
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : licenses.length > 0 ? (
          <AtlasTable<License>
            columns={columns}
            rows={licenses}
            loading={loading}
            emptyMessage="Keine Lizenzen zugewiesen."
            height={400}
            stickyHeader
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Keine Lizenzen zugewiesen.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog zum Zuweisen einer Lizenz */}
      <AssignLicenseDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onAssign={handleAssignLicense}
        availableLicenses={licenses}
        isLoading={loading}
      />

      {/* Snackbar für Benachrichtigungen */}
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
    </Box>
  );
};

export default UserLicensesTab;
