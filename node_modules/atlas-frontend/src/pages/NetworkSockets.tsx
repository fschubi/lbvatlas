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
  Chip
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
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import { NetworkOutlet, Room, Location } from '../types/settings';
import { settingsApi } from '../utils/api';
import handleApiError from '../utils/errorHandler';

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
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [wallPosition, setWallPosition] = useState<string>('');
  const [outletNumber, setOutletNumber] = useState<string>('');
  const [socketType, setSocketType] = useState<string>('ethernet');
  const [portCount, setPortCount] = useState<number>(1);
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

  // Daten laden
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Laden der Standorte, Räume und Netzwerkdosen parallel
      const [locationsResponse, roomsResponse, networkSocketsResponse] = await Promise.all([
        settingsApi.getAllLocations(),
        settingsApi.getAllRooms(),
        settingsApi.getAllNetworkOutlets()
      ]);

      setLocations(locationsResponse.data as Location[]);
      setRooms(roomsResponse.data as Room[]);
      setNetworkSockets(networkSocketsResponse.data as NetworkOutlet[]);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Daten: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentSocket(null);
    setName('');
    setDescription('');
    setLocationId('');
    setRoomId('');
    setWallPosition('');
    setOutletNumber('');
    setSocketType('ethernet');
    setPortCount(1);
    setIsActive(true);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (socket: NetworkOutlet) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentSocket(socket);
    setName(socket.name || '');
    setDescription(socket.description || '');
    setLocationId(socket.locationId || '');
    setRoomId(socket.roomId || '');
    setWallPosition(socket.wallPosition || '');
    setOutletNumber(socket.outletNumber || '');
    setSocketType(socket.socketType || 'ethernet');
    setPortCount(socket.portCount || 1);
    setIsActive(socket.isActive);
    setDialogOpen(true);
  };

  // Löschen einer Netzwerkdose
  const handleDelete = async (socket: NetworkOutlet) => {
    try {
      await settingsApi.deleteNetworkOutlet(socket.id);

      // Nach erfolgreichem Löschen die Liste aktualisieren
      const updatedSockets = networkSockets.filter(s => s.id !== socket.id);
      setNetworkSockets(updatedSockets);

      setSnackbar({
        open: true,
        message: `Netzwerkdose "${socket.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Netzwerkdose: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
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
        setName(socket.name || '');
        setDescription(socket.description || '');
        setLocationId(socket.locationId || '');
        setRoomId(socket.roomId || '');
        setWallPosition(socket.wallPosition || '');
        setOutletNumber(socket.outletNumber || '');
        setSocketType(socket.socketType || 'ethernet');
        setPortCount(socket.portCount || 1);
        setIsActive(socket.isActive);
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
        handleDelete(socket);
      }
      handleContextMenuClose();
    }
  };

  // Speichern der Netzwerkdose
  const handleSave = async () => {
    // Validierung
    const trimmedOutletNumber = outletNumber.trim();

    if (!trimmedOutletNumber) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie eine Dosennummer ein.',
        severity: 'error'
      });
      return;
    }

    const socketData = {
      description,
      locationId: locationId ? Number(locationId) : undefined,
      roomId: roomId ? Number(roomId) : undefined,
      wallPosition: wallPosition || undefined,
      outletNumber: trimmedOutletNumber,
      socketNumber: trimmedOutletNumber,
      outlet_number: trimmedOutletNumber,
      socketType,
      portCount,
      isActive
    };

    // Debug-Ausgabe, um zu prüfen, was gesendet wird
    console.log('Sende Daten an API:', socketData);

    try {
      if (editMode && currentSocket) {
        // Bestehende Netzwerkdose aktualisieren
        const response = await settingsApi.updateNetworkOutlet(currentSocket.id, socketData);

        // Liste der Netzwerkdosen aktualisieren
        const updatedSockets = networkSockets.map(s =>
          s.id === currentSocket.id ? response.data as NetworkOutlet : s
        );

        setNetworkSockets(updatedSockets);
        setSnackbar({
          open: true,
          message: `Netzwerkdose "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neue Netzwerkdose erstellen
        const response = await settingsApi.createNetworkOutlet(socketData);

        // Neue Netzwerkdose zur Liste hinzufügen
        setNetworkSockets([...networkSockets, response.data as NetworkOutlet]);
        setSnackbar({
          open: true,
          message: `Netzwerkdose "${name}" wurde erstellt.`,
          severity: 'success'
        });
      }

      // Dialog schließen
      setDialogOpen(false);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern der Netzwerkdose: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Behandeln der Standortänderung
  const handleLocationChange = (event: SelectChangeEvent<number | ''>) => {
    const newLocationId = event.target.value as number | '';
    setLocationId(newLocationId);
    // Wenn Standort geändert wird, setzen wir den Raum zurück
    setRoomId('');
  };

  // Gefilterte Räume basierend auf dem ausgewählten Standort
  const filteredRooms = locationId
    ? rooms.filter(room => room.locationId === locationId)
    : rooms;

  // Spalten für die Tabelle
  const columns: AtlasColumn<NetworkOutlet>[] = [
    { dataKey: 'id', label: 'ID', width: 70, numeric: true },
    { dataKey: 'name', label: 'Bezeichnung' },
    {
      dataKey: 'outletNumber',
      label: 'Dosennummer',
      width: 150
    },
    {
      dataKey: 'locationId',
      label: 'Standort',
      render: (value) => {
        if (!value) return '-';
        const location = locations.find(l => l.id === value);
        return location ? location.name : `ID: ${value}`;
      }
    },
    {
      dataKey: 'roomId',
      label: 'Raum',
      render: (value) => {
        if (!value) return '-';
        const room = rooms.find(r => r.id === value);
        return room ? room.name : `ID: ${value}`;
      }
    },
    { dataKey: 'wallPosition', label: 'Position an Wand' },
    {
      dataKey: 'socketType',
      label: 'Typ',
      width: 120,
      render: (value) => {
        const types: Record<string, { label: string, color: 'primary' | 'secondary' | 'success' | 'warning' }> = {
          'ethernet': { label: 'Ethernet', color: 'primary' },
          'fiber': { label: 'LWL', color: 'secondary' },
          'coaxial': { label: 'Koaxial', color: 'warning' }
        };

        const type = types[value as string] || { label: value as string, color: 'primary' };

        return (
          <Chip
            label={type.label}
            color={type.color}
            size="small"
            variant="outlined"
          />
        );
      }
    },
    {
      dataKey: 'portCount',
      label: 'Ports',
      width: 80,
      numeric: true
    },
    {
      dataKey: 'isActive',
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
          {readOnly ? `Netzwerkdose anzeigen: ${currentSocket?.name}` :
            (editMode ? `Netzwerkdose bearbeiten: ${currentSocket?.name}` : 'Neue Netzwerkdose erstellen')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="z.B. ND-101-01"
              InputProps={{
                readOnly: readOnly
              }}
            />

            <TextField
              label="Dosennummer"
              fullWidth
              margin="normal"
              variant="outlined"
              disabled={readOnly}
              required
              value={outletNumber}
              onChange={(e) => setOutletNumber(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WallPositionIcon />
                  </InputAdornment>
                )
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

            <FormControl fullWidth disabled={readOnly}>
              <InputLabel id="location-label">Standort</InputLabel>
              <Select
                labelId="location-label"
                label="Standort"
                value={locationId}
                onChange={handleLocationChange}
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

            <TextField
              label="Position an der Wand"
              fullWidth
              value={wallPosition}
              onChange={(e) => setWallPosition(e.target.value)}
              placeholder="z.B. Links neben Tür"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WallPositionIcon />
                  </InputAdornment>
                ),
                readOnly: readOnly
              }}
            />

            <FormControl fullWidth disabled={readOnly}>
              <InputLabel id="socket-type-label">Dosen-Typ</InputLabel>
              <Select
                labelId="socket-type-label"
                label="Dosen-Typ"
                value={socketType}
                onChange={(e) => setSocketType(e.target.value)}
              >
                <MenuItem value="ethernet">Ethernet</MenuItem>
                <MenuItem value="fiber">LWL (Glasfaser)</MenuItem>
                <MenuItem value="coaxial">Koaxial</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Anzahl Ports"
              fullWidth
              type="number"
              value={portCount}
              onChange={(e) => setPortCount(parseInt(e.target.value) || 1)}
              InputProps={{
                readOnly: readOnly,
                inputProps: { min: 1, max: 48 }
              }}
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
