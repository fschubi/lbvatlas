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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { Manufacturer } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const Manufacturers: React.FC = () => {
  // State für die Daten
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentManufacturer, setCurrentManufacturer] = useState<Manufacturer | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
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
    manufacturerId: number;
  } | null>(null);

  // Spalten für die Tabelle
  const columns: AtlasColumn<Manufacturer>[] = [
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
            handleViewManufacturer(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
    { dataKey: 'website', label: 'Website', width: 180 },
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
      render: (value, row) => {
        // Verwende den Wert aus dem row Objekt oder den übergebenen value
        const dateValue = row?.createdAt || value;

        if (!dateValue) return 'Unbekannt';

        try {
          // Versuche das Datum zu parsen (funktioniert sowohl mit ISO 8601 als auch mit Postgres-Timestamp)
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

  // Daten laden
  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getAllManufacturers();
      if (response && response.data) {
        setManufacturers(response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Hersteller: ${errorMessage}`,
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
    setCurrentManufacturer(null);
    setName('');
    setDescription('');
    setWebsite('');
    setContactInfo('');
    setLogoUrl('');
    setIsActive(true);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (manufacturer: Manufacturer) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentManufacturer(manufacturer);
    setName(manufacturer.name);
    setDescription(manufacturer.description || '');
    setWebsite(manufacturer.website || '');
    setContactInfo(manufacturer.contactInfo || '');
    setLogoUrl(manufacturer.logoUrl || '');
    setIsActive(manufacturer.isActive);
    setDialogOpen(true);
  };

  // Löschen eines Herstellers
  const handleDelete = async (manufacturer: Manufacturer) => {
    if (!window.confirm(`Möchten Sie den Hersteller "${manufacturer.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await settingsApi.deleteManufacturer(manufacturer.id);

      // Nach erfolgreichem Löschen die Liste aktualisieren
      loadManufacturers();

      setSnackbar({
        open: true,
        message: `Hersteller "${manufacturer.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      setLoading(false);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Herstellers: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Herstellers
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

    const manufacturerData = {
      name,
      description,
      website,
      logoUrl,
      contactInfo,
      isActive
    };

    try {
      setLoading(true);

      if (editMode && currentManufacturer) {
        // Bestehenden Hersteller aktualisieren
        await settingsApi.updateManufacturer(currentManufacturer.id, manufacturerData);

        // Liste der Hersteller aktualisieren
        loadManufacturers();

        setSnackbar({
          open: true,
          message: `Hersteller "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neuen Hersteller erstellen
        await settingsApi.createManufacturer(manufacturerData);

        // Liste der Hersteller aktualisieren
        loadManufacturers();

        setSnackbar({
          open: true,
          message: `Hersteller "${name}" wurde erstellt.`,
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
        message: `Fehler beim Speichern des Herstellers: ${errorMessage}`,
        severity: 'error'
      });
    }
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
        handleDelete(manufacturer);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige des Herstellers beim Klick auf den Namen
  const handleViewManufacturer = (manufacturer: Manufacturer) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentManufacturer(manufacturer);
    setName(manufacturer.name);
    setDescription(manufacturer.description || '');
    setWebsite(manufacturer.website || '');
    setContactInfo(manufacturer.contactInfo || '');
    setLogoUrl(manufacturer.logoUrl || '');
    setIsActive(manufacturer.isActive);
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

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {readOnly ? `Hersteller anzeigen: ${currentManufacturer?.name}` :
            (editMode ? `Hersteller bearbeiten: ${currentManufacturer?.name}` : 'Neuen Hersteller erstellen')}
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
            <TextField
              label="Website"
              fullWidth
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.example.com"
              InputProps={{
                readOnly: readOnly
              }}
            />
            <TextField
              label="Logo URL"
              fullWidth
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              InputProps={{
                readOnly: readOnly
              }}
            />
            <TextField
              label="Kontaktinformationen"
              fullWidth
              multiline
              rows={2}
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="E-Mail, Telefon, Ansprechpartner, etc."
              InputProps={{
                readOnly: readOnly
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
              label="Hersteller aktiv"
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

export default Manufacturers;
