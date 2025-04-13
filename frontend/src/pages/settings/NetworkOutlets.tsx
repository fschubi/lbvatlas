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
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Router as NetworkIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { NetworkOutlet, Location, Room } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const NetworkOutlets: React.FC = () => {
  // State für die Daten
  const [networkOutlets, setNetworkOutlets] = useState<NetworkOutlet[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentOutlet, setCurrentOutlet] = useState<NetworkOutlet | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    outletId: number;
  } | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [outletNumber, setOutletNumber] = useState<string>('');
  const [socketNumber, setSocketNumber] = useState<string>('');
  const [wallPosition, setWallPosition] = useState<string>('');
  const [socketType, setSocketType] = useState<string>('');
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

  // Spalten für die Tabelle
  const columns: AtlasColumn<NetworkOutlet>[] = [
    {
      dataKey: 'id',
      label: 'ID',
      width: 70,
      numeric: true
    },
    {
      dataKey: 'outletNumber',
      label: 'Name',
      width: 200,
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
            handleViewOutlet(row);
          }}
        >
          {value}
        </Box>
      )
    },
    {
      dataKey: 'description',
      label: 'Beschreibung',
      width: 300
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
      dataKey: 'createdAt',
      label: 'Erstellt am',
      width: 180,
      render: (value) => new Date(value).toLocaleDateString('de-DE')
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

  // Daten laden
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [outletsResponse, locationsResponse, roomsResponse] = await Promise.all([
        settingsApi.getAllNetworkOutlets(),
        settingsApi.getAllLocations(),
        settingsApi.getAllRooms()
      ]);

      // Daten setzen - leere Arrays als Standardwert, wenn keine Daten vorhanden
      setNetworkOutlets(outletsResponse?.data || []);
      setLocations(locationsResponse?.data || []);
      setRooms(roomsResponse?.data || []);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Daten: ${errorMessage}`,
        severity: 'error'
      });

      // Im Fehlerfall leere Arrays setzen, keine Mock-Daten verwenden
      setNetworkOutlets([]);
      setLocations([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentOutlet(null);
    resetForm();
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (outlet: NetworkOutlet) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentOutlet(outlet);
    setFormData(outlet);
    setDialogOpen(true);
  };

  // Outlet anzeigen
  const handleViewOutlet = (outlet: NetworkOutlet) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentOutlet(outlet);
    setFormData(outlet);
    setDialogOpen(true);
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setName('');
    setDescription('');
    setLocationId('');
    setRoomId('');
    setOutletNumber('');
    setSocketNumber('');
    setWallPosition('');
    setSocketType('');
    setPortCount(1);
    setIsActive(true);
  };

  // Formulardaten setzen
  const setFormData = (outlet: NetworkOutlet) => {
    setName(outlet.name || '');
    setDescription(outlet.description);
    setLocationId(outlet.locationId || '');
    setRoomId(outlet.roomId || '');
    setOutletNumber(outlet.outletNumber);
    setSocketNumber(outlet.socketNumber || '');
    setWallPosition(outlet.wallPosition || '');
    setSocketType(outlet.socketType || '');
    setPortCount(outlet.portCount || 1);
    setIsActive(outlet.isActive);
  };

  // Speichern
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const outletData = {
      name,
      description,
      locationId: locationId as number,
      roomId: roomId as number,
      outletNumber,
      socketNumber,
      wallPosition,
      socketType,
      portCount,
      isActive
    };

    try {
      setLoading(true);
      if (editMode && currentOutlet) {
        await settingsApi.updateNetworkOutlet(currentOutlet.id, outletData);
      } else {
        await settingsApi.createNetworkOutlet(outletData);
      }

      loadData();
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: `Netzwerkdose wurde erfolgreich ${editMode ? 'aktualisiert' : 'erstellt'}.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim ${editMode ? 'Aktualisieren' : 'Erstellen'} der Netzwerkdose: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Formularvalidierung
  const validateForm = (): boolean => {
    if (!outletNumber.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie eine Dosennummer ein.',
        severity: 'error'
      });
      return false;
    }
    if (!locationId) {
      setSnackbar({
        open: true,
        message: 'Bitte wählen Sie einen Standort aus.',
        severity: 'error'
      });
      return false;
    }
    if (!roomId) {
      setSnackbar({
        open: true,
        message: 'Bitte wählen Sie einen Raum aus.',
        severity: 'error'
      });
      return false;
    }
    return true;
  };

  // Löschen
  const handleDelete = async (outlet: NetworkOutlet) => {
    if (!window.confirm(`Möchten Sie die Netzwerkdose "${outlet.outletNumber}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await settingsApi.deleteNetworkOutlet(outlet.id);
      loadData();
      setSnackbar({
        open: true,
        message: `Netzwerkdose "${outlet.outletNumber}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Netzwerkdose: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Kontextmenü Handler
  const handleContextMenu = (event: React.MouseEvent, outletId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      outletId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const outlet = networkOutlets.find(o => o.id === contextMenu.outletId);
      if (outlet) {
        handleViewOutlet(outlet);
      }
    }
    handleContextMenuClose();
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const outlet = networkOutlets.find(o => o.id === contextMenu.outletId);
      if (outlet) {
        handleEdit(outlet);
      }
    }
    handleContextMenuClose();
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const outlet = networkOutlets.find(o => o.id === contextMenu.outletId);
      if (outlet) {
        handleDelete(outlet);
      }
    }
    handleContextMenuClose();
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
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
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          mb: 3,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Typography variant="h5" component="h1">
          Netzwerkdosenverwaltung
        </Typography>
      </Paper>

      {/* Aktionsleiste */}
      <Box sx={{ mb: 3 }}>
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
            rows={networkOutlets}
            heightPx={600}
            emptyMessage="Keine Netzwerkdosen vorhanden"
            initialSortColumn="id"
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
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {readOnly
            ? `Netzwerkdose anzeigen: ${currentOutlet?.outletNumber}`
            : editMode
            ? `Netzwerkdose bearbeiten: ${currentOutlet?.outletNumber}`
            : 'Neue Netzwerkdose erstellen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              {/* Basis-Informationen */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Dosennummer"
                  fullWidth
                  required
                  value={outletNumber}
                  onChange={(e) => setOutletNumber(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>

              {/* Standort und Raum */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Standort</InputLabel>
                  <Select
                    value={locationId}
                    onChange={(e: SelectChangeEvent<number | ''>) => {
                      const value = e.target.value;
                      if (typeof value === 'string') {
                        const parsed = parseInt(value, 10);
                        setLocationId(isNaN(parsed) ? '' : parsed);
                      } else {
                        setLocationId(value);
                      }
                    }}
                    label="Standort"
                    disabled={readOnly}
                  >
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Raum</InputLabel>
                  <Select
                    value={roomId}
                    onChange={(e: SelectChangeEvent<number | ''>) => {
                      const value = e.target.value;
                      if (typeof value === 'string') {
                        const parsed = parseInt(value, 10);
                        setRoomId(isNaN(parsed) ? '' : parsed);
                      } else {
                        setRoomId(value);
                      }
                    }}
                    label="Raum"
                    disabled={readOnly}
                  >
                    {rooms
                      .filter((room) => !locationId || room.locationId === locationId)
                      .map((room) => (
                        <MenuItem key={room.id} value={room.id}>
                          {room.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Technische Details */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Anschlussnummer"
                  fullWidth
                  value={socketNumber}
                  onChange={(e) => setSocketNumber(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Position"
                  fullWidth
                  value={wallPosition}
                  onChange={(e) => setWallPosition(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Anschlusstyp"
                  fullWidth
                  value={socketType}
                  onChange={(e) => setSocketType(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Anzahl Ports"
                  fullWidth
                  type="number"
                  value={portCount}
                  onChange={(e) => setPortCount(parseInt(e.target.value) || 1)}
                  InputProps={{
                    readOnly: readOnly,
                    inputProps: { min: 1 }
                  }}
                />
              </Grid>

              {/* Beschreibung */}
              <Grid item xs={12}>
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
              </Grid>

              {/* Status */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <MuiSwitch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label="Netzwerkdose aktiv"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {readOnly ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NetworkOutlets;
