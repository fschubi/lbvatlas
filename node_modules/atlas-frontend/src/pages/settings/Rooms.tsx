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
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BuildingIcon,
  MeetingRoom as RoomIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { Room, Location } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const Rooms: React.FC = () => {
  // State für die Daten
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    roomId: number;
  } | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationId, setLocationId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Standorte für Dropdown
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);

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

  // API-Daten laden
  useEffect(() => {
    fetchRooms();
    fetchLocations();
  }, []);

  // Räume vom API laden
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getAllRooms();
      setRooms(response.data);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Räume: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Standorte laden für Dropdown
  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await settingsApi.getAllLocations();
      if (response && response.data) {
        // Sortiere die Standorte nach Namen
        const sortedLocations = response.data.sort((a: Location, b: Location) =>
          a.name.localeCompare(b.name, 'de-DE')
        );
        setLocations(sortedLocations);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Fehler beim Laden der Standorte:', errorMessage);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Standorte: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  // Standortnamen für einen Raum erhalten
  const getLocationName = (locationId: number | undefined): string => {
    if (!locationId) return '';
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : '';
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
      dataKey: 'created_at',
      label: 'Erstellt am',
      width: 180,
      render: (value, row) => {
        // Verwende den Wert aus dem row Objekt oder den übergebenen value
        const dateValue = row?.created_at || row?.createdAt || value;

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
      width: 80,
      render: (_, row) => (
        <IconButton
          size="small"
          onClick={(event) => handleContextMenu(event, row.id)}
        >
          <MoreVertIcon />
        </IconButton>
      )
    }
  ];

  // Dialog öffnen für neuen Raum
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentRoom(null);
    setName('');
    setDescription('');
    setLocationId(null);
    setIsActive(true);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (room: Room) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentRoom(room);
    setName(room.name);
    setDescription(room.description);
    setLocationId(room.locationId || room.location_id || null);
    setIsActive(room.active);
    setDialogOpen(true);
  };

  // Löschen eines Raums
  const handleDelete = async (room: Room) => {
    try {
      await settingsApi.deleteRoom(room.id);
      // Aktualisiere die Liste der Räume nach dem Löschen
      setRooms(rooms.filter(r => r.id !== room.id));
      setSnackbar({
        open: true,
        message: `Raum "${room.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Raums: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Raums
  const handleSave = async () => {
    // Validierung
    if (!name.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Namen ein.',
        severity: 'error'
      });
      return;
    }

    if (!locationId) {
      setSnackbar({
        open: true,
        message: 'Bitte wählen Sie einen Standort aus.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);

      // Neue Raum-Daten erstellen
      const roomData = {
        name,
        description,
        location_id: locationId,
        active: isActive
      };

      if (editMode && currentRoom) {
        // Bestehenden Raum bearbeiten
        const response = await settingsApi.updateRoom(currentRoom.id, roomData);

        // Lokale Liste aktualisieren
        const updatedRoom = response.data;
        setRooms(rooms.map(r => r.id === currentRoom.id ? updatedRoom : r));

        setSnackbar({
          open: true,
          message: `Raum "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neuen Raum erstellen
        const response = await settingsApi.createRoom(roomData);

        // Lokale Liste aktualisieren
        setRooms([...rooms, response.data]);

        setSnackbar({
          open: true,
          message: `Raum "${name}" wurde erstellt.`,
          severity: 'success'
        });
      }

      // Dialog schließen
      setDialogOpen(false);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern des Raums: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
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
        setEditMode(false);
        setReadOnly(true);
        setCurrentRoom(room);
        setName(room.name);
        setDescription(room.description);
        setLocationId(room.locationId || room.location_id || null);
        setIsActive(room.active);
        setDialogOpen(true);
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

  // Neue Funktion für die Anzeige des Raums beim Klick auf den Namen
  const handleViewRoom = (room: Room) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentRoom(room);
    setName(room.name);
    setDescription(room.description);
    setLocationId(room.locationId || room.location_id || null);
    setIsActive(room.active);
    setDialogOpen(true);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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
          {readOnly ? `Raum anzeigen: ${currentRoom?.name}` :
            (editMode ? `Raum bearbeiten: ${currentRoom?.name}` : 'Neuen Raum erstellen')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              InputProps={{
                readOnly: readOnly
              }}
            />
            <TextField
              label="Beschreibung"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              InputProps={{
                readOnly: readOnly
              }}
            />
            <Autocomplete
              id="location-autocomplete"
              options={locations}
              getOptionLabel={(option) => option.name}
              value={locations.find(loc => loc.id === locationId) || null}
              onChange={(_, newValue) => setLocationId(newValue ? newValue.id : null)}
              disabled={readOnly || loadingLocations}
              disablePortal
              fullWidth
              filterSelectedOptions
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Keine Standorte verfügbar"
              loadingText="Standorte werden geladen..."
              loading={loadingLocations}
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
                        {loadingLocations ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                  helperText={loadingLocations ? "Standorte werden geladen..." : ""}
                />
              )}
            />
            <FormControlLabel
              control={
                <MuiSwitch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="primary"
                  disabled={readOnly}
                />
              }
              label="Raum aktiv"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {readOnly ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} variant="contained" color="primary" disableElevation>
              Speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
