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
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Public as WebsiteIcon,
  Person as ContactPersonIcon,
  Assignment as ContractIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationCity as LocationIcon,
  Home as AddressIcon,
  LocalShipping as SupplierIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { Supplier } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const Suppliers: React.FC = () => {
  // State für die Daten
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contractNumber, setContractNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
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

  // State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    supplierId: number;
  } | null>(null);

  // Spalten für die Tabelle
  const columns: AtlasColumn<Supplier>[] = [
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
            handleViewSupplier(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
    {
      dataKey: 'address',
      label: 'Adresse',
      render: (value, row) => {
        const addressParts = [];
        if (value) addressParts.push(value);
        if (row.postal_code || row.city) {
          const cityLine = [row.postal_code, row.city].filter(Boolean).join(' ');
          if (cityLine) addressParts.push(cityLine);
        }
        return addressParts.join(', ') || '-';
      }
    },
    { dataKey: 'contactPerson', label: 'Ansprechpartner' },
    { dataKey: 'contactEmail', label: 'E-Mail' },
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
        const dateValue = row?.createdAt || row?.created_at || value;

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
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getAllSuppliers();
      if (response && response.data) {
        setSuppliers(response.data);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Lieferanten: ${errorMessage}`,
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
    setCurrentSupplier(null);
    setName('');
    setDescription('');
    setWebsite('');
    setAddress('');
    setCity('');
    setPostalCode('');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setContractNumber('');
    setNotes('');
    setIsActive(true);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (supplier: Supplier) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentSupplier(supplier);
    setName(supplier.name);
    setDescription(supplier.description || '');
    setWebsite(supplier.website || '');
    setAddress(supplier.address || '');
    setCity(supplier.city || '');
    setPostalCode(supplier.postal_code || '');
    setContactPerson(supplier.contact_person || '');
    setContactEmail(supplier.contact_email || '');
    setContactPhone(supplier.contact_phone || '');
    setContractNumber(supplier.contract_number || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.isActive);
    setDialogOpen(true);
  };

  // Löschen eines Lieferanten
  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Möchten Sie den Lieferanten "${supplier.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await settingsApi.deleteSupplier(supplier.id);

      // Nach erfolgreichem Löschen die Liste aktualisieren
      loadSuppliers();

      setSnackbar({
        open: true,
        message: `Lieferant "${supplier.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      setLoading(false);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Lieferanten: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Lieferanten
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

    // Validierung der E-Mail-Adresse
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
        severity: 'error'
      });
      return;
    }

    const supplierData = {
      name,
      description,
      website,
      address,
      city,
      postalCode,
      contactPerson,
      contactEmail,
      contactPhone,
      contractNumber,
      notes,
      isActive
    };

    try {
      setLoading(true);

      if (editMode && currentSupplier) {
        // Bestehenden Lieferanten aktualisieren
        await settingsApi.updateSupplier(currentSupplier.id, supplierData);

        // Liste der Lieferanten aktualisieren
        loadSuppliers();

        setSnackbar({
          open: true,
          message: `Lieferant "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neuen Lieferanten erstellen
        await settingsApi.createSupplier(supplierData as any);

        // Liste der Lieferanten aktualisieren
        loadSuppliers();

        setSnackbar({
          open: true,
          message: `Lieferant "${name}" wurde erstellt.`,
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
        message: `Fehler beim Speichern des Lieferanten: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, supplierId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      supplierId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const supplier = suppliers.find(s => s.id === contextMenu.supplierId);
      if (supplier) {
        handleViewSupplier(supplier);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const supplier = suppliers.find(s => s.id === contextMenu.supplierId);
      if (supplier) {
        handleEdit(supplier);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const supplier = suppliers.find(s => s.id === contextMenu.supplierId);
      if (supplier) {
        handleDelete(supplier);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige des Lieferanten beim Klick auf den Namen
  const handleViewSupplier = (supplier: Supplier) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentSupplier(supplier);
    setName(supplier.name);
    setDescription(supplier.description || '');
    setWebsite(supplier.website || '');
    setAddress(supplier.address || '');
    setCity(supplier.city || '');
    setPostalCode(supplier.postal_code || '');
    setContactPerson(supplier.contact_person || '');
    setContactEmail(supplier.contact_email || '');
    setContactPhone(supplier.contact_phone || '');
    setContractNumber(supplier.contract_number || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.isActive);
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
          <SupplierIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">
            Lieferantenverwaltung
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
          Neuer Lieferant
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
            rows={suppliers}
            heightPx={600}
            emptyMessage="Keine Lieferanten vorhanden"
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

      {/* Dialog für Erstellen/Bearbeiten/Anzeigen */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {readOnly ? `Lieferant anzeigen: ${currentSupplier?.name}` :
            (editMode ? `Lieferant bearbeiten: ${currentSupplier?.name}` : 'Neuen Lieferanten erstellen')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
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
              <Grid item xs={12} md={6}>
                <TextField
                  label="Website"
                  fullWidth
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WebsiteIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Adresse"
                  fullWidth
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Straße und Hausnummer"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AddressIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="PLZ"
                  fullWidth
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="12345"
                  InputProps={{
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Stadt"
                  fullWidth
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Berlin"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Ansprechpartner"
                  fullWidth
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Vor- und Nachname"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContactPersonIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="E-Mail"
                  fullWidth
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Telefon"
                  fullWidth
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+49 123 456789"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Vertragsnummer"
                  fullWidth
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="V-123456"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ContractIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notizen"
                  fullWidth
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Interne Notizen zum Lieferanten..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <NoteIcon />
                      </InputAdornment>
                    ),
                    readOnly: readOnly
                  }}
                />
              </Grid>
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
                  label="Lieferant aktiv"
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

export default Suppliers;
