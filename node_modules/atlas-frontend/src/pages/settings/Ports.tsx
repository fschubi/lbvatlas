import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid,
  FormControlLabel,
  Switch,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Router as RouterIcon,
  SettingsEthernet as PortIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { NetworkPort, Switch as SwitchType, NetworkPortCreate, NetworkPortUpdate } from '../../types/settings';
import { networkPortsApi, switchApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const Ports: React.FC = () => {
  const [ports, setPorts] = useState<NetworkPort[]>([]);
  const [switches, setSwitches] = useState<SwitchType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentPort, setCurrentPort] = useState<NetworkPort | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info'; }>({ open: false, message: '', severity: 'info' });

  // Form state - use camelCase matching the type
  const [portNumber, setPortNumber] = useState<string>('');
  const [selectedSwitch, setSelectedSwitch] = useState<SwitchType | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [portNumberError, setPortNumberError] = useState<string>('');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [portToDelete, setPortToDelete] = useState<NetworkPort | null>(null);

  // Load Ports and Switches
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [portsRes, switchesRes] = await Promise.all([
        networkPortsApi.getAll(),
        switchApi.getAll()
      ]);
      // Ensure correct types after fetch
      setPorts(Array.isArray(portsRes) ? portsRes as NetworkPort[] : []);
      setSwitches(Array.isArray(switchesRes) ? switchesRes as SwitchType[] : []);
    } catch (error) {
      // Corrected handleApiError usage - assuming it throws or returns message
       const message = handleApiError(error);
       setSnackbar({ open: true, message: `Fehler beim Laden der Daten: ${message}`, severity: 'error' });
       setPorts([]);
       setSwitches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const switchMap = useMemo(() => new Map(switches.map(s => [s.id, s.name])), [switches]);

  const processedPorts = useMemo(() => ports.map(port => ({
    ...port,
    switchName: port.switchId ? switchMap.get(port.switchId) || 'N/A' : '-',
  })), [ports, switchMap]);

  const resetForm = () => {
    setPortNumber('');
    setSelectedSwitch(null);
    setDescription('');
    setIsActive(true);
    setCurrentPort(null);
    setEditMode(false);
    setPortNumberError('');
  };

  const handleAddNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (port: NetworkPort) => {
    resetForm();
    setEditMode(true);
    setCurrentPort(port);
    // Access fields added to NetworkPort type
    setPortNumber(port.portNumber?.toString() || '');
    setSelectedSwitch(switches.find(s => s.id === port.switchId) || null);
    setDescription(port.description || '');
    setIsActive(port.isActive ?? true); // Use nullish coalescing for default
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setPortNumberError('');

    const num = parseInt(portNumber, 10);
    if (isNaN(num) || num < 1) {
        setPortNumberError('Ungültige Portnummer.');
        isValid = false;
    }

    // Optional: Check uniqueness for portNumber on the selected switch?
    // This might require an extra API call or client-side logic

    return isValid;
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (port: NetworkPort) => {
    setPortToDelete(port);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic - use camelCase
  const executeDelete = async () => {
    if (!portToDelete) return;

    setConfirmDialogOpen(false);
    // Use camelCase from type
    const portNum = portToDelete.portNumber;

    try {
      setLoading(true);
      await networkPortsApi.delete(portToDelete.id);
      await loadData(); // Reload data
      setSnackbar({
        open: true,
        message: `Port ${portNum} wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      // Corrected handleApiError usage
      const message = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen des Ports: ${message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setPortToDelete(null);
    }
  };

  // Step 3: Close confirmation dialog without deleting
  const handleCloseConfirmDialog = () => {
     setConfirmDialogOpen(false);
     setPortToDelete(null);
  };

  // Save Port - use camelCase
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    // Use the correct NetworkPortCreate/Update types
    const portData: NetworkPortCreate | NetworkPortUpdate = {
        portNumber: parseInt(portNumber, 10),
        switchId: selectedSwitch?.id,
        description: description.trim() || null,
        isActive: isActive,
    };

    setLoading(true);
    try {
      let savedPort: NetworkPort;
      if (editMode && currentPort) {
        savedPort = await networkPortsApi.update(currentPort.id, portData as NetworkPortUpdate);
         setSnackbar({ open: true, message: `Port ${savedPort.portNumber} erfolgreich aktualisiert.`, severity: 'success' });
      } else {
        savedPort = await networkPortsApi.create(portData as NetworkPortCreate);
         setSnackbar({ open: true, message: `Port ${savedPort.portNumber} erfolgreich erstellt.`, severity: 'success' });
      }
      handleCloseDialog();
      await loadData();
    } catch (error) {
       // Corrected handleApiError usage
       const message = handleApiError(error);
       setSnackbar({ open: true, message: `${editMode ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen'}: ${message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Columns definition - use camelCase dataKeys
  const columns: AtlasColumn<typeof processedPorts[number]>[] = [
    { dataKey: 'id', label: 'ID', width: 80, numeric: true },
    { dataKey: 'portNumber', label: 'Port #', width: 100, numeric: true }, // Use camelCase
    { dataKey: 'switchName', label: 'Switch', width: 200 },
    { dataKey: 'description', label: 'Beschreibung', width: 300 },
    {
        dataKey: 'isActive',
        label: 'Aktiv',
        width: 80,
        render: (value) => (
            <Switch checked={Boolean(value)} readOnly size="small" color={value ? "success" : "default"} />
        )
    },
    {
        dataKey: 'actions',
        label: 'Aktionen',
        width: 120,
        render: (_, row) => (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Tooltip title="Bearbeiten">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
                        <EditIcon fontSize="small" sx={{ color: '#4CAF50' }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Löschen">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(row); }}>
                        <DeleteIcon fontSize="small" sx={{ color: '#F44336' }} />
                    </IconButton>
                </Tooltip>
            </Box>
        )
    }
];

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'white',
          borderRadius: 0
        }}
      >
        <RouterIcon />
        <Typography variant="h6">Netzwerk-Ports</Typography>
      </Paper>

      {/* Action Button */}
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          Neuer Port
        </Button>
      </Box>

      {/* Tabelle */}
      <Paper
        elevation={1}
        sx={{
          mx: 2,
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <AtlasTable
          columns={columns}
          rows={processedPorts}
          loading={loading}
          heightPx={600}
          emptyMessage="Keine Ports vorhanden"
        />
      </Paper>

      {/* Dialog für Port */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode ? 'Port bearbeiten' : 'Neuen Port hinzufügen'}
        </DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
            <Grid container spacing={2} sx={{mt: 1}}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="portNumber"
                        label="Portnummer"
                        type="number"
                        fullWidth
                        value={portNumber}
                        onChange={(e) => {
                            setPortNumber(e.target.value);
                            if(portNumberError) setPortNumberError('');
                        }}
                        error={!!portNumberError}
                        helperText={portNumberError}
                        inputProps={{ min: 1 }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                     <Autocomplete<SwitchType, false, false, false>
                        options={switches}
                        getOptionLabel={(option: SwitchType) => option.name}
                        value={selectedSwitch}
                        onChange={(_, newValue: SwitchType | null) => setSelectedSwitch(newValue)}
                        isOptionEqualToValue={(option: SwitchType, value: SwitchType) => option.id === value.id}
                        renderInput={(params) => (
                            <TextField {...params} margin="dense" label="Zugeordneter Switch (Optional)" />
                        )}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        margin="dense"
                        id="description"
                        label="Beschreibung (Optional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Grid>
                <Grid item xs={12}>
                     <FormControlLabel
                        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                        label="Aktiv"
                    />
                </Grid>
            </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Port löschen?"
        message={`Möchten Sie den Port "${portToDelete?.portNumber}" (ID: ${portToDelete?.id}) wirklich endgültig löschen?`}
        confirmText="Löschen"
      />

      {/* Snackbar für Benachrichtigungen */}
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

export default Ports;
