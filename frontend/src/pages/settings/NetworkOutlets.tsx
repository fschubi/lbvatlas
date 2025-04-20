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
  Grid,
  Autocomplete,
  Switch as MuiSwitch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cable as NetworkOutletIcon // Passendes Icon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { NetworkOutlet, Location, Room, NetworkOutletCreate, NetworkOutletUpdate } from '../../types/settings';
import { networkOutletsApi, locationApi, roomApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { useAuth } from '../../context/AuthContext';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Typ für Formularfelder
interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

// Typ für Autocomplete-Optionen
interface SelectOption {
    id: number;
    label: string;
}

const NetworkOutlets: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // State für Daten
  const [outlets, setOutlets] = useState<NetworkOutlet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentOutlet, setCurrentOutlet] = useState<NetworkOutlet | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info'; }>({ open: false, message: '', severity: 'info' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<NetworkOutlet | null>(null);

  // Form State - wallPosition already removed
  const [outletNumber, setOutletNumber] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [selectedLocation, setSelectedLocation] = useState<SelectOption | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<SelectOption | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string>('');

  // Gefilterte Räume basierend auf Standort
  const [filteredRooms, setFilteredRooms] = useState<SelectOption[]>([]);

  // Optionen für Autocomplete
  const locationOptions = locations.map(loc => ({ id: loc.id, label: loc.name }));

  // Daten laden (Outlets, Locations, Rooms)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [outletsRes, locationsRes, roomsRes] = await Promise.all([
        networkOutletsApi.getAll(),
        locationApi.getAll(),
        roomApi.getAll()
      ]);
      setOutlets(Array.isArray(outletsRes) ? outletsRes : []);
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
      setRooms(Array.isArray(roomsRes) ? roomsRes : []);
    } catch (error) {
      setSnackbar({ open: true, message: `Fehler beim Laden der Daten: ${handleApiError(error)}`, severity: 'error' });
      setOutlets([]); setLocations([]); setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) { loadData(); }
  }, [isAuthenticated, loadData]);

  // Effekt zum Filtern der Räume
  useEffect(() => {
    if (selectedLocation) {
      const availableRooms = rooms
        .filter(room => room.locationId === selectedLocation.id)
        .map(room => ({ id: room.id, label: room.name }));
      setFilteredRooms(availableRooms);
      if (selectedRoom && !availableRooms.some(r => r.id === selectedRoom.id)) {
          setSelectedRoom(null);
      }
    } else {
      setFilteredRooms([]);
      setSelectedRoom(null);
    }
  }, [selectedLocation, rooms]);

  // Mapping for Standort- und Raumnamen
  const locationMap = locations.reduce((acc, loc) => {
      acc[loc.id] = loc.name;
      return acc;
  }, {} as Record<number, string>);

  const roomMap = rooms.reduce((acc, room) => {
      acc[room.id] = room.name;
      return acc;
  }, {} as Record<number, string>);

  // Aufbereitete Daten für die Tabelle
  const processedOutlets = useMemo(() => {
    const locationMap = new Map(locations.map(loc => [loc.id, loc.name]));
    const roomMap = new Map(rooms.map(room => [room.id, room.name]));

    return outlets.map(outlet => ({
      ...outlet,
      locationName: outlet.locationId !== null ? locationMap.get(outlet.locationId) || 'N/A' : '-',
      roomName: outlet.roomId !== null ? roomMap.get(outlet.roomId) || 'N/A' : '-',
      isActiveText: outlet.isActive ? 'Ja' : 'Nein',
    }));
  }, [outlets, locations, rooms]);

  // Handler für Snackbar schließen
  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  // Spaltendefinitionen - removed wallPosition
  const columns: AtlasColumn<typeof processedOutlets[number]>[] = useMemo(() => [
    {
      dataKey: 'outletNumber',
      label: 'Dosennummer',
      width: 150,
    },
    {
      dataKey: 'locationName',
      label: 'Standort',
      width: 200,
    },
    {
      dataKey: 'roomName',
      label: 'Raum',
      width: 150,
    },
    {
      dataKey: 'description',
      label: 'Beschreibung',
      width: 250,
    },
    {
      dataKey: 'isActive',
      label: 'Aktiv',
      width: 80,
      render: (value) => (
        <MuiSwitch checked={Boolean(value)} readOnly size="small" color={value ? "success" : "default"} />
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
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteConfirmation(row); }}>
              <DeleteIcon fontSize="small" sx={{ color: '#F44336' }} />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ], [locations, rooms]); // Added dependencies

  // Formular zurücksetzen - removed wallPosition
  const resetForm = () => {
    setOutletNumber({ value: '', error: false, helperText: '' });
    setSelectedLocation(null);
    setSelectedRoom(null);
    setDescription('');
    // wallPosition reset removed
    setIsActive(true);
    setLocationError('');
  };

  // Formulardaten für Bearbeiten setzen - removed wallPosition access
  const setFormData = (outlet: NetworkOutlet) => {
    setOutletNumber({ value: outlet.outletNumber || '', error: false, helperText: '' });
    const currentLocation = locationOptions.find(loc => loc.id === outlet.locationId) || null;
    setSelectedLocation(currentLocation);
    const currentRoom = rooms
        .filter(room => room.locationId === outlet.locationId)
        .map(room => ({ id: room.id, label: room.name }))
        .find(room => room.id === outlet.roomId) || null;
    setSelectedRoom(currentRoom);
    setDescription(outlet.description || '');
    // wallPosition access removed
    setIsActive(outlet.isActive);
    setLocationError('');
  };

  const handleAddNew = () => {
      resetForm();
      setEditMode(false);
      setCurrentOutlet(null);
      setDialogOpen(true);
  };

  const handleEdit = (outlet: NetworkOutlet) => {
      resetForm();
      setEditMode(true);
      setCurrentOutlet(outlet);
      setFormData(outlet);
      setDialogOpen(true);
  };

  const handleCloseDialog = () => {
      setDialogOpen(false);
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setOutletNumber(prev => ({ ...prev, error: false, helperText: '' }));
    setLocationError('');

    if (!outletNumber.value.trim()) {
      setOutletNumber({ value: outletNumber.value, error: true, helperText: 'Dosennummer ist erforderlich' });
      isValid = false;
    }

    if (!selectedLocation) {
        setLocationError('Standort ist erforderlich');
        isValid = false;
    }

    // Eindeutigkeitsprüfung für outletNumber
    if (isValid && outletNumber.value.trim()) {
        try {
            const numberExists = await networkOutletsApi.checkOutletNumberExists(
                outletNumber.value.trim(),
                editMode ? currentOutlet?.id : undefined
            );
            if (numberExists) {
                setOutletNumber({ value: outletNumber.value, error: true, helperText: 'Diese Dosennummer existiert bereits' });
                isValid = false;
            }
        } catch (error) {
            setSnackbar({ open: true, message: `Fehler bei Eindeutigkeitsprüfung: ${handleApiError(error)}`, severity: 'error' });
            isValid = false;
        }
    }

    return isValid;
  };

  // Speichern (Neu oder Update) - removed wallPosition from data object
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    const outletData: NetworkOutletCreate | NetworkOutletUpdate = {
      outletNumber: outletNumber.value.trim(),
      locationId: selectedLocation!.id, // Assuming validation ensures selectedLocation is not null
      roomId: selectedRoom?.id || null,
      description: description.trim() || null,
      // wallPosition removed from object literal
      isActive: isActive,
    };

    setLoading(true);
    try {
      let savedOutlet;
      if (editMode && currentOutlet) {
        savedOutlet = await networkOutletsApi.update(currentOutlet.id, outletData as NetworkOutletUpdate);
        setSnackbar({ open: true, message: `Netzwerkdose ${savedOutlet.outletNumber} erfolgreich aktualisiert.`, severity: 'success' });
      } else {
        savedOutlet = await networkOutletsApi.create(outletData as NetworkOutletCreate);
        setSnackbar({ open: true, message: `Netzwerkdose ${savedOutlet.outletNumber} erfolgreich erstellt.`, severity: 'success' });
      }
      await loadData();
      handleCloseDialog();
    } catch (error) {
      const errorMessage = handleApiError(error);
      if (errorMessage.toLowerCase().includes('existiert bereits')) {
        setOutletNumber(prev => ({ ...prev, error: true, helperText: errorMessage }));
      } else {
        setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmation = (outlet: NetworkOutlet) => {
      setOutletToDelete(outlet);
      setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setOutletToDelete(null);
  };

  // Löschen (angepasst)
  const handleDelete = async () => {
     if (!outletToDelete) return;
      const outletToDeleteFinal = outletToDelete;
      setConfirmDialogOpen(false);
      setOutletToDelete(null);

    setLoading(true);
    try {
      await networkOutletsApi.delete(outletToDeleteFinal.id);
      setSnackbar({ open: true, message: `Netzwerkdose ${outletToDeleteFinal.outletNumber} wurde gelöscht.`, severity: 'success' });
      await loadData();
    } catch (error) {
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${handleApiError(error)}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // JSX für die Seite
  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)', width: '100%' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2, mb: 3, display: 'flex', alignItems: 'center', borderRadius: 1 }}>
        <NetworkOutletIcon sx={{ fontSize: 32, mr: 1.5 }} />
        <Typography variant="h5" component="h1">Netzwerkdosen Verwaltung</Typography>
      </Paper>

      {/* Button für neuen Eintrag */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          disabled={loading}
        >
          Neue Netzwerkdose
        </Button>
      </Box>

      {/* Tabelle */}
      <Paper elevation={1} sx={{ mb: 3, overflow: 'hidden', borderRadius: 1 }}>
        <AtlasTable
          columns={columns} // columns already updated via useMemo
          rows={processedOutlets}
          heightPx={600}
          emptyMessage="Keine Netzwerkdosen vorhanden"
          loading={loading}
        />
      </Paper>

      {/* Dialog für Neu/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Netzwerkdose bearbeiten' : 'Neue Netzwerkdose erstellen'}</DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Dosennummer */}
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                required
                margin="dense"
                id="outletNumber"
                label="Dosennummer"
                type="text"
                fullWidth
                value={outletNumber.value}
                onChange={(e) => setOutletNumber({ value: e.target.value, error: false, helperText: '' })}
                error={outletNumber.error}
                helperText={outletNumber.helperText}
              />
            </Grid>
             {/* Aktiv-Schalter */}
             <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <FormControlLabel
                    control={<MuiSwitch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="success" />}
                    label="Aktiv"
                    sx={{ mt: '8px'}} // Etwas margin oben für Ausrichtung
                />
            </Grid>
             {/* Standort */}
             <Grid item xs={12} sm={6}>
                 <Autocomplete
                    options={locationOptions}
                    getOptionLabel={(option) => option.label}
                    value={selectedLocation}
                    onChange={(_, newValue) => {
                        setSelectedLocation(newValue);
                        setLocationError(''); // Korrekt: Nur diese States ändern
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                        <TextField {...params} required margin="dense" label="Standort" error={!!locationError} helperText={locationError} />
                    )}
                />
            </Grid>
            {/* Raum */}
            <Grid item xs={12} sm={6}>
                 <Autocomplete
                    options={filteredRooms}
                    getOptionLabel={(option) => option.label}
                    value={selectedRoom}
                    onChange={(_, newValue) => setSelectedRoom(newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    disabled={!selectedLocation} // Deaktivieren, wenn kein Standort gewählt
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            margin="dense"
                            label="Raum (Optional)"
                        />
                    )}
                />
            </Grid>
            {/* Beschreibung */}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">Abbrechen</Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
            open={confirmDialogOpen}
            onClose={handleCloseConfirmDialog}
            onConfirm={handleDelete}
            title="Löschen bestätigen"
            message={`Möchten Sie die Netzwerkdose "${outletToDelete?.outletNumber}" wirklich löschen?`}
       />

      {/* Snackbar für Feedback */}
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

export default NetworkOutlets;
