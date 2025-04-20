import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch as MuiSwitch,
  InputAdornment,
  Autocomplete,
  Link as MuiLink,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Router as SwitchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  AccountTree as ManufacturerIcon,
  LocationOn as LocationIcon,
  MeetingRoom as RoomIcon,
  Notes as NotesIcon,
  SettingsEthernet as EthernetIcon,
  Inventory as CabinetIcon,
  Height as RackPositionIcon,
} from '@mui/icons-material';
import { locationApi, manufacturerApi, roomApi, switchApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { Location, Manufacturer } from '../../types/settings';
import { Room } from '../../types/settings';
import { Switch, SwitchCreate, SwitchUpdate } from '../../types/network';
import { useAuth } from '../../context/AuthContext';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { ApiResponse } from '../../utils/api';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';

interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

// Type für Sortierkonfiguration
interface SortConfig {
  column: keyof (Switch & { locationName?: string, roomName?: string, manufacturerName?: string }) | null;
  direction: 'asc' | 'desc';
}

const defaultLocation: Location = { id: 0, name: '', description: '', address: '', city: '', postalCode: '', country: '', createdAt: '', updatedAt: '', isActive: true };
const defaultRoom: Room = { id: 0, name: '', description: '', locationId: 0, createdAt: '', updatedAt: '', active: true };
const defaultManufacturer: Manufacturer = { id: 0, name: '', description: '', website: '', contactEmail: '', contactPhone: '', isActive: true, createdAt: '', updatedAt: '' };

const Switches: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentSwitch, setCurrentSwitch] = useState<Switch | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info'; }>({ open: false, message: '', severity: 'info' });
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; switchId: number; } | null>(null);
  const [name, setName] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [description, setDescription] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<FormField<Manufacturer | null>>({ value: null, error: false, helperText: '' });
  const [model, setModel] = useState<string>('');
  const [location, setLocation] = useState<FormField<Location | null>>({ value: null, error: false, helperText: '' });
  const [room, setRoom] = useState<FormField<Room | null>>({ value: null, error: false, helperText: '' });
  const [cabinetLabel, setCabinetLabel] = useState<string>('');
  const [rackPosition, setRackPosition] = useState<string>('');
  const [portCount, setPortCount] = useState<FormField<number | ''>>({ value: '', error: false, helperText: '' });
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'name', direction: 'asc' }); // Initial sort by name
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [switchToDelete, setSwitchToDelete] = useState<Switch | null>(null);

  // Callback für Sortierung von AtlasTable
  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc') => {
    setSortConfig({
      column: columnKey as keyof (Switch & { locationName?: string, roomName?: string, manufacturerName?: string }),
      direction: direction
    });
  }, []);

  // Datenaufbereitung und Sortierung mit useMemo
  const processedSwitches = useMemo(() => {
    const mappedSwitches = switches.map(switchItem => ({
      ...switchItem,
      locationName: locations.find(l => l.id === switchItem.locationId)?.name || '-',
      roomName: rooms.find(r => r.id === switchItem.roomId)?.name || '-',
      manufacturerName: manufacturers.find(m => m.id === switchItem.manufacturerId)?.name || '-'
    }));

    // Sortierung anwenden
    if (sortConfig.column) {
      const sortKey = sortConfig.column;
      mappedSwitches.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        // Grundlegende Typbehandlung für Sortierung (String/Nummer)
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            comparison = aValue === bValue ? 0 : aValue ? 1 : -1; // true nach false
        } else {
            // Fallback für andere Typen oder Mischtypen (als String behandeln)
            comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortConfig.direction === 'asc' ? comparison : comparison * -1;
      });
    }

    return mappedSwitches;
  }, [switches, locations, rooms, manufacturers, sortConfig]);

  const loadRooms = async () => {
    try {
      const roomRes = await roomApi.getAll() as unknown as { success?: boolean, data?: Room[] };
      const finalRooms = roomRes && Array.isArray(roomRes.data) ? roomRes.data : [];
      setRooms(finalRooms);
    } catch (error) {
        setSnackbar({ open: true, message: `Fehler Rooms: ${handleApiError(error)}`, severity: 'error' });
        setRooms([]);
    }
  };

  const loadSwitches = async () => {
    try {
      const response = await switchApi.getAll(); // Gibt ApiResponse<Switch[]> zurück
      if (response.success && Array.isArray(response.data)) {
        setSwitches(response.data.map(s => toCamelCase(s) as Switch)); // Konvertierung hier
      } else {
        console.warn('Laden der Switches nicht erfolgreich oder Datenstruktur unerwartet:', response);
        setSnackbar({ open: true, message: response.message || 'Fehler beim Laden der Switches.', severity: 'error' });
        setSwitches([]);
      }
    } catch (error: any) {
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler Switches: ${errorMessage}`, severity: 'error' });
      setSwitches([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !initialLoadDone) {
      setLoading(true);
      const loadAllDataSequentially = async () => {
        let criticalSuccess = true;
        try {
          const locRes = await locationApi.getAll() as unknown as { success?: boolean, data?: Location[] };
          const finalLocations = locRes && Array.isArray(locRes.data) ? locRes.data : [];
          setLocations(finalLocations);
        } catch (error) {
          criticalSuccess = false;
          setLocations([]);
          setSnackbar({ open: true, message: `Fehler Locations: ${handleApiError(error)}`, severity: 'error' });
        }
        try {
          const mfgRes = await manufacturerApi.getAll() as unknown as { success?: boolean, data?: Manufacturer[] };
          const finalManufacturers = mfgRes && Array.isArray(mfgRes.data) ? mfgRes.data : [];
          setManufacturers(finalManufacturers);
        } catch (error) {
          criticalSuccess = false;
          setManufacturers([]);
          setSnackbar({ open: true, message: `Fehler Manufacturers: ${handleApiError(error)}`, severity: 'error' });
        }
        await loadRooms();
        await loadSwitches();
        return criticalSuccess;
      };
      loadAllDataSequentially()
        .then((loadedSuccessfully) => {
            setInitialLoadDone(true);
        })
        .catch((error) => {
            console.error("Fehler beim Laden der initialen Daten:", error);
            setInitialLoadDone(true);
        })
        .finally(() => {
            setLoading(false);
        });
    } else if (!isAuthenticated) {
       setSwitches([]);
       setLocations([]);
       setRooms([]);
       setManufacturers([]);
       setFilteredRooms([]);
       setInitialLoadDone(false);
       setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (location.value) {
      setFilteredRooms(rooms.filter(r => r.locationId === location.value?.id));
    } else {
      setFilteredRooms([]);
    }
    if (room.value && room.value.locationId !== location.value?.id) {
        setRoom({ value: null, error: false, helperText: '' });
    }
  }, [location.value, rooms]);

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const columns: AtlasColumn<Switch & { locationName?: string, roomName?: string, manufacturerName?: string }>[] = [
    {
      dataKey: 'name',
      label: 'Name',
      width: 200,
      sortable: true,
      render: (value, row) => (
        <Box
          sx={{ color: 'primary.main', fontWeight: 500, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={(e) => { e.stopPropagation(); handleView(row); }}
        >
          {value}
        </Box>
      )
    },
    {
        dataKey: 'locationName',
        label: 'Standort',
        width: 150,
        sortable: true,
        render: (value) => value || '-'
    },
    {
        dataKey: 'roomName',
        label: 'Raum',
        width: 120,
        sortable: true,
        render: (value) => value || '-'
    },
    {
      dataKey: 'portCount',
      label: 'Ports',
      width: 80,
      numeric: true,
      sortable: true,
    },
    {
        dataKey: 'manufacturerName',
        label: 'Hersteller',
        width: 150,
        sortable: true,
        render: (value) => value || '-'
    },
    {
      dataKey: 'model',
      label: 'Modell',
      width: 150,
      sortable: true,
      render: (value) => value || '-'
    },
    {
      dataKey: 'isActive',
      label: 'Status',
      width: 100,
      sortable: true,
      render: (value) => (
        <Chip label={value ? 'Aktiv' : 'Inaktiv'} color={value ? 'success' : 'default'} size="small" variant="outlined" />
      )
    },
    {
      dataKey: 'actions',
      label: 'Aktionen',
      width: 120,
      sortable: false,
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

  const resetForm = () => {
    setName({ value: '', error: false, helperText: '' });
    setDescription('');
    setManufacturer({ value: null, error: false, helperText: '' });
    setModel('');
    setLocation({ value: null, error: false, helperText: '' });
    setRoom({ value: null, error: false, helperText: '' });
    setCabinetLabel('');
    setRackPosition('');
    setPortCount({ value: '', error: false, helperText: '' });
    setIsActive(true);
    setNotes('');
  };

  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setName(prev => ({ ...prev, error: false, helperText: '' }));
    setManufacturer(prev => ({ ...prev, error: false, helperText: '' }));
    setLocation(prev => ({ ...prev, error: false, helperText: '' }));
    setPortCount(prev => ({ ...prev, error: false, helperText: '' }));

    if (!name.value.trim()) {
      setName({ value: name.value, error: true, helperText: 'Name ist erforderlich' });
      isValid = false;
    }
    if (!manufacturer.value) {
        setManufacturer({ value: null, error: true, helperText: 'Hersteller ist erforderlich' });
        isValid = false;
    }
    if (!location.value) {
        setLocation({ value: null, error: true, helperText: 'Standort ist erforderlich' });
        isValid = false;
    }
    if (portCount.value === '' || (typeof portCount.value === 'number' && portCount.value <= 0)) {
        setPortCount({ value: portCount.value, error: true, helperText: 'Portanzahl muss größer 0 sein' });
        isValid = false;
    }

    if (name.value.trim() && isValid && !viewMode) {
      try {
        const nameExists = await switchApi.checkSwitchNameExists(
            name.value.trim(),
            editMode ? currentSwitch?.id : undefined
        );
        if (nameExists) {
          setName({ value: name.value, error: true, helperText: 'Ein Switch mit diesem Namen existiert bereits' });
          isValid = false;
        }
      } catch (error) {
        console.error("Fehler bei der Namensprüfung:", error);
        setName({ value: name.value, error: true, helperText: 'Fehler bei der Namensprüfung' });
        isValid = false;
      }
    }

    return isValid;
  };

  const handleAddNew = () => {
    resetForm();
    setEditMode(false);
    setViewMode(false);
    setCurrentSwitch(null);
    setDialogOpen(true);
  };

  const handleEdit = (switchItem: Switch) => {
    resetForm();
    setEditMode(true);
    setViewMode(false);
    setCurrentSwitch(switchItem);

    setName({ value: switchItem.name, error: false, helperText: '' });
    setDescription(switchItem.description || '');
    const currentMfg = manufacturers.find(m => m.id === switchItem.manufacturerId) || null;
    setManufacturer({ value: currentMfg, error: false, helperText: '' });
    setModel(switchItem.model || '');
    const currentLoc = locations.find(l => l.id === switchItem.locationId) || null;
    setLocation({ value: currentLoc, error: false, helperText: '' });
    const currentFilteredRooms = currentLoc ? rooms.filter(r => r.locationId === currentLoc.id) : [];
    const currentRoom = currentFilteredRooms.find(r => r.id === switchItem.roomId) || null;
    setRoom({ value: currentRoom, error: false, helperText: '' });
    setCabinetLabel(switchItem.cabinetLabel || '');
    setRackPosition(switchItem.rackPosition?.toString() || '');
    setPortCount({ value: switchItem.portCount ?? '', error: false, helperText: '' });
    setIsActive(switchItem.isActive);
    setNotes(switchItem.notes || '');

    setDialogOpen(true);
  };

  const handleView = (switchItem: Switch) => {
    handleEdit(switchItem);
    setViewMode(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    if (!manufacturer.value || !location.value) {
        setSnackbar({ open: true, message: 'Fehler: Hersteller oder Standort fehlt.', severity: 'error' });
        return;
    }

    const switchData: Omit<SwitchCreate | SwitchUpdate, 'id' | 'ipAddress' | 'macAddress' | 'managementUrl' | 'uplinkPort'> & { ipAddress?: string | null, macAddress?: string | null, managementUrl?: string | null, uplinkPort?: string | null } = {
      name: name.value.trim(),
      description: description.trim() || null,
      manufacturerId: manufacturer.value.id,
      model: model.trim() || null,
      locationId: location.value.id,
      roomId: room.value?.id || null,
      cabinetLabel: cabinetLabel,
      rackPosition: rackPosition ? parseInt(rackPosition) : null,
      portCount: typeof portCount.value === 'number' ? portCount.value : 0,
      isActive: isActive,
      notes: notes.trim() || null,
    };

    setLoading(true);
    try {
      let response: ApiResponse<Switch>; // Typ für die Antwort definieren
      if (editMode && currentSwitch) {
        response = await switchApi.update(currentSwitch.id, switchData as SwitchUpdate);
        // Verwende Namen aus switchData
        setSnackbar({ open: true, message: response.message || `Switch "${switchData.name}" erfolgreich aktualisiert.`, severity: 'success' });
      } else {
        response = await switchApi.create(switchData as SwitchCreate);
        // Verwende Namen aus switchData
        setSnackbar({ open: true, message: response.message || `Switch "${switchData.name}" erfolgreich erstellt.`, severity: 'success' });
      }

      // Prüfe response.success
      if (response.success) {
        await loadSwitches(); // await hinzufügen
        handleCloseDialog();
      } else {
        // Fehlerfall, wenn success: false vom Backend kommt
        setSnackbar({ open: true, message: response.message || 'Fehler beim Speichern des Switches.', severity: 'error' });
         if (response.message?.toLowerCase().includes('existiert bereits')) {
             setName(prev => ({ ...prev, error: true, helperText: response.message || 'Fehler' }));
         }
      }
    } catch (error: any) {
      // Fehler vom apiRequest (Netzwerk etc.)
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
      if (errorMessage.toLowerCase().includes('existiert bereits')) {
         setName(prev => ({ ...prev, error: true, helperText: errorMessage }));
      }
    } finally {
        setLoading(false);
    }
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (switchToDel: Switch) => {
    setSwitchToDelete(switchToDel);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
    if (!switchToDelete) return;

    setConfirmDialogOpen(false); // Close dialog first
    const switchName = switchToDelete.name; // Store name

    setLoading(true);
    try {
      await switchApi.delete(switchToDelete.id);
      setSnackbar({ open: true, message: `Switch "${switchName}" wurde gelöscht.`, severity: 'success' });
      await loadSwitches(); // Reload data
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
        setLoading(false);
        setSwitchToDelete(null); // Clear the switch to delete
    }
  };

   // Step 3: Close confirmation dialog without deleting
   const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setSwitchToDelete(null);
   };

  const handleContextMenu = (event: React.MouseEvent, switchId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, switchId });
  };

  const handleContextMenuClose = () => setContextMenu(null);

  const handleContextMenuView = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) handleView(switchItem);
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) handleEdit(switchItem);
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const switchItem = switches.find(s => s.id === contextMenu.switchId);
      if (switchItem) handleDeleteRequest(switchItem); // Use request function
      handleContextMenuClose();
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#121212', minHeight: '100vh', width: '100%' }}>
      <Paper elevation={3} sx={{ bgcolor: '#1976d2', color: 'white', p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SwitchIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">Switch-Verwaltung</Typography>
        </Box>
      </Paper>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          disabled={!initialLoadDone || loading || locations.length === 0 || manufacturers.length === 0}
        >
          Neuer Switch
        </Button>
        {loading && <CircularProgress size={24} sx={{ ml: 1 }} />}
      </Box>

      <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={columns}
            rows={processedSwitches}
            heightPx={600}
            emptyMessage="Keine Switches vorhanden"
            sortColumn={sortConfig.column || undefined}
            sortDirection={sortConfig.direction}
            onSort={handleSort}
          />
        )}
      </Paper>

      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleContextMenuView}><ListItemIcon><ViewIcon fontSize="small" sx={{ color: '#90CAF9' }} /></ListItemIcon><ListItemText primary="Anzeigen" /></MenuItem>
        <MenuItem onClick={handleContextMenuEdit}><ListItemIcon><EditIcon fontSize="small" sx={{ color: '#4CAF50' }} /></ListItemIcon><ListItemText primary="Bearbeiten" /></MenuItem>
        <MenuItem onClick={handleContextMenuDelete}><ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#F44336' }} /></ListItemIcon><ListItemText primary="Löschen" /></MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{viewMode ? 'Switch-Details' : (editMode ? 'Switch bearbeiten' : 'Neuen Switch erstellen')}</DialogTitle>
        <DialogContent sx={{ pt: '10px !important' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Name"
                fullWidth required margin="dense"
                value={name.value}
                onChange={(e) => setName({ value: e.target.value, error: false, helperText: '' })}
                error={name.error}
                helperText={name.helperText}
                disabled={viewMode}
              />
              <Autocomplete
                options={manufacturers}
                getOptionLabel={(option) => option.name}
                value={manufacturer.value}
                onChange={(_, newValue) => setManufacturer({ value: newValue, error: false, helperText: '' })}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label="Hersteller" fullWidth required margin="dense" error={manufacturer.error} helperText={manufacturer.helperText} />
                )}
                disabled={viewMode}
              />
              <TextField
                label="Modell"
                fullWidth margin="dense"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={viewMode}
              />
              <TextField
                label="Anzahl Ports"
                fullWidth required margin="dense" type="number"
                value={portCount.value}
                onChange={(e) => setPortCount({ value: e.target.value === '' ? '' : Number(e.target.value), error: false, helperText: '' })}
                error={portCount.error}
                helperText={portCount.helperText}
                disabled={viewMode}
                InputProps={{ startAdornment: <InputAdornment position="start"><EthernetIcon fontSize="small" /></InputAdornment> }}
              />
              <TextField
                label="Beschreibung"
                fullWidth multiline rows={3} margin="dense"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewMode}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name}
                value={location.value}
                onChange={(_, newValue) => setLocation({ value: newValue, error: false, helperText: '' })}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label="Standort" fullWidth required margin="dense" error={location.error} helperText={location.helperText} />
                )}
                disabled={viewMode}
              />
              <Autocomplete
                options={filteredRooms}
                getOptionLabel={(option) => option.name}
                value={room.value}
                onChange={(_, newValue) => setRoom({ value: newValue, error: false, helperText: '' })}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField {...params} label="Raum" fullWidth margin="dense" error={room.error} helperText={room.helperText} />
                )}
                disabled={viewMode || !location.value}
              />
              <TextField
                label="Schrank"
                fullWidth margin="dense"
                value={cabinetLabel}
                onChange={(e) => setCabinetLabel(e.target.value)}
                placeholder="Schrank z.B. 26815.01"
                disabled={viewMode}
              />
              <TextField
                label="Rack Position (HE)"
                fullWidth margin="dense" type="number"
                value={rackPosition}
                onChange={(e) => setRackPosition(e.target.value)}
                disabled={viewMode}
                InputProps={{ startAdornment: <InputAdornment position="start"><RackPositionIcon fontSize="small" /></InputAdornment> }}
              />
              <TextField
                label="Notizen"
                fullWidth multiline rows={3} margin="dense"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={viewMode}
                InputProps={{ startAdornment: <InputAdornment position="start"><NotesIcon fontSize="small" /></InputAdornment> }}
              />
              <FormControlLabel
                control={<MuiSwitch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" disabled={viewMode} />}
                label="Switch aktiv"
                sx={{ display: 'block', mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">{viewMode ? 'Schließen' : 'Abbrechen'}</Button>
          {!viewMode && (
            <Button onClick={handleSave} variant="contained" color="primary" disabled={loading} >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Switch löschen?"
        message={`Möchten Sie den Switch "${switchToDelete?.name}" wirklich endgültig löschen? Zugeordnete Ports könnten davon betroffen sein.`}
        confirmText="Löschen"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Switches;
