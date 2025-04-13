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
  LocationCity as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Public as CountryIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { Location } from '../../types/settings';
import { settingsApi } from '../../utils/api';

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

  // Form State mit Validierung
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

  // API-Daten laden
  useEffect(() => {
    fetchLocations();
  }, []);

  // Standorte vom API laden
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getAllLocations();
      // Daten sind bereits vom API nach Namen sortiert
      setLocations(response.data as Location[]);
      setLoading(false);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Standorte: ${error.message}`,
        severity: 'error'
      });
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
          onClick={handleClose}
          PaperProps={{
            elevation: 3,
            sx: {
              bgcolor: '#1e1e1e',
              overflow: 'visible',
              mt: 1,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: '#1e1e1e',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={() => handleView(location)} sx={{ minWidth: 160 }}>
            <ListItemIcon>
              <ViewIcon fontSize="small" sx={{ color: '#2196f3' }} />
            </ListItemIcon>
            <ListItemText>Anzeigen</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleEdit(location)}>
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: '#4caf50' }} />
            </ListItemIcon>
            <ListItemText>Bearbeiten</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleDelete(location)}>
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
      label: 'Aktiv',
      dataKey: 'isActive',
      width: 100,
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
      label: 'Aktionen',
      dataKey: 'actions',
      width: 70,
      render: (_, row: Location) => <ActionMenu location={row} />
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
    setIsActive(true);

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
    setIsActive(location.isActive);

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
    setIsActive(location.isActive);

    setDialogOpen(true);
  };

  // Löschen eines Standorts mit Bestätigung
  const handleDelete = async (location: Location) => {
    if (!window.confirm(`Möchten Sie den Standort "${location.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await settingsApi.deleteLocation(location.id);

      // Neu laden statt nur lokale Liste aktualisieren
      fetchLocations();

      setSnackbar({
        open: true,
        message: `Standort "${location.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Standorts: ${error.message}`,
        severity: 'error'
      });
      setLoading(false);
    }
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
        const nameExists = await settingsApi.checkLocationNameExists(name.value);
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

    try {
      setLoading(true);

      // Neue Standort-Daten erstellen
      const locationData: Partial<Location> = {
        name: name.value.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        city: city.value.trim(),
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || 'Deutschland',
        isActive
      };

      if (editMode && currentLocation) {
        // Bestehenden Standort bearbeiten
        await settingsApi.updateLocation(currentLocation.id, locationData);

        // Alle Standorte neu laden statt nur lokale Liste aktualisieren
        fetchLocations();

        setSnackbar({
          open: true,
          message: `Standort "${name.value}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neuen Standort erstellen
        await settingsApi.createLocation(locationData);

        // Alle Standorte neu laden statt nur lokale Liste aktualisieren
        fetchLocations();

        setSnackbar({
          open: true,
          message: `Standort "${name.value}" wurde erstellt.`,
          severity: 'success'
        });
      }

      setDialogOpen(false);
    } catch (error: any) {
      setLoading(false);
      let errorMessage = `Fehler beim Speichern: ${error.message}`;

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
    fetchLocations();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
          />
        )}
      </Paper>

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
                          <CountryIcon sx={{ color: 'text.secondary' }} />
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

            <Grid item xs={12}>
              <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={viewMode}
                    color="primary"
                  />
                }
                label="Standort ist aktiv"
                sx={{ color: 'text.primary' }}
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
