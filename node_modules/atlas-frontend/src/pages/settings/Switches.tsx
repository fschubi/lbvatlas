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
  SelectChangeEvent,
  Autocomplete,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Router as RouterIcon,
  Business as BuildingIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { Switch, Location, Manufacturer, Room } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const Switches: React.FC = () => {
  // State für die Daten
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentSwitch, setCurrentSwitch] = useState<Switch | null>(null);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [manufacturerId, setManufacturerId] = useState<number | ''>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [macAddress, setMacAddress] = useState<string>('');
  const [managementUrl, setManagementUrl] = useState<string>('');
  const [locationId, setLocationId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [cabinetId, setCabinetId] = useState<number | ''>('');
  const [rackPosition, setRackPosition] = useState<string>('');
  const [portCount, setPortCount] = useState<number | ''>('');
  const [uplinkPort, setUplinkPort] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [readOnly, setReadOnly] = useState<boolean>(false);

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

  // Neuer State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    switchId: number;
  } | null>(null);

  // Spalten für die Tabelle
  const columns: AtlasColumn<Switch>[] = [
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
            handleViewSwitch(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
    { dataKey: 'model', label: 'Modell', width: 140 },
    { dataKey: 'manufacturer_name', label: 'Hersteller', width: 140 },
    { dataKey: 'ip_address', label: 'IP-Adresse', width: 120 },
    { dataKey: 'location_name', label: 'Standort', width: 140 },
    { dataKey: 'room_name', label: 'Raum', width: 140 },
    {
      dataKey: 'isActive',
      label: 'Status',
      width: 120,
      render: (value, row) => (
        <Chip
          label={row.isActive ? 'Aktiv' : 'Inaktiv'}
          color={row.isActive ? 'success' : 'default'}
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
        const dateValue = row.created_at;

        if (!dateValue) {
          return 'Unbekannt';
        }

        try {
          const date = new Date(dateValue);

          if (isNaN(date.getTime())) {
            return 'Ungültiges Datum';
          }

          return new Intl.DateTimeFormat('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }).format(date);
        } catch (e) {
          console.error('Fehler beim Parsen des Datums:', e);
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

  // Daten laden
  useEffect(() => {
    loadSwitches();
    loadLocations();
    loadManufacturers();
    loadRooms();
  }, []);

  // Wenn sich der Standort ändert, filtern wir die Räume
  useEffect(() => {
    if (locationId) {
      const location = Number(locationId);
      setFilteredRooms(rooms.filter(room => room.location_id === location || room.locationId === location));
    } else {
      setFilteredRooms([]);
    }

    // Wenn ein Standort ausgewählt wird, aber kein Raum darin verfügbar ist,
    // geben wir einen Hinweis aus
    if (locationId && rooms.length > 0 && filteredRooms.length === 0) {
      console.log(`Keine Räume für den ausgewählten Standort gefunden.`);
    }
  }, [locationId, rooms]);

  const loadSwitches = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getAllSwitches();
      if (response && response.data) {
        setSwitches(response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Switches: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
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

  const loadManufacturers = async () => {
    try {
      const response = await settingsApi.getAllManufacturers();
      if (response && response.data) {
        setManufacturers(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Hersteller:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await settingsApi.getAllRooms();
      if (response && response.data) {
        setRooms(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Räume:', error);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentSwitch(null);
    resetForm();
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (switchItem: Switch) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentSwitch(switchItem);
    fillFormWithSwitch(switchItem);
    setDialogOpen(true);
  };

  // Löschen eines Switches
  const handleDelete = async (switchItem: Switch) => {
    if (!window.confirm(`Möchten Sie den Switch "${switchItem.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await settingsApi.deleteSwitch(switchItem.id);

      // Nach erfolgreichem Löschen die Liste aktualisieren
      loadSwitches();

      setSnackbar({
        open: true,
        message: `Switch "${switchItem.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      setLoading(false);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Switches: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Switches
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

    // MAC-Adresse validieren, wenn angegeben
    if (macAddress && !validateMacAddress(macAddress)) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie eine gültige MAC-Adresse ein (Format: xx:xx:xx:xx:xx:xx oder xx-xx-xx-xx-xx-xx).',
        severity: 'error'
      });
      return;
    }

    const switchData = {
      name,
      description,
      model,
      manufacturerId: manufacturerId || undefined,
      ipAddress,
      macAddress,
      managementUrl,
      locationId: locationId || undefined,
      roomId: roomId || undefined,
      cabinetId: cabinetId || undefined,
      rackPosition,
      portCount: portCount || undefined,
      uplinkPort,
      notes,
      isActive
    };

    try {
      setLoading(true);

      if (editMode && currentSwitch) {
        // Bestehenden Switch aktualisieren
        await settingsApi.updateSwitch(currentSwitch.id, switchData);

        // Liste der Switches aktualisieren
        loadSwitches();

        setSnackbar({
          open: true,
          message: `Switch "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neuen Switch erstellen
        await settingsApi.createSwitch(switchData);

        // Liste der Switches aktualisieren
        loadSwitches();

        setSnackbar({
          open: true,
          message: `Switch "${name}" wurde erstellt.`,
          severity: 'success'
        });
      }

      // Dialog schließen
      setDialogOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern des Switches: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Validierung für MAC-Adresse
  const validateMacAddress = (mac: string): boolean => {
    // Regex für die Formate xx:xx:xx:xx:xx:xx oder xx-xx-xx-xx-xx-xx
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setName('');
    setDescription('');
    setModel('');
    setManufacturerId('');
    setIpAddress('');
    setMacAddress('');
    setManagementUrl('');
    setLocationId('');
    setRoomId('');
    setCabinetId('');
    setRackPosition('');
    setPortCount('');
    setUplinkPort('');
    setNotes('');
    setIsActive(true);
  };

  // Formular mit Switch-Daten füllen
  const fillFormWithSwitch = (switchItem: Switch) => {
    setName(switchItem.name);
    setDescription(switchItem.description || '');
    setModel(switchItem.model || '');
    setManufacturerId(switchItem.manufacturer_id || '');
    setIpAddress(switchItem.ip_address || '');
    setMacAddress(switchItem.mac_address || '');
    setManagementUrl(switchItem.management_url || '');
    setLocationId(switchItem.location_id || '');
    setRoomId(switchItem.room_id || '');
    setCabinetId(switchItem.cabinet_id || '');
    setRackPosition(switchItem.rack_position || '');
    setPortCount(switchItem.port_count || '');
    setUplinkPort(switchItem.uplink_port || '');
    setNotes(switchItem.notes || '');
    setIsActive(switchItem.is_active !== false);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, switchId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      switchId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) {
        setEditMode(false);
        setReadOnly(true);
        setCurrentSwitch(switchItem);
        fillFormWithSwitch(switchItem);
        setDialogOpen(true);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) {
        handleEdit(switchItem);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) {
        handleDelete(switchItem);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige des Switches beim Klick auf den Namen
  const handleViewSwitch = (switchItem: Switch) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentSwitch(switchItem);
    fillFormWithSwitch(switchItem);
    setDialogOpen(true);
  };

  // Handler für Änderungen bei Select-Feldern
  const handleManufacturerChange = (event: SelectChangeEvent<number | string>) => {
    setManufacturerId(event.target.value as number | '');
  };

  const handleLocationChange = (_: React.SyntheticEvent, newValue: Location | null) => {
    setLocationId(newValue ? newValue.id : '');
    // Wenn sich der Standort ändert, setzen wir den Raum zurück
    setRoomId('');
  };

  const handleRoomChange = (event: SelectChangeEvent<number | string>) => {
    setRoomId(event.target.value as number | '');
  };

  const handlePortCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Nur numerische Eingaben oder leere Zeichenfolgen akzeptieren
    const value = event.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setPortCount(value === '' ? '' : parseInt(value, 10));
    }
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
            Switch-Verwaltung
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
          Neuer Switch
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
            rows={switches}
            heightPx={600}
            emptyMessage="Keine Switches vorhanden"
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

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {readOnly
            ? `Switch anzeigen: ${currentSwitch?.name}`
            : (editMode
              ? `Switch bearbeiten: ${currentSwitch?.name}`
              : 'Neuen Switch erstellen'
            )
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              {/* Erste Zeile */}
              <Grid item xs={12} md={6}>
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
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Modell"
                  fullWidth
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>

              {/* Zweite Zeile */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={readOnly}>
                  <InputLabel id="manufacturer-select-label">Hersteller</InputLabel>
                  <Select
                    labelId="manufacturer-select-label"
                    id="manufacturer-select"
                    value={manufacturerId}
                    label="Hersteller"
                    onChange={handleManufacturerChange}
                  >
                    <MenuItem value="">
                      <em>Kein Hersteller</em>
                    </MenuItem>
                    {manufacturers.map((manufacturer) => (
                      <MenuItem key={manufacturer.id} value={manufacturer.id}>
                        {manufacturer.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  id="location-autocomplete"
                  options={locations}
                  getOptionLabel={(option) => option.name}
                  value={locations.find(loc => loc.id === locationId) || null}
                  onChange={handleLocationChange}
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
              </Grid>

              {/* Neue Zeile für Raumauswahl */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!locationId || readOnly}>
                  <InputLabel id="room-select-label">Raum</InputLabel>
                  <Select
                    labelId="room-select-label"
                    id="room-select"
                    value={roomId}
                    label="Raum"
                    onChange={handleRoomChange}
                  >
                    <MenuItem value="">
                      <em>Kein Raum</em>
                    </MenuItem>
                    {filteredRooms.length > 0 ? (
                      filteredRooms.map((room: Room) => (
                        <MenuItem key={room.id} value={room.id}>
                          {room.name} {room.floor ? `(${room.floor})` : ''}
                        </MenuItem>
                      ))
                    ) : (
                      locationId ? (
                        <MenuItem disabled>
                          <em>Keine Räume für diesen Standort verfügbar</em>
                        </MenuItem>
                      ) : null
                    )}
                  </Select>
                  {locationId && filteredRooms.length === 0 && !readOnly && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      Bitte fügen Sie zuerst Räume für diesen Standort hinzu.
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Rack-Position"
                  fullWidth
                  value={rackPosition}
                  onChange={(e) => setRackPosition(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>

              {/* Netzwerk-Zeile */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="IP-Adresse"
                  fullWidth
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="MAC-Adresse"
                  fullWidth
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  placeholder="Format: xx:xx:xx:xx:xx:xx"
                  error={macAddress !== '' && !validateMacAddress(macAddress)}
                  helperText={
                    macAddress !== '' && !validateMacAddress(macAddress)
                      ? "Ungültiges Format (z.B. 00:1A:2B:3C:4D:5E)"
                      : ""
                  }
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>

              {/* Management-Zeile */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Management URL"
                  fullWidth
                  value={managementUrl}
                  onChange={(e) => setManagementUrl(e.target.value)}
                  placeholder="https://..."
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
                  onChange={handlePortCountChange}
                  InputProps={{
                    readOnly: readOnly,
                    inputProps: { min: 1 }
                  }}
                />
              </Grid>

              {/* Uplink-Zeile */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Uplink-Port"
                  fullWidth
                  value={uplinkPort}
                  onChange={(e) => setUplinkPort(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                {/* Platzhalter für Symmetrie */}
              </Grid>

              {/* Beschreibung und Notizen */}
              <Grid item xs={12}>
                <TextField
                  label="Beschreibung"
                  fullWidth
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notizen"
                  fullWidth
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                      color="primary"
                      disabled={readOnly}
                    />
                  }
                  label="Switch aktiv"
                />
              </Grid>
            </Grid>
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
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default Switches;
