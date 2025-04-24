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

// Interface für Geräte
interface Device {
  id: number;
  inventory_number: string;
  serial_number: string;
  status: string;
  purchase_date: string;
  category_name: string;
  model_name: string;
  manufacturer_name: string;
  base_pc_number?: string;
  created_at: string;
  updated_at: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UserDevicesTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

interface AssignDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (deviceId: number, notes: string) => void;
  availableDevices: Device[];
  isLoading: boolean;
}

// Dialog-Komponente zum Zuweisen von Geräten
const AssignDeviceDialog: React.FC<AssignDeviceDialogProps> = ({
  open,
  onClose,
  onAssign,
  availableDevices,
  isLoading
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedDeviceId('');
      setNotes('');
    }
  }, [open]);

  const handleAssign = () => {
    if (selectedDeviceId && typeof selectedDeviceId === 'number') {
      onAssign(selectedDeviceId, notes);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerät zuweisen</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="device-select-label">Gerät auswählen</InputLabel>
            <Select
              labelId="device-select-label"
              id="device-select"
              value={selectedDeviceId}
              label="Gerät auswählen"
              onChange={(e) => setSelectedDeviceId(e.target.value as number)}
              disabled={isLoading || availableDevices.length === 0}
            >
              {availableDevices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.inventory_number} - {device.model_name || device.base_pc_number || 'Unbekanntes Modell'}
                </MenuItem>
              ))}
              {availableDevices.length === 0 && (
                <MenuItem disabled value="">Keine Geräte verfügbar</MenuItem>
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
          disabled={isLoading || !selectedDeviceId}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Zuweisen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserDevicesTab: React.FC<UserDevicesTabProps> = ({
  userId,
  userName,
  isReadOnly = false
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Spalten für die Gerätetabelle definieren
  const columns: AtlasColumn<Device>[] = [
    { label: 'Inventar-Nr.', dataKey: 'inventory_number', width: 150 },
    { label: 'Seriennummer', dataKey: 'serial_number', width: 150 },
    { label: 'Kategorie', dataKey: 'category_name', width: 150 },
    { label: 'Modell', dataKey: 'model_name', width: 200 },
    { label: 'Hersteller', dataKey: 'manufacturer_name', width: 150 },
    { label: 'Status', dataKey: 'status', width: 100 },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 160,
      render: (_: any, row: Device) => (
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Übergabeprotokoll drucken">
            <IconButton
              size="small"
              onClick={() => handleCreateProtocol(row.id)}
              disabled={loading}
            >
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Übergabeprotokoll per E-Mail senden">
            <IconButton
              size="small"
              onClick={() => handleSendProtocol(row.id)}
              disabled={loading}
            >
              <EmailIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {!isReadOnly && (
            <Tooltip title="Gerät entfernen">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveDevice(row.id)}
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

  // Benutzergeräte laden
  useEffect(() => {
    const fetchUserDevices = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        // In einer realen Anwendung würde hier ein API-Aufruf stehen
        // Hier verwenden wir Beispieldaten
        const mockDevices: Device[] = [
          {
            id: 1,
            inventory_number: 'NB-001',
            serial_number: 'TPX12345678',
            status: 'Aktiv',
            purchase_date: '2023-01-01',
            category_name: 'Notebook',
            model_name: 'ThinkPad X1',
            manufacturer_name: 'Lenovo',
            created_at: '2023-01-01',
            updated_at: '2023-01-01'
          },
          {
            id: 2,
            inventory_number: 'MOB-042',
            serial_number: 'IMEI87654321',
            status: 'Aktiv',
            purchase_date: '2023-03-15',
            category_name: 'Smartphone',
            model_name: 'iPhone 13',
            manufacturer_name: 'Apple',
            created_at: '2023-03-15',
            updated_at: '2023-03-15'
          }
        ];

        // Kurze Verzögerung für Demonstrationszwecke
        setTimeout(() => {
          setDevices(mockDevices);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Fehler beim Laden der Geräte.');
        setLoading(false);
      }
    };

    fetchUserDevices();
  }, [userId]);

  const handleAssignDevice = (deviceId: number, notes: string) => {
    // Implementierung der Gerätezuweisung (später)
    console.log('Gerät zuweisen an Benutzer ID:', userId, 'Gerät ID:', deviceId, 'Notizen:', notes);
  };

  // Funktion zum Erstellen eines Übergabeprotokolls
  const handleCreateProtocol = (deviceId: number) => {
    // Implementierung der Protokollerstellung
    setSnackbar({
      open: true,
      message: 'Übergabeprotokoll erstellen: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  // Funktion zum Senden eines Übergabeprotokolls per E-Mail
  const handleSendProtocol = (deviceId: number) => {
    // Implementierung des E-Mail-Versands
    setSnackbar({
      open: true,
      message: 'Übergabeprotokoll per E-Mail senden: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  const handleRemoveDevice = async (deviceId: number) => {
    if (!userId) return;

    if (!window.confirm('Möchten Sie die Zuweisung dieses Geräts wirklich aufheben?')) {
      return;
    }

    setLoading(true);
    try {
      // Hier würde normalerweise ein API-Aufruf stehen
      // Für diese Demo simulieren wir eine erfolgreiche Entfernung
      setTimeout(() => {
        // Gerät aus zugewiesenen Geräten finden
        const deviceToRemove = devices.find(device => device.id === deviceId);

        if (deviceToRemove) {
          // Gerät aus zugewiesenen Geräten entfernen
          setDevices(prev => prev.filter(device => device.id !== deviceId));

          setSnackbar({
            open: true,
            message: `Gerät ${deviceToRemove.inventory_number} erfolgreich entfernt`,
            severity: 'success'
          });
        }

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Fehler beim Entfernen des Geräts:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Entfernen des Geräts',
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
          Zugewiesene Geräte für {userName}
        </Typography>

        {!isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={loading}
          >
            Gerät zuweisen
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : devices.length > 0 ? (
          <AtlasTable<Device>
            columns={columns}
            rows={devices}
            loading={loading}
            emptyMessage="Keine Geräte zugewiesen."
            height={400}
            stickyHeader
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Keine Geräte zugewiesen.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog zum Zuweisen eines Geräts */}
      <AssignDeviceDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onAssign={handleAssignDevice}
        availableDevices={devices}
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

export default UserDevicesTab;
