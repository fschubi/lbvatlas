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

// Interface für Zubehör
interface Accessory {
  id: number;
  name: string;
  type: string;
  serial_number?: string;
  status: string;
  location?: string;
  purchase_date?: string;
  created_at: string;
  updated_at: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface UserAccessoriesTabProps {
  userId: number | null;
  userName: string;
  isReadOnly?: boolean;
}

interface AssignAccessoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (accessoryId: number, notes: string) => void;
  availableAccessories: Accessory[];
  isLoading: boolean;
}

// Dialog-Komponente zum Zuweisen von Zubehör
const AssignAccessoryDialog: React.FC<AssignAccessoryDialogProps> = ({
  open,
  onClose,
  onAssign,
  availableAccessories,
  isLoading
}) => {
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedAccessoryId('');
      setNotes('');
    }
  }, [open]);

  const handleAssign = () => {
    if (selectedAccessoryId && typeof selectedAccessoryId === 'number') {
      onAssign(selectedAccessoryId, notes);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Zubehör zuweisen</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="accessory-select-label">Zubehör auswählen</InputLabel>
            <Select
              labelId="accessory-select-label"
              id="accessory-select"
              value={selectedAccessoryId}
              label="Zubehör auswählen"
              onChange={(e) => setSelectedAccessoryId(e.target.value as number)}
              disabled={isLoading || availableAccessories.length === 0}
            >
              {availableAccessories.map((accessory) => (
                <MenuItem key={accessory.id} value={accessory.id}>
                  {accessory.name} - {accessory.type}
                </MenuItem>
              ))}
              {availableAccessories.length === 0 && (
                <MenuItem disabled value="">Kein Zubehör verfügbar</MenuItem>
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
          disabled={isLoading || !selectedAccessoryId}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Zuweisen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const UserAccessoriesTab: React.FC<UserAccessoriesTabProps> = ({
  userId,
  userName,
  isReadOnly = false
}) => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Spalten für die Zubehörtabelle definieren
  const columns: AtlasColumn<Accessory>[] = [
    { label: 'Name', dataKey: 'name', width: 150 },
    { label: 'Typ', dataKey: 'type', width: 150 },
    { label: 'Seriennummer', dataKey: 'serial_number', width: 150 },
    { label: 'Status', dataKey: 'status', width: 100 },
    { label: 'Standort', dataKey: 'location', width: 150 },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 160,
      render: (_: any, row: Accessory) => (
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
            <Tooltip title="Zubehör entfernen">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveAccessory(row.id)}
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

  // Benutzerzubehör laden
  useEffect(() => {
    const fetchUserAccessories = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        // In einer realen Anwendung würde hier ein API-Aufruf stehen
        // Hier verwenden wir Beispieldaten
        const mockAccessories: Accessory[] = [
          {
            id: 1,
            name: 'USB-C Hub',
            type: 'Adapter',
            serial_number: 'AC12345678',
            status: 'Aktiv',
            location: 'Hauptsitz',
            purchase_date: '2023-01-15',
            created_at: '2023-01-15T10:00:00Z',
            updated_at: '2023-01-15T10:00:00Z'
          },
          {
            id: 2,
            name: 'Headset',
            type: 'Audio',
            serial_number: 'HS87654321',
            status: 'Aktiv',
            location: 'Hauptsitz',
            purchase_date: '2023-02-20',
            created_at: '2023-02-20T14:30:00Z',
            updated_at: '2023-02-20T14:30:00Z'
          }
        ];

        // Kurze Verzögerung für Demonstrationszwecke
        setTimeout(() => {
          setAccessories(mockAccessories);
          setLoading(false);
        }, 1000);
      } catch (err) {
        setError('Fehler beim Laden des Zubehörs.');
        setLoading(false);
      }
    };

    fetchUserAccessories();
  }, [userId]);

  const handleAssignAccessory = () => {
    // Implementierung der Zubehörzuweisung (später)
    console.log('Zubehör zuweisen an Benutzer ID:', userId);
  };

  // Funktion zum Erstellen eines Übergabeprotokolls
  const handleCreateProtocol = (accessoryId: number) => {
    // Implementierung der Protokollerstellung
    setSnackbar({
      open: true,
      message: 'Übergabeprotokoll erstellen: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  // Funktion zum Senden eines Übergabeprotokolls per E-Mail
  const handleSendProtocol = (accessoryId: number) => {
    // Implementierung des E-Mail-Versands
    setSnackbar({
      open: true,
      message: 'Übergabeprotokoll per E-Mail senden: Diese Funktion wird noch implementiert',
      severity: 'info'
    });
  };

  const handleRemoveAccessory = async (accessoryId: number) => {
    if (!userId) return;

    if (!window.confirm('Möchten Sie die Zuweisung dieses Zubehörs wirklich aufheben?')) {
      return;
    }

    setLoading(true);
    try {
      // Hier würde normalerweise ein API-Aufruf stehen
      // Für diese Demo simulieren wir eine erfolgreiche Entfernung
      setTimeout(() => {
        // Zubehör aus zugewiesenem Zubehör finden
        const accessoryToRemove = accessories.find(accessory => accessory.id === accessoryId);

        if (accessoryToRemove) {
          // Zubehör aus zugewiesenem Zubehör entfernen
          setAccessories(prev => prev.filter(accessory => accessory.id !== accessoryId));

          setSnackbar({
            open: true,
            message: `Zubehör ${accessoryToRemove.name} erfolgreich entfernt`,
            severity: 'success'
          });
        }

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Fehler beim Entfernen des Zubehörs:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Entfernen des Zubehörs',
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
          Zugewiesenes Zubehör für {userName}
        </Typography>

        {!isReadOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAssignDialogOpen(true)}
            disabled={loading}
          >
            Zubehör zuweisen
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ width: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : accessories.length > 0 ? (
          <AtlasTable<Accessory>
            columns={columns}
            rows={accessories}
            loading={loading}
            emptyMessage="Kein Zubehör zugewiesen."
            height={400}
            stickyHeader
          />
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Kein Zubehör zugewiesen.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Dialog zum Zuweisen von Zubehör */}
      <AssignAccessoryDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        onAssign={handleAssignAccessory}
        availableAccessories={accessories}
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

export default UserAccessoriesTab;
