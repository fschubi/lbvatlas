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
  InputAdornment,
  Grid,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { locationApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { Location, LocationCreate, LocationUpdate } from '../../types/settings';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Schnittstelle für Formularfelder mit Validierungszustand
interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

/**
 * Standortverwaltungskomponente
 * Diese Komponente dient als Basis für weitere Einstellungsseiten
 */
const Locations: React.FC = () => {
  // State für die Daten
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Form State ohne isActive
  const [name, setName] = useState<FormField<string>>({
    value: '',
    error: false,
    helperText: ''
  });
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<FormField<string>>({
    value: '',
    error: false,
    helperText: ''
  });
  const [postalCode, setPostalCode] = useState<string>('');
  const [country, setCountry] = useState<string>('Deutschland');
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

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    locationId: number;
  } | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // API-Daten laden
  useEffect(() => {
    loadLocations();
  }, []);

  // Standorte vom API laden
  const loadLocations = async () => {
    setLoading(true);
    try {
      // API Aufruf - Gibt ApiResponse<Location[]> zurück
      const response = await locationApi.getAll();
      console.log('DEBUG: Rohdaten von API (Locations Response Objekt):', response);

      // Auf response.success und response.data zugreifen
      if (response.success && Array.isArray(response.data)) {
        // Typisierung für map ist jetzt nicht mehr nötig, da response.data korrekt typisiert ist
        const formattedLocations = response.data.map(loc => toCamelCase(loc) as Location);
        console.log('DEBUG: Konvertierte Standorte (camelCase):', formattedLocations);
        setLocations(formattedLocations);
      } else {
        // Fallback, wenn success false oder data kein Array
        console.warn('Laden der Standorte nicht erfolgreich oder Datenstruktur unerwartet:', response);
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Laden der Standorte: Unerwartete Antwortstruktur.',
          severity: 'error'
        });
        setLocations([]); // Leeres Array setzen
      }
    } catch (error: any) {
      // Fehler wird von apiRequest als { success: false, message: string, data: null } geworfen
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Standorte: ${errorMessage}`,
        severity: 'error'
      });
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // Komponente für das Aktionsmenü in jeder Zeile
  const ActionMenu = ({ location }: { location: Location }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    // Wrapper-Funktionen, die stopPropagation hinzufügen
    const handleViewClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      handleView(location);
      handleClose();
    };

    const handleEditClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      handleEdit(location);
      handleClose();
    };

    const handleDeleteClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      handleDeleteRequest(location);
      handleClose();
    };

    return (
      <>
        <IconButton
          aria-label="Aktionen"
          aria-controls={open ? `actions-menu-${location.id}` : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          size="small"
          edge="end"
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          id={`actions-menu-${location.id}`}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
        >
          <MenuItem onClick={handleViewClick} sx={{ minWidth: 160 }}>
            <ListItemIcon>
              <ViewIcon fontSize="small" sx={{ color: '#2196f3' }} />
            </ListItemIcon>
            <ListItemText>Anzeigen</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: '#4caf50' }} />
            </ListItemIcon>
            <ListItemText>Bearbeiten</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: '#f44336' }} />
            </ListItemIcon>
            <ListItemText>Löschen</ListItemText>
          </MenuItem>
        </Menu>
      </>
    );
  };

  // Spalten für die AtlasTable-Komponente
  const columns: AtlasColumn[] = [
    {
      label: 'ID',
      dataKey: 'id',
      width: 70,
      numeric: true,
      sortable: true
    },
    {
      label: 'Name',
      dataKey: 'name',
      width: 180,
      sortable: true,
      filterable: true,
      render: (value, row: Location) => (
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
            handleView(row);
          }}
        >
          {value}
        </Box>
      )
    },
    {
      label: 'Adresse',
      dataKey: 'address',
      width: 200,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      label: 'PLZ',
      dataKey: 'postalCode',
      width: 100,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      label: 'Stadt',
      dataKey: 'city',
      width: 150,
      sortable: true,
      filterable: true,
      render: (value) => value || '-'
    },
    {
      label: 'Land',
      dataKey: 'country',
      width: 150,
      sortable: true,
      filterable: true,
      render: (value) => value || 'Deutschland'
    },
    {
      label: 'Aktionen',
      dataKey: 'actions',
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

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setViewMode(false);
    setCurrentLocation(null);

    // Formular zurücksetzen
    setName({ value: '', error: false, helperText: '' });
    setDescription('');
    setAddress('');
    setCity({ value: '', error: false, helperText: '' });
    setPostalCode('');
    setCountry('Deutschland');
    setReadOnly(false);

    setDialogOpen(true);
  };

  // Dialog öffnen für Ansicht eines Standorts
  const handleView = (location: Location) => {
    setEditMode(false);
    setViewMode(true);
    setCurrentLocation(location);

    // Formular mit Standortdaten füllen
    setName({ value: location.name, error: false, helperText: '' });
    setDescription(location.description || '');
    setAddress(location.address || '');
    setCity({ value: location.city || '', error: false, helperText: '' });
    setPostalCode(location.postalCode || '');
    setCountry(location.country || 'Deutschland');
    setReadOnly(true);

    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (location: Location) => {
    setEditMode(true);
    setViewMode(false);
    setCurrentLocation(location);

    // Formular mit Standortdaten füllen
    setName({ value: location.name, error: false, helperText: '' });
    setDescription(location.description || '');
    setAddress(location.address || '');
    setCity({ value: location.city || '', error: false, helperText: '' });
    setPostalCode(location.postalCode || '');
    setCountry(location.country || 'Deutschland');
    setReadOnly(false);

    setDialogOpen(true);
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (location: Location) => {
    setLocationToDelete(location);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
    if (!locationToDelete) return;

    setConfirmDialogOpen(false); // Close dialog first
    const locationName = locationToDelete.name; // Store name

    try {
      setLoading(true);
      await locationApi.delete(locationToDelete.id);
      loadLocations(); // Reload data
      setSnackbar({
        open: true,
        message: `Standort "${locationName}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error: any) {
        const errorMessage = handleApiError(error);
        setSnackbar({
            open: true,
            message: `Fehler beim Löschen des Standorts: ${errorMessage}`,
            severity: 'error'
        });
    } finally {
      setLoading(false);
      setLocationToDelete(null); // Clear the location to delete
    }
  };

  // Step 3: Close confirmation dialog without deleting
  const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setLocationToDelete(null);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Validierung des Formulars
  const validateForm = async (): Promise<boolean> => {
    let isValid = true;

    // Name validieren
    if (!name.value.trim()) {
      setName({
        ...name,
        error: true,
        helperText: 'Name ist erforderlich'
      });
      isValid = false;
    } else if (name.value.length > 100) {
      setName({
        ...name,
        error: true,
        helperText: 'Name darf maximal 100 Zeichen haben'
      });
      isValid = false;
    } else if (!editMode) {
      // Prüfe, ob der Name bereits existiert (nur bei Neuanlage)
      try {
        const nameExists = await locationApi.checkLocationNameExists(name.value);
        if (nameExists) {
          setName({
            ...name,
            error: true,
            helperText: 'Ein Standort mit diesem Namen existiert bereits'
          });
          isValid = false;
        }
      } catch (error) {
        // Bei einem Fehler in der Validierung fahren wir fort
      }
    }

    // Stadt validieren
    if (!city.value.trim()) {
      setCity({
        ...city,
        error: true,
        helperText: 'Stadt ist erforderlich'
      });
      isValid = false;
    }

    return isValid;
  };

  // Speichern des Standorts
  const handleSave = async () => {
    // Formular validieren
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    const locationData: Partial<Location> = {
      name: name.value.trim(),
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      city: city.value.trim(),
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || 'Deutschland'
    };

    // Konvertiere zu snake_case für das Backend
    const backendData = toSnakeCase(locationData);

    try {
      setLoading(true);
      if (editMode && currentLocation) {
        await locationApi.update(currentLocation.id, backendData as LocationUpdate);
        // Alle Standorte neu laden statt nur lokale Liste aktualisieren
        loadLocations();

        setSnackbar({
          open: true,
          message: `Standort "${name.value}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        await locationApi.create(backendData as LocationCreate);
        // Alle Standorte neu laden statt nur lokale Liste aktualisieren
        loadLocations();

        setSnackbar({
          open: true,
          message: `Standort "${name.value}" wurde erstellt.`,
          severity: 'success'
        });
      }

      setDialogOpen(false);
    } catch (error: any) {
      setLoading(false);
      let errorMessage = `Fehler beim Speichern: ${handleApiError(error)}`;

      // Prüfen, ob es einen spezifischen Fehler gibt (z.B. Name bereits vergeben)
      if (error.message.includes('existiert bereits')) {
        errorMessage = `Ein Standort mit diesem Namen existiert bereits.`;
        setName({
          ...name,
          error: true,
          helperText: errorMessage
        });
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Aktualisieren der Daten
  const handleRefresh = () => {
    loadLocations();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, locationId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      locationId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const location = locations.find(l => l.id === contextMenu.locationId);
      if (location) {
        handleView(location);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const location = locations.find(l => l.id === contextMenu.locationId);
      if (location) {
        handleEdit(location);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const location = locations.find(l => l.id === contextMenu.locationId);
      if (location) {
        handleDeleteRequest(location);
      }
      handleContextMenuClose();
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#121212', minHeight: '100vh' }}>
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
        <LocationIcon sx={{ fontSize: 28, mr: 2 }} />
        <Typography variant="h5" component="h1">
          Standortverwaltung
        </Typography>
      </Paper>

      {/* Aktionsleiste */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Neuer Standort
        </Button>
        <Tooltip title="Daten neu laden">
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tabelle mit Standorten */}
      <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={columns}
            rows={locations}
            heightPx={600}
            emptyMessage="Keine Standorte gefunden"
            initialSortColumn="name"
            initialSortDirection="asc"
            onRowClick={handleView}
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

      {/* Dialog für Erstellen/Bearbeiten/Anzeigen */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          elevation: 5,
          sx: {
            bgcolor: '#1e1e1e',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: viewMode ? '#2a2a2a' : (editMode ? 'primary.dark' : 'primary.main'),
            color: 'white',
            py: 1.5,
            px: 3,
            fontWeight: 500,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {viewMode ? 'Standortdetails' : (editMode ? 'Standort bearbeiten' : 'Neuen Standort erstellen')}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, px: 3, mt: 1 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Standortname"
                placeholder="z.B. Hauptsitz Berlin"
                fullWidth
                required
                variant="filled"
                value={name.value}
                onChange={(e) => setName({
                  value: e.target.value,
                  error: false,
                  helperText: ''
                })}
                error={name.error}
                helperText={name.helperText}
                disabled={viewMode}
                InputLabelProps={{
                  shrink: true,
                  sx: { color: 'text.primary' }
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    borderRadius: '4px',
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    }
                  }
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'rgba(255, 255, 255, 0.09)'
                    }
                  },
                  '& .Mui-disabled': {
                    opacity: 0.7
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Stadt"
                placeholder="z.B. Berlin"
                fullWidth
                required
                variant="filled"
                value={city.value}
                onChange={(e) => setCity({
                  value: e.target.value,
                  error: false,
                  helperText: ''
                })}
                error={city.error}
                helperText={city.helperText}
                disabled={viewMode}
                InputLabelProps={{
                  shrink: true,
                  sx: { color: 'text.primary' }
                }}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    borderRadius: '4px',
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    }
                  }
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'rgba(255, 255, 255, 0.09)'
                    }
                  },
                  '& .Mui-disabled': {
                    opacity: 0.7
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Adresse"
                placeholder="Straße und Hausnummer"
                fullWidth
                variant="filled"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={viewMode}
                multiline
                rows={2}
                InputLabelProps={{
                  shrink: true,
                  sx: { color: 'text.primary' }
                }}
                InputProps={{
                  disableUnderline: true
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'rgba(255, 255, 255, 0.09)'
                    }
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Postleitzahl"
                    placeholder="z.B. 10115"
                    fullWidth
                    variant="filled"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={viewMode}
                    InputLabelProps={{
                      shrink: true,
                      sx: { color: 'text.primary' }
                    }}
                    InputProps={{
                      disableUnderline: true
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.09)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.13)'
                        },
                        '&.Mui-focused': {
                          bgcolor: 'rgba(255, 255, 255, 0.09)'
                        }
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Land"
                    fullWidth
                    variant="filled"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={viewMode}
                    InputLabelProps={{
                      shrink: true,
                      sx: { color: 'text.primary' }
                    }}
                    InputProps={{
                      disableUnderline: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PublicIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.09)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.13)'
                        },
                        '&.Mui-focused': {
                          bgcolor: 'rgba(255, 255, 255, 0.09)'
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Beschreibung"
                placeholder="Optionale Beschreibung des Standorts"
                fullWidth
                variant="filled"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewMode}
                multiline
                rows={3}
                InputLabelProps={{
                  shrink: true,
                  sx: { color: 'text.primary' }
                }}
                InputProps={{
                  disableUnderline: true
                }}
                sx={{
                  '& .MuiFilledInput-root': {
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.09)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.13)'
                    },
                    '&.Mui-focused': {
                      bgcolor: 'rgba(255, 255, 255, 0.09)'
                    }
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
          >
            {viewMode ? 'Schließen' : 'Abbrechen'}
          </Button>

          {!viewMode && (
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : (editMode ? <EditIcon /> : <AddIcon />)}
            >
              {editMode ? 'Aktualisieren' : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Standort löschen?"
        message={`Möchten Sie den Standort "${locationToDelete?.name}" wirklich endgültig löschen? Zugeordnete Elemente (Räume, Geräte etc.) könnten davon betroffen sein.`}
        confirmText="Löschen"
      />

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

export default Locations;
