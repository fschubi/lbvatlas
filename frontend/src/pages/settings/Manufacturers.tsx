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
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid,
  Link as MuiLink,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { manufacturerApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import { Manufacturer, ManufacturerCreate, ManufacturerUpdate } from '../../types/settings';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Definiere FormField direkt hier, da es nur in diesen Seiten genutzt wird
interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

const Manufacturers: React.FC = () => {
  // State für die Daten
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentManufacturer, setCurrentManufacturer] = useState<Manufacturer | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [manufacturerToDelete, setManufacturerToDelete] = useState<Manufacturer | null>(null);

  // Form State
  const [name, setName] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [contactEmail, setContactEmail] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [contactPhone, setContactPhone] = useState<string>('');
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

  // Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    manufacturerId: number;
  } | null>(null);

  // Load manufacturers
  const loadManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await manufacturerApi.getAll();
      // Assume getAll() directly returns Manufacturer[] now
      const fetchedManufacturers: Manufacturer[] = Array.isArray(response) ? response : [];
      setManufacturers(fetchedManufacturers);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Hersteller: ${errorMessage}`,
        severity: 'error'
      });
      setManufacturers([]); // Clear on error
    } finally {
      setLoading(false);
    }
  }, []);

  // API-Daten laden
  useEffect(() => {
    loadManufacturers();
  }, [loadManufacturers]);

  // Spalten für die AtlasTable-Komponente
  const columns: AtlasColumn<Manufacturer>[] = [
    // { dataKey: 'id', label: 'ID', width: 70, numeric: true }, // ID-Spalte ausgeblendet
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
            handleViewManufacturer(row);
          }}
        >
          {value}
        </Box>
      )
    },
    {
      dataKey: 'website',
      label: 'Website',
      width: 250,
      render: (value) => value ? <MuiLink href={value as string} target="_blank" rel="noopener noreferrer">{value as string}</MuiLink> : '-'
    },
    { dataKey: 'contactEmail', label: 'Kontakt E-Mail', width: 200, render: (value) => value || '-' },
    { dataKey: 'contactPhone', label: 'Kontakt Telefon', width: 150, render: (value) => value || '-' },
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

  // Reset Formularfelder
  const resetForm = () => {
    setName({ value: '', error: false, helperText: '' });
    setDescription('');
    setWebsite({ value: '', error: false, helperText: '' });
    setContactEmail({ value: '', error: false, helperText: '' });
    setContactPhone('');
    setIsActive(true);
  };

  // Dialog öffnen für neuen Hersteller
  const handleAddNew = () => {
    setEditMode(false);
    setViewMode(false);
    setCurrentManufacturer(null);
    resetForm();
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (manufacturer: Manufacturer) => {
    setEditMode(true);
    setViewMode(false);
    setCurrentManufacturer(manufacturer);
    setName({ value: manufacturer.name, error: false, helperText: '' });
    setDescription(manufacturer.description || '');
    setWebsite({ value: manufacturer.website || '', error: false, helperText: '' });
    setContactEmail({ value: manufacturer.contactEmail || '', error: false, helperText: '' });
    setContactPhone(manufacturer.contactPhone || '');
    setIsActive(manufacturer.isActive);
    setDialogOpen(true);
  };

  // Anzeigen eines Herstellers
  const handleViewManufacturer = (manufacturer: Manufacturer) => {
    setEditMode(false);
    setViewMode(true);
    setCurrentManufacturer(manufacturer);
    setName({ value: manufacturer.name, error: false, helperText: '' });
    setDescription(manufacturer.description || '');
    setWebsite({ value: manufacturer.website || '', error: false, helperText: '' });
    setContactEmail({ value: manufacturer.contactEmail || '', error: false, helperText: '' });
    setContactPhone(manufacturer.contactPhone || '');
    setIsActive(manufacturer.isActive);
    setDialogOpen(true);
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (manufacturer: Manufacturer) => {
    setManufacturerToDelete(manufacturer);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
    if (!manufacturerToDelete) return;

    // Close the confirmation dialog first
    setConfirmDialogOpen(false);
    const manufacturerName = manufacturerToDelete.name; // Store name before clearing

    try {
      setLoading(true);
      await manufacturerApi.delete(manufacturerToDelete.id);
      loadManufacturers(); // Reload data
      setSnackbar({ open: true, message: `Hersteller "${manufacturerName}" wurde gelöscht.`, severity: 'success' });
    } catch (error: any) {
      const specificMessage = error?.data?.message || error?.message;
      const errorMessage = specificMessage || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
      setManufacturerToDelete(null); // Clear the manufacturer to delete
    }
  };

  // Step 3: Close confirmation dialog without deleting
   const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setManufacturerToDelete(null);
   };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Herstellers
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    const manufacturerData: Partial<Manufacturer> = {
      name: name.value.trim(),
      description: description.trim() || undefined,
      website: website.value.trim() || undefined,
      contactEmail: contactEmail.value.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      isActive: isActive
    };

    const backendData = toSnakeCase(manufacturerData);
    console.log('DEBUG: Sende Daten an Backend (manufacturer, snake_case):', backendData);

    try {
      setLoading(true);
      if (editMode && currentManufacturer) {
        await manufacturerApi.update(currentManufacturer.id, backendData as ManufacturerUpdate);
        setSnackbar({ open: true, message: `Hersteller "${name.value}" wurde aktualisiert.`, severity: 'success' });
      } else {
        await manufacturerApi.create(backendData as ManufacturerCreate);
        setSnackbar({ open: true, message: `Hersteller "${name.value}" wurde erstellt.`, severity: 'success' });
      }
      loadManufacturers();
      setDialogOpen(false);
    } catch (error: any) {
      const errorMessage = handleApiError(error);
      if (errorMessage.toLowerCase().includes('name') && errorMessage.toLowerCase().includes('existiert bereits')) {
          setName({ ...name, error: true, helperText: errorMessage });
      } else {
          setName({ ...name, error: true, helperText: 'Fehler beim Speichern. Prüfen Sie die Eingaben.' });
      }
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Einfache URL-Validierung
  const isValidUrl = (url: string): boolean => {
    if (!url) return true; // Leer ist erlaubt
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Einfache E-Mail-Validierung
  const isValidEmail = (email: string): boolean => {
    if (!email) return true; // Leer ist erlaubt
    // Einfacher Regex - für Produktion ggf. komplexeren verwenden
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validierung
  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    setName(prev => ({ ...prev, error: false, helperText: '' }));
    setWebsite(prev => ({ ...prev, error: false, helperText: '' }));
    setContactEmail(prev => ({ ...prev, error: false, helperText: '' }));

    if (!name.value.trim()) {
      setName({ value: name.value, error: true, helperText: 'Name ist erforderlich' });
      isValid = false;
    }

    if (website.value.trim() && !isValidUrl(website.value.trim())) {
      setWebsite({ value: website.value, error: true, helperText: 'Ungültige URL (z.B. https://beispiel.com)' });
      isValid = false;
    }

    if (contactEmail.value.trim() && !isValidEmail(contactEmail.value.trim())) {
      setContactEmail({ value: contactEmail.value, error: true, helperText: 'Ungültige E-Mail-Adresse' });
      isValid = false;
    }

    return isValid;
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, manufacturerId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      manufacturerId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const manufacturer = manufacturers.find(m => m.id === contextMenu.manufacturerId);
      if (manufacturer) {
        handleViewManufacturer(manufacturer);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const manufacturer = manufacturers.find(m => m.id === contextMenu.manufacturerId);
      if (manufacturer) {
        handleEdit(manufacturer);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const manufacturer = manufacturers.find(m => m.id === contextMenu.manufacturerId);
      if (manufacturer) {
        handleDeleteRequest(manufacturer);
      }
      handleContextMenuClose();
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
          <BusinessIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">
            Herstellerverwaltung
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
          Neuer Hersteller
        </Button>
        <Tooltip title="Daten neu laden">
          <IconButton onClick={loadManufacturers} color="primary">
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
            rows={manufacturers}
            heightPx={600}
            emptyMessage="Keine Hersteller vorhanden"
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewMode ? 'Herstellerdetails' : (editMode ? 'Hersteller bearbeiten' : 'Neuen Hersteller erstellen')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            {/* Linke Spalte */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Herstellername"
                fullWidth
                value={name.value}
                onChange={(e) => setName({ value: e.target.value, error: false, helperText: '' })}
                required
                error={name.error}
                helperText={name.helperText}
                disabled={viewMode}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Beschreibung"
                fullWidth
                multiline
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
              />
               <FormControlLabel
                control={
                  <MuiSwitch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    color="primary"
                    disabled={viewMode}
                  />
                }
                label="Hersteller aktiv"
                sx={{ mb: 2 }}
              />
            </Grid>

            {/* Rechte Spalte */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Website"
                fullWidth
                value={website.value}
                onChange={(e) => setWebsite({ value: e.target.value, error: false, helperText: '' })}
                error={website.error}
                helperText={website.helperText}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Kontakt E-Mail"
                fullWidth
                value={contactEmail.value}
                onChange={(e) => setContactEmail({ value: e.target.value, error: false, helperText: '' })}
                error={contactEmail.error}
                helperText={contactEmail.helperText}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Kontakt Telefon"
                fullWidth
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={viewMode}
                 sx={{ mb: 2 }}
                 InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {viewMode ? 'Schließen' : 'Abbrechen'}
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
        title="Hersteller löschen?"
        message={`Möchten Sie den Hersteller "${manufacturerToDelete?.name}" wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`}
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

export default Manufacturers;
