import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SettingsEthernet as PortIcon, // Passendes Icon
} from '@mui/icons-material';
import { networkPortsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { NetworkPort, NetworkPortCreate, NetworkPortUpdate } from '../../types/network';
import { useAuth } from '../../context/AuthContext';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';

// Einfache FormField-Struktur für die Portnummer
interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

// Type für Sortierkonfiguration
interface SortConfig {
    column: keyof NetworkPort | null;
    direction: 'asc' | 'desc';
}

const NetworkPorts: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [ports, setPorts] = useState<NetworkPort[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentPort, setCurrentPort] = useState<NetworkPort | null>(null);
  const [portNumber, setPortNumber] = useState<FormField<number | ''>>({ value: '', error: false, helperText: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info'; }>({ open: false, message: '', severity: 'info' });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'portNumber', direction: 'asc' });

  // Funktion zum Laden der Ports
  const loadPorts = useCallback(async () => {
    setLoading(true);
    try {
      const portRes = await networkPortsApi.getAll();
      const finalPorts = Array.isArray(portRes) ? portRes : [];
      setPorts(finalPorts);
    } catch (error) {
      setSnackbar({ open: true, message: `Fehler beim Laden der Ports: ${handleApiError(error)}`, severity: 'error' });
      setPorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadPorts();
    }
  }, [isAuthenticated, loadPorts]);

  // Daten sortieren
  const processedPorts = useMemo(() => {
    const sortedPorts = [...ports]; // Kopie erstellen
    if (sortConfig.column) {
      const sortKey = sortConfig.column;
      sortedPorts.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
            comparison = String(aValue).localeCompare(String(bValue));
        }
        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
      });
    }
    return sortedPorts;
  }, [ports, sortConfig]);

  // Sortier-Handler
  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc') => {
    setSortConfig({
        column: columnKey as keyof NetworkPort,
        direction: direction
    });
  }, []);

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  // Spaltendefinitionen mit camelCase dataKeys
  const columns: AtlasColumn<NetworkPort>[] = [
    // {  // ID-Spalte auskommentiert/entfernt
    //   dataKey: 'id',
    //   label: 'ID',
    //   width: 80,
    //   numeric: true,
    //   sortable: true,
    // },
    {
      dataKey: 'portNumber',
      label: 'Portnummer',
      width: 150,
      sortable: true,
      render: (value) => (
        <Box sx={{ textAlign: 'center' }}>
          {value}
        </Box>
      ),
      headerSx: { textAlign: 'center' }
    },
    // { // Erstellt am Spalte auskommentiert/entfernt
    //     dataKey: 'createdAt',
    //     label: 'Erstellt am',
    //     width: 200,
    //     sortable: true,
    //     render: (value) => value ? new Date(value).toLocaleString() : '-'
    // },
    // { // Aktualisiert am Spalte auskommentiert/entfernt
    //     dataKey: 'updatedAt',
    //     label: 'Aktualisiert am',
    //     width: 200,
    //     sortable: true,
    //     render: (value) => value ? new Date(value).toLocaleString() : '-'
    // },
    {
      dataKey: 'actions',
      label: 'Aktionen',
      width: 100,
      sortable: false,
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Bearbeiten">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
              <EditIcon fontSize="small" sx={{ color: '#4CAF50' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Löschen">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
              <DeleteIcon fontSize="small" sx={{ color: '#F44336' }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
      headerSx: { textAlign: 'right' }
    }
  ];

  const resetForm = () => {
    setPortNumber({ value: '', error: false, helperText: '' });
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setPortNumber(prev => ({ ...prev, error: false, helperText: '' }));

    if (portNumber.value === '') {
      setPortNumber({ value: '', error: true, helperText: 'Portnummer ist erforderlich' });
      isValid = false;
    } else if (isNaN(Number(portNumber.value)) || Number(portNumber.value) <= 0) {
        setPortNumber({ value: portNumber.value, error: true, helperText: 'Portnummer muss eine positive Zahl sein' });
        isValid = false;
    } else if (isValid) {
        // Prüfe Eindeutigkeit nur wenn bisher valide
        try {
            const portNum = Number(portNumber.value);
            const portExists = await networkPortsApi.checkPortNumberExists(
                portNum,
                editMode ? currentPort?.id : undefined
            );
            if (portExists) {
                setPortNumber({ value: portNumber.value, error: true, helperText: 'Diese Portnummer existiert bereits' });
                isValid = false;
            }
        } catch (error) {
            setSnackbar({ open: true, message: `Fehler bei Eindeutigkeitsprüfung: ${handleApiError(error)}`, severity: 'error' });
            isValid = false; // Im Fehlerfall nicht speichern
        }
    }

    return isValid;
  };

  const handleAddNew = () => {
    resetForm();
    setEditMode(false);
    setCurrentPort(null);
    setDialogOpen(true);
  };

  const handleEdit = (port: NetworkPort) => {
    resetForm();
    setEditMode(true);
    setCurrentPort(port);
    setPortNumber({ value: port.portNumber, error: false, helperText: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid || portNumber.value === '') return;

    const portData: NetworkPortCreate | NetworkPortUpdate = {
      portNumber: Number(portNumber.value),
    };

    setLoading(true);
    try {
      let savedPort;
      if (editMode && currentPort) {
        savedPort = await networkPortsApi.update(currentPort.id, portData as NetworkPortUpdate);
        setSnackbar({ open: true, message: `Port ${savedPort.portNumber} erfolgreich aktualisiert.`, severity: 'success' });
      } else {
        savedPort = await networkPortsApi.create(portData as NetworkPortCreate);
        setSnackbar({ open: true, message: `Port ${savedPort.portNumber} erfolgreich erstellt.`, severity: 'success' });
      }
      await loadPorts();
      handleCloseDialog();
    } catch (error) {
      const errorMessage = handleApiError(error);
      if (errorMessage.toLowerCase().includes('existiert bereits')) {
        setPortNumber(prev => ({ ...prev, error: true, helperText: errorMessage }));
      } else {
        setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (portToDelete: NetworkPort) => {
    if (!window.confirm(`Möchten Sie den Port ${portToDelete.portNumber} (ID: ${portToDelete.id}) wirklich löschen?`)) {
      return;
    }
    setLoading(true);
    try {
      await networkPortsApi.delete(portToDelete.id);
      setSnackbar({ open: true, message: `Port ${portToDelete.portNumber} wurde gelöscht.`, severity: 'success' });
      await loadPorts();
    } catch (error) {
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${handleApiError(error)}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)', width: '100%' }}>
      <Paper elevation={1} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2, mb: 3, display: 'flex', alignItems: 'center', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PortIcon sx={{ fontSize: 32, mr: 1.5 }} />
          <Typography variant="h5" component="h1">Netzwerk-Port Verwaltung</Typography>
        </Box>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          disabled={loading}
        >
          Neuer Port
        </Button>
      </Box>

      <Paper elevation={1} sx={{ mb: 3, overflow: 'hidden', borderRadius: 1 }}>
        <AtlasTable
          columns={columns}
          rows={processedPorts}
          heightPx={600}
          emptyMessage="Keine Netzwerk-Ports vorhanden"
          sortColumn={sortConfig.column || undefined}
          sortDirection={sortConfig.direction}
          onSort={handleSort}
          loading={loading}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode ? 'Port bearbeiten' : 'Neuen Port erstellen'}</DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <TextField
            autoFocus
            required
            margin="dense"
            id="port_number"
            label="Portnummer"
            type="number"
            fullWidth
            value={portNumber.value}
            onChange={(e) => setPortNumber({ value: e.target.value === '' ? '' : Number(e.target.value), error: false, helperText: '' })}
            error={portNumber.error}
            helperText={portNumber.helperText}
            InputProps={{ inputProps: { min: 1 } }} // Verhindert negative Zahlen / 0
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">Abbrechen</Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NetworkPorts;
