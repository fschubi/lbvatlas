import React, { useState, useEffect, useCallback } from 'react';
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
  SelectChangeEvent,
  CircularProgress,
  Chip,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  WallpaperOutlined as WallPositionIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Router as RouterIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { NetworkOutlet, Room, Location, NetworkOutletCreate, NetworkOutletUpdate } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { ApiResponse } from '../../utils/api';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const NetworkSockets: React.FC = () => {
  // State für die Daten
  const [networkSockets, setNetworkSockets] = useState<NetworkOutlet[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentSocket, setCurrentSocket] = useState<NetworkOutlet | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    socketId: number;
  } | null>(null);

  // Form State
  const [description, setDescription] = useState<string>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [outletNumber, setOutletNumber] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

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

  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [socketToDelete, setSocketToDelete] = useState<NetworkOutlet | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    // Reset states initially
    setNetworkSockets([]);
    setLocations([]);
    setRooms([]);

    try {
      const [socketsResponse, locationsResponse, roomsResponse] = await Promise.all([
        settingsApi.getAllNetworkOutlets(),
        settingsApi.getAllLocations(), // Load locations
        settingsApi.getAllRooms()       // Load rooms
      ]);

      // Validate all responses
      const socketsValid = socketsResponse?.success && Array.isArray(socketsResponse.data);
      const locationsValid = locationsResponse?.success && Array.isArray(locationsResponse.data);
      const roomsValid = roomsResponse?.success && Array.isArray(roomsResponse.data);

      if (socketsValid && locationsValid && roomsValid) {
        // Set states only if all requests were successful
        setNetworkSockets(socketsResponse.data);
        setLocations(locationsResponse.data);
        setRooms(roomsResponse.data);
      } else {
        // Handle specific errors or generic message
        let errorMessages: string[] = [];
        if (!socketsValid) errorMessages.push(`Netzwerkdosen: ${socketsResponse?.message || 'Ungültige Daten'}`);
        if (!locationsValid) errorMessages.push(`Standorte: ${locationsResponse?.message || 'Ungültige Daten'}`);
        if (!roomsValid) errorMessages.push(`Räume: ${roomsResponse?.message || 'Ungültige Daten'}`);

        console.error("[NetworkSockets LoadData] Failed to load some data:", errorMessages.join(', '));
        setSnackbar({
          open: true,
          message: `Fehler beim Laden der Daten: ${errorMessages.join('; ')}`,
          severity: 'error'
        });
        // Keep states empty or handle partially loaded data if necessary
        setNetworkSockets([]);
        setLocations([]);
        setRooms([]);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error("[NetworkSockets LoadData] CATCH BLOCK ERROR during combined loading:", errorMessage, error);
      setSnackbar({
        open: true,
        message: `Schwerwiegender Fehler beim Laden der Daten: ${errorMessage}`,
        severity: 'error'
      });
      setNetworkSockets([]);
      setLocations([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []); // Leeres Array ist korrekt hier

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentSocket(null);
    setOutletNumber('');
    setDescription('');
    setLocationId('');
    setRoomId('');
    setIsActive(true);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (socket: NetworkOutlet) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentSocket(socket);
    setOutletNumber(socket.outletNumber || '');
    setDescription(socket.description || '');
    setLocationId(socket.locationId || '');
    setRoomId(socket.roomId || '');
    setIsActive(socket.isActive);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Löschen vorbereiten
  const handleDeleteRequest = (socket: NetworkOutlet) => {
    setSocketToDelete(socket);
    setConfirmDeleteDialogOpen(true);
  };

  // Löschen ausführen
  const executeDelete = async () => {
    if (!socketToDelete) return;
    setConfirmDeleteDialogOpen(false);
    const socketNum = socketToDelete.outletNumber;

    setLoading(true);
    try {
      const response = await settingsApi.deleteNetworkOutlet(socketToDelete.id);
      if (response.success) {
         setSnackbar({
           open: true,
           message: response.message || `Netzwerkdose "${socketNum}" wurde gelöscht.`,
           severity: 'success'
         });
         await loadData();
      } else {
         setSnackbar({
            open: true,
            message: response.message || 'Fehler beim Löschen der Netzwerkdose.',
            severity: 'error'
         });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setSocketToDelete(null);
    }
  };

  // Bestätigungsdialog schließen
  const handleCloseConfirmDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setSocketToDelete(null);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormErrors({});
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, socketId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      socketId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const socket = networkSockets.find(s => s.id === contextMenu.socketId);
      if (socket) {
        setEditMode(false);
        setReadOnly(true);
        setCurrentSocket(socket);
        setOutletNumber(socket.outletNumber || '');
        setDescription(socket.description || '');
        setLocationId(socket.locationId || '');
        setRoomId(socket.roomId || '');
        setIsActive(socket.isActive);
        setFormErrors({});
        setDialogOpen(true);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const socket = networkSockets.find(s => s.id === contextMenu.socketId);
      if (socket) {
        handleEdit(socket);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const socket = networkSockets.find(s => s.id === contextMenu.socketId);
      if (socket) {
        handleDeleteRequest(socket);
      }
      handleContextMenuClose();
    }
  };

  // Speichern der Netzwerkdose
  const handleSave = async () => {
    setFormErrors({});
    let errors: { [key: string]: string } = {};
    const trimmedOutletNumber = outletNumber.trim();

    if (!trimmedOutletNumber) {
      errors.outletNumber = 'Dosennummer ist erforderlich.';
    }
    if (!locationId) {
       errors.locationId = 'Standort ist erforderlich.';
    }
    if (Object.keys(errors).length > 0) {
       setFormErrors(errors);
       return;
    }

    const socketData: Partial<NetworkOutletCreate | NetworkOutletUpdate> = {
      outletNumber: trimmedOutletNumber,
      description: description.trim() || null,
      locationId: locationId ? Number(locationId) : null,
      roomId: roomId ? Number(roomId) : null,
      isActive: isActive,
    };

    setLoading(true);
    try {
      let response: ApiResponse<NetworkOutlet>;
      if (editMode && currentSocket) {
        response = await settingsApi.updateNetworkOutlet(currentSocket.id, socketData as NetworkOutletUpdate);
      } else {
        response = await settingsApi.createNetworkOutlet(socketData as NetworkOutletCreate);
      }

      if (response.success && response.data) {
        setSnackbar({
          open: true,
          message: response.message || `Netzwerkdose ${response.data.outletNumber} erfolgreich ${editMode ? 'aktualisiert' : 'erstellt'}.`,
          severity: 'success'
        });
        handleCloseDialog();
        await loadData();
      } else {
        setSnackbar({
          open: true,
          message: response.message || `Fehler beim Speichern der Netzwerkdose.`,
          severity: 'error'
        });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Behandeln der Standortänderung
  const handleLocationChange = (event: SelectChangeEvent<number | ''>) => {
    const newLocationId = event.target.value as number | '';
    setLocationId(newLocationId);
    setRoomId('');
  };

  // Gefilterte Räume basierend auf dem ausgewählten Standort
  const filteredRooms = locationId
    ? rooms.filter(room => room.locationId === locationId)
    : rooms;

  // Spalten für die Tabelle
  const columns: AtlasColumn<NetworkOutlet>[] = [
    { dataKey: 'id', label: 'ID', width: 70, numeric: true, sortable: true },
    { dataKey: 'outletNumber', label: 'Dosennummer', width: 150, sortable: true },
    { dataKey: 'description', label: 'Beschreibung', sortable: true },
    {
      dataKey: 'locationId',
      label: 'Standort',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const location = locations.find(l => l.id === value);
        return location ? location.name : `ID: ${value}`;
      }
    },
    {
      dataKey: 'roomId',
      label: 'Raum',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const room = rooms.find(r => r.id === value);
        return room ? room.name : `ID: ${value}`;
      }
    },
    {
      dataKey: 'isActive',
      label: 'Status',
      width: 120,
      sortable: true,
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
      dataKey: 'actions',
      label: 'Aktionen',
      width: 100,
      sortable: false,
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Anzeigen">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleContextMenu(e, row.id); }}>
              <ViewIcon fontSize="small" sx={{ color: '#90CAF9' }} />
            </IconButton>
          </Tooltip>
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

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  console.log("[NetworkSockets Rendering] Current networkSockets state:", JSON.stringify(networkSockets)); // Log vor dem Return

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
          <RouterIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">
            Netzwerkdosen
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
          Neue Netzwerkdose
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
            rows={networkSockets}
            heightPx={600}
            emptyMessage="Keine Netzwerkdosen vorhanden"
            initialSortColumn="outletNumber"
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
          {readOnly ? `Netzwerkdose anzeigen: ${currentSocket?.outletNumber}` :
            (editMode ? `Netzwerkdose bearbeiten: ${currentSocket?.outletNumber}` : 'Neue Netzwerkdose erstellen')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Dosennummer"
              fullWidth
              margin="normal"
              variant="outlined"
              disabled={readOnly}
              required
              value={outletNumber}
              onChange={(e) => setOutletNumber(e.target.value)}
              error={!!formErrors.outletNumber}
              helperText={formErrors.outletNumber}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RouterIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Beschreibung"
              fullWidth
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung der Netzwerkdose"
              InputProps={{
                readOnly: readOnly
              }}
            />

            <FormControl fullWidth disabled={readOnly} error={!!formErrors.locationId}>
              <InputLabel id="location-label">Standort</InputLabel>
              <Select
                labelId="location-label"
                label="Standort"
                value={locationId}
                onChange={handleLocationChange}
                disabled={readOnly}
              >
                <MenuItem value="">
                  <em>Bitte wählen</em>
                </MenuItem>
                {locations.map(location => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.locationId && <FormHelperText>{formErrors.locationId}</FormHelperText>}
            </FormControl>

            <FormControl fullWidth disabled={!locationId || readOnly}>
              <InputLabel id="room-label">Raum</InputLabel>
              <Select
                labelId="room-label"
                label="Raum"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value as number | '')}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Bitte wählen</em>
                </MenuItem>
                {filteredRooms.map(room => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.name} {room.floor ? `(${room.floor})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <MuiSwitch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="primary"
                  disabled={readOnly}
                />
              }
              label="Netzwerkdose aktiv"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {readOnly ? (
            <Button onClick={handleCloseDialog} color="primary">
              Schließen
            </Button>
          ) : (
            <>
              <Button onClick={handleCloseDialog}>Abbrechen</Button>
              <Button onClick={handleSave} color="primary" variant="contained">
                {editMode ? 'Speichern' : 'Erstellen'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog für Delete */}
      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Netzwerkdose löschen?"
        message={`Möchten Sie die Netzwerkdose "${socketToDelete?.outletNumber}" (ID: ${socketToDelete?.id}) wirklich endgültig löschen?`}
        confirmText="Löschen"
      />

      {/* Snackbar */}
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

export default NetworkSockets;
