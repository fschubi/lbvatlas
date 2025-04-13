import React, { useState } from 'react';
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  IconButton,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import AtlasAppBar from '../../components/AtlasAppBar';
import NetworkOutletTable from '../../components/NetworkOutletTable';
import networkOutletService from '../../services/networkOutletService';
import { settingsApi } from '../../utils/api';
import { NetworkOutlet, Location, Room } from '../../types/settings';

const NetworkOutletsPage: React.FC = () => {
  // State für die Locations und Rooms
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // State für den Dialog
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentOutlet, setCurrentOutlet] = useState<NetworkOutlet | null>(null);

  // State für die Formularfelder
  const [formData, setFormData] = useState<Partial<NetworkOutlet>>({
    name: '',
    description: '',
    locationId: undefined,
    roomId: undefined,
    outletNumber: '',
    socketNumber: '',
    wallPosition: '',
    socketType: 'ethernet',
    isActive: true
  });

  // State für Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Filter für Rooms basierend auf ausgewähltem Standort
  const filteredRooms = formData.locationId
    ? rooms.filter(room => room.locationId === formData.locationId)
    : rooms;

  // Laden der Locations und Rooms
  const loadLocationsAndRooms = async () => {
    setLoading(true);
    try {
      const [locationsResponse, roomsResponse] = await Promise.all([
        settingsApi.getAllLocations(),
        settingsApi.getAllRooms()
      ]);

      setLocations(locationsResponse.data);
      setRooms(roomsResponse.data);
    } catch (error) {
      console.error('Fehler beim Laden von Standorten und Räumen:', error);
      showSnackbar('Fehler beim Laden von Standorten und Räumen', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dialog für neue Netzwerkdose öffnen
  const handleAddNew = async () => {
    setEditMode(false);
    setViewMode(false);
    setCurrentOutlet(null);
    resetForm();
    await loadLocationsAndRooms();
    setDialogOpen(true);
  };

  // Bearbeiten-Dialog öffnen
  const handleEdit = async (outlet: NetworkOutlet) => {
    setEditMode(true);
    setViewMode(false);
    setCurrentOutlet(outlet);
    setFormData(outlet);
    await loadLocationsAndRooms();
    setDialogOpen(true);
  };

  // Ansicht-Dialog öffnen
  const handleView = async (outlet: NetworkOutlet) => {
    setEditMode(false);
    setViewMode(true);
    setCurrentOutlet(outlet);
    setFormData(outlet);
    await loadLocationsAndRooms();
    setDialogOpen(true);
  };

  // Löschdialog bestätigen
  const handleDelete = async (outlet: NetworkOutlet) => {
    if (window.confirm(`Möchten Sie die Netzwerkdose ${outlet.outletNumber} wirklich löschen?`)) {
      setLoading(true);
      try {
        await networkOutletService.deleteNetworkOutlet(outlet.id);
        showSnackbar('Netzwerkdose erfolgreich gelöscht', 'success');
        // Komponente neu rendern, um aktualisierte Daten zu zeigen
        setFormData({...formData}); // Trick, um useEffect zu triggern
      } catch (error) {
        console.error('Fehler beim Löschen der Netzwerkdose:', error);
        showSnackbar('Fehler beim Löschen der Netzwerkdose', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      locationId: undefined,
      roomId: undefined,
      outletNumber: '',
      socketNumber: '',
      wallPosition: '',
      socketType: 'ethernet',
      isActive: true
    });
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setViewMode(false);
    setCurrentOutlet(null);
  };

  // Eingabeänderungen für TextField und Switch verarbeiten
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Select-Änderungen verarbeiten
  const handleSelectChange = (e: SelectChangeEvent<string | number>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Speichern der Netzwerkdose
  const handleSave = async () => {
    // Validierung
    if (!formData.outletNumber) {
      showSnackbar('Bitte geben Sie eine Dosennummer ein', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editMode && currentOutlet) {
        // Aktualisieren einer vorhandenen Netzwerkdose
        await networkOutletService.updateNetworkOutlet(currentOutlet.id, formData);
        showSnackbar('Netzwerkdose erfolgreich aktualisiert', 'success');
      } else {
        // Erstellen einer neuen Netzwerkdose
        await networkOutletService.createNetworkOutlet(formData);
        showSnackbar('Netzwerkdose erfolgreich erstellt', 'success');
      }
      handleCloseDialog();
      // Trigger für Neuladen der Daten
      setFormData({...formData});
    } catch (error) {
      console.error('Fehler beim Speichern der Netzwerkdose:', error);
      showSnackbar('Fehler beim Speichern der Netzwerkdose', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Snackbar anzeigen
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Sidebar Toggle (für AtlasAppBar)
  const handleToggleSidebar = () => {
    // Diese Funktion würde normalerweise die Sidebar ein-/ausklappen
    console.log('Sidebar toggle clicked');
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AtlasAppBar onMenuClick={handleToggleSidebar} />

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Netzwerkdosen
          </Typography>

          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
              sx={{ mr: 1 }}
            >
              Neue Netzwerkdose
            </Button>
            <IconButton
              onClick={() => setFormData({...formData})}
              color="primary"
              title="Daten aktualisieren"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <NetworkOutletTable
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            heightPx={500}
          />
        </Paper>
      </Box>

      {/* Dialog für Erstellen/Bearbeiten/Anzeigen */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {viewMode
            ? `Netzwerkdose anzeigen: ${currentOutlet?.outletNumber || ''}`
            : editMode
              ? `Netzwerkdose bearbeiten: ${currentOutlet?.outletNumber || ''}`
              : 'Neue Netzwerkdose erstellen'
          }
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="outletNumber"
                label="Dosennummer *"
                fullWidth
                value={formData.outletNumber || ''}
                onChange={handleInputChange}
                disabled={viewMode}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="socketNumber"
                label="Sockelnummer"
                fullWidth
                value={formData.socketNumber || ''}
                onChange={handleInputChange}
                disabled={viewMode}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Standort</InputLabel>
                <Select
                  name="locationId"
                  value={formData.locationId || ''}
                  onChange={handleSelectChange}
                  disabled={viewMode}
                  label="Standort"
                >
                  <MenuItem value="">
                    <em>Keiner</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Raum</InputLabel>
                <Select
                  name="roomId"
                  value={formData.roomId || ''}
                  onChange={handleSelectChange}
                  disabled={viewMode || !formData.locationId}
                  label="Raum"
                >
                  <MenuItem value="">
                    <em>Keiner</em>
                  </MenuItem>
                  {filteredRooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      {room.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                name="wallPosition"
                label="Position an der Wand"
                fullWidth
                value={formData.wallPosition || ''}
                onChange={handleInputChange}
                disabled={viewMode}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Steckertyp</InputLabel>
                <Select
                  name="socketType"
                  value={formData.socketType || 'ethernet'}
                  onChange={handleSelectChange}
                  disabled={viewMode}
                  label="Steckertyp"
                >
                  <MenuItem value="ethernet">Ethernet</MenuItem>
                  <MenuItem value="fiber">Glasfaser</MenuItem>
                  <MenuItem value="coaxial">Koaxial</MenuItem>
                  <MenuItem value="other">Sonstige</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Beschreibung"
                fullWidth
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={handleInputChange}
                disabled={viewMode}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={formData.isActive === undefined ? true : formData.isActive}
                    onChange={handleInputChange}
                    disabled={viewMode}
                  />
                }
                label="Aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {viewMode ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!viewMode && (
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={24} /> : null}
            >
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

export default NetworkOutletsPage;
