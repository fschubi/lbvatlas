import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch as MuiSwitch,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Menu,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Autocomplete,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { roomApi, locationApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import { Room, RoomCreate, RoomUpdate, Location } from '../../types/settings';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Definiere FormField direkt hier, da es nur in diesen Seiten genutzt wird
interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

const Rooms: React.FC = () => {
  // State für die Daten
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Form State
  const [name, setName] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [description, setDescription] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  // UI State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    roomId: number;
  } | null>(null);

  // API-Daten laden
  useEffect(() => {
    loadRooms();
    loadLocationsForSelect();
  }, []);

  // Räume laden
  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await roomApi.getAll(); // Gibt ApiResponse<Room[]> zurück
      if (response.success && Array.isArray(response.data)) {
        const formattedRooms = response.data.map((room: any) => toCamelCase(room) as Room);
        setRooms(formattedRooms);
      } else {
        console.warn('Laden der Räume nicht erfolgreich oder Datenstruktur unerwartet:', response);
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Laden der Räume.',
          severity: 'error'
        });
        setRooms([]);
      }
    } catch (error: any) {
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Räume: ${errorMessage}`, severity: 'error' });
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Standorte laden
  const loadLocationsForSelect = async () => {
    try {
      const response = await locationApi.getAll(); // Gibt ApiResponse<Location[]> zurück
      if (response.success && Array.isArray(response.data)) {
        const formattedLocations = response.data.map((loc: any) => toCamelCase(loc) as Location);
        setLocations(formattedLocations);
      } else {
        console.warn('Laden der Standorte für Auswahl nicht erfolgreich oder Datenstruktur unerwartet:', response);
        // Optional: Keine Snackbar hier, da es nur für die Auswahl ist?
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Laden der Standorte für Auswahl.',
          severity: 'error' // oder 'warning'
        });
        setLocations([]);
      }
    } catch (error: any) {
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Standorte: ${errorMessage}`, severity: 'error' });
      setLocations([]);
    }
  };

  // Standortnamen für einen Raum erhalten
  const getLocationName = (locationId: number | undefined): string => {
    if (!locationId) return 'Unbekannt';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unbekannt';
  };

  // Spalten für die AtlasTable-Komponente
  const columns: AtlasColumn<Room>[] = [
    { dataKey: 'id', label: 'ID', width: 70, numeric: true },
    {
      dataKey: 'name',
      label: 'Name',
      render: (value, row) => (
        <Box
          sx={{
            color: 'primary.main',
            fontWeight: 500,
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleViewRoom(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
    {
      dataKey: 'location_id',
      label: 'Standort',
      width: 180,
      render: (value) => getLocationName(value as number)
    },
    {
      dataKey: 'active',
      label: 'Status',
      width: 120,
      render: (value) => (
        <Chip
          label={value ? 'Aktiv' : 'Inaktiv'}
          color={value ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      dataKey: 'createdAt',
      label: 'Erstellt am',
      width: 180,
      render: (value, row) => {
        // Verwende den Wert aus dem row Objekt oder den übergebenen value
        const dateValue = row?.createdAt || row?.createdAt || value;

        if (!dateValue) return 'Unbekannt';

        try {
          // Versuche das Datum zu parsen
          const date = new Date(dateValue as string);

          // Prüfe ob das Datum gültig ist
          if (isNaN(date.getTime())) {
            return 'Ungültiges Datum';
          }

          // Formatiere das Datum auf deutsch
          return date.toLocaleDateString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
        } catch (e) {
          return 'Fehler beim Parsen';
        }
      }
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

  // Dialog öffnen für neuen Raum
  const handleAddNew = () => {
    setEditMode(false);
    setViewMode(false);
    setCurrentRoom(null);
    setName({ value: '', error: false, helperText: '' });
    setDescription('');
    setSelectedLocation(null);
    setLocationError('');
    setActive(true);
    setReadOnly(false);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (room: Room) => {
    setEditMode(true);
    setViewMode(false);
    setCurrentRoom(room);
    setName({ value: room.name, error: false, helperText: '' });
    setDescription(room.description || '');
    setSelectedLocation(room.locationId ? locations.find(l => l.id === room.locationId) || null : null);
    setLocationError('');
    setActive(room.active);
    setReadOnly(false);
    setDialogOpen(true);
  };

  // Löschen eines Raums
  const handleDelete = async (room: Room) => {
    if (!window.confirm(`Möchten Sie den Raum "${room.name}" wirklich löschen?`)) return;
    try {
      setLoading(true);
      await roomApi.delete(room.id);
      loadRooms();
      setSnackbar({ open: true, message: `Raum "${room.name}" wurde gelöscht.`, severity: 'success' });
    } catch (error: any) {
      // Versuche, die spezifische Nachricht aus dem Fehlerobjekt zu extrahieren
      const specificMessage = error?.data?.message || error?.message;
      const errorMessage = specificMessage || handleApiError(error); // Fallback auf generische Meldung

      setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Raums
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid || !selectedLocation) return;

    const roomData: Partial<Room> = {
      name: name.value.trim(),
      description: description.trim() || undefined,
      locationId: selectedLocation.id,
      active: active
    };

    const backendData = toSnakeCase(roomData);
    console.log('DEBUG: Sende Daten an Backend (room, snake_case):', backendData);

    try {
      setLoading(true);
      if (editMode && currentRoom) {
        await roomApi.update(currentRoom.id, backendData as RoomUpdate);
        setSnackbar({ open: true, message: `Raum "${name.value}" wurde aktualisiert.`, severity: 'success' });
      } else {
        await roomApi.create(backendData as RoomCreate);
        setSnackbar({ open: true, message: `Raum "${name.value}" wurde erstellt.`, severity: 'success' });
      }
      loadRooms();
      setDialogOpen(false);
    } catch (error: any) {
      const errorMessage = handleApiError(error); // Nur Fehler übergeben
      if (errorMessage.includes('existiert bereits')) {
        setName({ ...name, error: true, helperText: errorMessage });
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      } else {
        setSnackbar({ open: true, message: `Fehler beim Speichern des Raums: ${errorMessage}`, severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Neue Funktion für die Anzeige des Raums beim Klick auf den Namen
  const handleViewRoom = (room: Room) => {
    setEditMode(false);
    setViewMode(true);
    setCurrentRoom(room);
    setName({ value: room.name, error: false, helperText: '' });
    setDescription(room.description || '');
    setSelectedLocation(room.locationId ? locations.find(l => l.id === room.locationId) || null : null);
    setActive(room.active);
    setReadOnly(true);
    setDialogOpen(true);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Validierung
  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setLocationError('');

    if (!name.value.trim()) {
      setName({ ...name, error: true, helperText: 'Name ist erforderlich' });
      isValid = false;
    }

    if (!selectedLocation) {
      setLocationError('Standort ist erforderlich');
      isValid = false;
    }

    if (name.value.trim() && selectedLocation) {
        // ID des aktuellen Raums (nur im Edit-Modus relevant)
        const currentRoomId = editMode ? currentRoom?.id : undefined;
        // ID des ausgewählten Standorts
        const currentLocationId = selectedLocation.id; // selectedLocation ist hier sicher nicht null

        // Prüfen, ob sich Name ODER Standort geändert haben (oder Neuanlage)
        if (!editMode || (currentRoom && (name.value !== currentRoom.name || currentLocationId !== currentRoom.locationId))) {
            try {
                // Rufe checkRoomNameExists mit Namen, Standort-ID und optional aktueller Raum-ID auf
                const nameExists = await roomApi.checkRoomNameExists(name.value, currentLocationId, currentRoomId);
                 if (nameExists) {
                    // TODO: Backend-Prüfung verfeinern (Name + Standort)
                    setName({ ...name, error: true, helperText: `Ein Raum mit diesem Namen existiert bereits am Standort "${selectedLocation.name}".` });
                    isValid = false;
                }
            } catch (error) {
                console.error("Fehler bei der Prüfung des Raumnamens:", error);
                // Optional: Fehler anzeigen?
                // isValid = false; // Im Zweifel blockieren?
            }
        }
    }

    return isValid;
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, roomId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      roomId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const room = rooms.find(r => r.id === contextMenu.roomId);
      if (room) {
        handleViewRoom(room);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const room = rooms.find(r => r.id === contextMenu.roomId);
      if (room) {
        handleEdit(room);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const room = rooms.find(r => r.id === contextMenu.roomId);
      if (room) {
        handleDelete(room);
      }
      handleContextMenuClose();
    }
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (room: Room) => {
    setRoomToDelete(room);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
    if (!roomToDelete) return;

    setConfirmDialogOpen(false); // Close dialog first
    const roomName = roomToDelete.name; // Store name

    try {
      setLoading(true);
      await roomApi.delete(roomToDelete.id);
      loadRooms(); // Reload data
      setSnackbar({ open: true, message: `Raum "${roomName}" wurde gelöscht.`, severity: 'success' });
    } catch (error: any) {
        // Extract specific message if available
        const specificMessage = error?.data?.message || error?.message;
        const errorMessage = specificMessage || handleApiError(error);
        setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
      setRoomToDelete(null); // Clear the room to delete
    }
  };

   // Step 3: Close confirmation dialog without deleting
   const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setRoomToDelete(null);
   };

  return (
    <Box sx={{ p: 3, bgcolor: '#121212', minHeight: '100vh', width: '100%' }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          bgcolor: '#1976d2',
          color: 'white',
          p: 2,
          mb: 3,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RoomIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">
            Raumverwaltung
          </Typography>
        </Box>
      </Paper>

      {/* Aktionsleiste */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Neuer Raum
        </Button>
        <Tooltip title="Daten neu laden">
          <IconButton onClick={loadRooms} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabelle */}
      <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={columns}
            rows={rooms}
            heightPx={600}
            emptyMessage="Keine Räume vorhanden"
            initialSortColumn="name"
            initialSortDirection="asc"
          />
        )}
      </Paper>

      {/* Kontextmenü */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleContextMenuView}>
          <ListItemIcon>
            <ViewIcon fontSize="small" sx={{ color: '#90CAF9' }} />
          </ListItemIcon>
          <ListItemText primary="Anzeigen" />
        </MenuItem>
        <MenuItem onClick={handleContextMenuEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: '#4CAF50' }} />
          </ListItemIcon>
          <ListItemText primary="Bearbeiten" />
        </MenuItem>
        <MenuItem onClick={handleContextMenuDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: '#F44336' }} />
          </ListItemIcon>
          <ListItemText primary="Löschen" />
        </MenuItem>
      </Menu>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {viewMode ? 'Raumdetails' : (editMode ? 'Raum bearbeiten' : 'Neuen Raum erstellen')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Raumname"
                fullWidth
                value={name.value}
                onChange={(e) => setName({ value: e.target.value, error: false, helperText: '' })}
                required
                error={name.error}
                helperText={name.helperText}
                disabled={viewMode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name}
                value={selectedLocation || null}
                onChange={(_, newValue) => setSelectedLocation(newValue || null)}
                disabled={viewMode}
                disablePortal
                fullWidth
                filterSelectedOptions
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText="Keine Standorte verfügbar"
                loadingText="Standorte werden geladen..."
                loading={loading}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box
                      component="span"
                      sx={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography>{option.name}</Typography>
                      {option.city && (
                        <Typography variant="body2" color="text.secondary">
                          {option.city}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Standort"
                    required
                    error={!!locationError}
                    helperText={locationError}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <BuildingIcon />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Beschreibung"
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewMode}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    color="primary"
                    disabled={viewMode}
                  />
                }
                label="Raum aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {viewMode ? 'Schließen' : (editMode ? 'Abbrechen' : 'Abbrechen')}
          </Button>
          {!viewMode && (
            <Button onClick={handleSave} variant="contained" color="primary" disableElevation>
              Speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Raum löschen?"
        message={`Möchten Sie den Raum "${roomToDelete?.name}" wirklich endgültig löschen? Zugeordnete Elemente könnten davon betroffen sein.`}
        confirmText="Löschen"
      />

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Rooms;
