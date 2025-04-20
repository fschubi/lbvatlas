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
  Grid,
  Link as MuiLink
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
  Note as NoteIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { supplierApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import { Supplier, SupplierCreate, SupplierUpdate } from '../../types/settings';
import { ApiResponse } from '../../utils/api';
import ConfirmationDialog from '../../components/ConfirmationDialog';

interface FormField<T> {
  value: T;
  error: boolean;
  helperText: string;
}

const Suppliers: React.FC = () => {
  // State für die Daten
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);
  // *** NEU: State für Bestätigungsdialog ***
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<FormField<string>>({ value: '', error: false, helperText: '' });
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
    {
      dataKey: 'name',
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
            handleViewSupplier(row);
          }}
        >
          {value}
        </Box>
      )
    },
    {
      dataKey: 'website',
      label: 'Website',
      width: 200,
      render: (value) => value ? <MuiLink href={value as string} target="_blank" rel="noopener noreferrer">{value as string}</MuiLink> : '-'
    },
    { dataKey: 'contactPerson', label: 'Ansprechpartner', width: 180, render: (value) => value || '-' },
    { dataKey: 'contactEmail', label: 'E-Mail', width: 200, render: (value) => value || '-' },
    { dataKey: 'contactPhone', label: 'Telefon', width: 150, render: (value) => value || '-' },
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

  // Daten laden
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      // Erwarte das Objekt von der API
      const response = await supplierApi.getAll();
      console.log('DEBUG: API Response (raw) for suppliers:', response);

      // Greife auf das data-Array innerhalb der Antwort zu
      const rawData = response?.data || []; // Hier auf .data zugreifen

      if (Array.isArray(rawData)) { // Prüfe, ob rawData (also response.data) ein Array ist
        const formattedSuppliers = rawData.map((s: any) => toCamelCase(s) as Supplier);
        console.log('DEBUG: Formatted suppliers:', formattedSuppliers);
        setSuppliers(formattedSuppliers);
      } else {
        console.error('DEBUG: Expected an array in response.data, but received:', rawData);
        setSuppliers([]);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Fehler beim Laden der Lieferanten:', error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Lieferanten: ${errorMessage}`, severity: 'error' });
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setViewMode(false);
    setCurrentSupplier(null);
    resetForm();
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (supplier: Supplier) => {
    setEditMode(true);
    setViewMode(false);
    setCurrentSupplier(supplier);
    setName({ value: supplier.name, error: false, helperText: '' });
    setDescription(supplier.description || '');
    setWebsite({ value: supplier.website || '', error: false, helperText: '' });
    setAddress(supplier.address || '');
    setCity(supplier.city || '');
    setPostalCode(supplier.postalCode || '');
    setContactPerson(supplier.contactPerson || '');
    setContactEmail({ value: supplier.contactEmail || '', error: false, helperText: '' });
    setContactPhone(supplier.contactPhone || '');
    setContractNumber(supplier.contractNumber || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.isActive);
    setDialogOpen(true);
  };

  // Löschen eines Lieferanten
  const handleDeleteRequest = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setConfirmDeleteDialogOpen(true);
  };

  // Eigentliche Löschlogik
  const executeDelete = async () => {
    if (!supplierToDelete) return;

    setConfirmDeleteDialogOpen(false); // Dialog zuerst schließen
    const supplierName = supplierToDelete.name; // Namen speichern

    try {
      setLoading(true);
      await supplierApi.delete(supplierToDelete.id);
      loadSuppliers(); // Liste neu laden
      setSnackbar({
        open: true,
        message: `Lieferant "${supplierName}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error: any) {
      const specificMessage = error?.data?.message || error?.message;
      const errorMessage = specificMessage || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false);
      setSupplierToDelete(null); // Zu löschenden Lieferanten zurücksetzen
    }
  };

  // Bestätigungsdialog schließen
  const handleCloseConfirmDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setSupplierToDelete(null);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern des Lieferanten
  const handleSave = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    const supplierData: Partial<Supplier> = {
      name: name.value.trim(),
      description: description.trim() || undefined,
      website: website.value.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      contactEmail: contactEmail.value.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contractNumber: contractNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive: isActive
    };

    const backendData = toSnakeCase(supplierData);
    // console.log('DEBUG: Sende Daten an Backend (supplier, snake_case):', backendData); // Debug entfernt

    try {
      setLoading(true);
      let response: ApiResponse<Supplier>; // Typ für die Antwort definieren
      if (editMode && currentSupplier) {
        response = await supplierApi.update(currentSupplier.id, backendData as SupplierUpdate);
        setSnackbar({ open: true, message: response.message || `Lieferant "${name.value}" wurde aktualisiert.`, severity: 'success' });
      } else {
        response = await supplierApi.create(backendData as SupplierCreate);
        setSnackbar({ open: true, message: response.message || `Lieferant "${name.value}" wurde erstellt.`, severity: 'success' });
      }

      if (response.success) {
        loadSuppliers();
        setDialogOpen(false);
      } else {
         setSnackbar({ open: true, message: response.message || 'Ein unerwarteter Fehler ist aufgetreten.', severity: 'error' });
         if (response.message?.toLowerCase().includes('name') && response.message?.toLowerCase().includes('existiert bereits')) {
             setName(prev => ({ ...prev, error: true, helperText: response.message || 'Fehler' }));
         }
      }
    } catch (error: any) {
      const errorMessage = error.message || handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
      if (errorMessage.toLowerCase().includes('name') && errorMessage.toLowerCase().includes('existiert bereits')) {
          setName(prev => ({ ...prev, error: true, helperText: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset Formularfelder
  const resetForm = () => {
    setName({ value: '', error: false, helperText: '' });
    setDescription('');
    setWebsite({ value: '', error: false, helperText: '' });
    setAddress('');
    setCity('');
    setPostalCode('');
    setContactPerson('');
    setContactEmail({ value: '', error: false, helperText: '' });
    setContactPhone('');
    setContractNumber('');
    setNotes('');
    setIsActive(true);
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
        handleDeleteRequest(supplier);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige des Lieferanten beim Klick auf den Namen
  const handleViewSupplier = (supplier: Supplier) => {
    setEditMode(false);
    setViewMode(true);
    setCurrentSupplier(supplier);
    setName({ value: supplier.name, error: false, helperText: '' });
    setDescription(supplier.description || '');
    setWebsite({ value: supplier.website || '', error: false, helperText: '' });
    setAddress(supplier.address || '');
    setCity(supplier.city || '');
    setPostalCode(supplier.postalCode || '');
    setContactPerson(supplier.contactPerson || '');
    setContactEmail({ value: supplier.contactEmail || '', error: false, helperText: '' });
    setContactPhone(supplier.contactPhone || '');
    setContractNumber(supplier.contractNumber || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.isActive);
    setDialogOpen(true);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Einfache URL-Validierung
  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Einfache E-Mail-Validierung
  const isValidEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validierung des Formulars
  const validateForm = async (): Promise<boolean> => {
    let isValid = true;
    // Reset errors
    setName(prev => ({ ...prev, error: false, helperText: '' }));
    setWebsite(prev => ({ ...prev, error: false, helperText: '' }));
    setContactEmail(prev => ({ ...prev, error: false, helperText: '' }));

    // Validate Name (Required)
    if (!name.value.trim()) {
      setName({ value: name.value, error: true, helperText: 'Name ist erforderlich' });
      isValid = false;
    }

    // Validate Website (Optional, but must be valid if present)
    if (website.value.trim() && !isValidUrl(website.value.trim())) {
      setWebsite({ value: website.value, error: true, helperText: 'Ungültige URL (z.B. https://beispiel.com)' });
      isValid = false;
    }

    // Validate Contact Email (Optional, but must be valid if present)
    if (contactEmail.value.trim() && !isValidEmail(contactEmail.value.trim())) {
      setContactEmail({ value: contactEmail.value, error: true, helperText: 'Ungültige E-Mail-Adresse' });
      isValid = false;
    }

    // *** NEU: Prüfen, ob der Name bereits existiert (nur wenn Name gültig ist) ***
    if (isValid && name.value.trim()) {
      const currentId = editMode ? currentSupplier?.id : undefined;
      try {
        const nameExists = await supplierApi.checkSupplierNameExists(name.value.trim(), currentId);
        if (nameExists) {
          setName({ value: name.value, error: true, helperText: 'Ein Lieferant mit diesem Namen existiert bereits.' });
          isValid = false;
        }
      } catch (error) {
        console.error("Fehler bei der Prüfung des Lieferantennamens:", error);
        setSnackbar({ open: true, message: 'Fehler bei der Namensprüfung.', severity: 'error' });
        isValid = false; // Im Zweifel blockieren
      }
    }

    return isValid;
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
        <Tooltip title="Daten neu laden">
          <IconButton onClick={loadSuppliers} color="primary">
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {viewMode ? 'Lieferantendetails' : (editMode ? 'Lieferant bearbeiten' : 'Neuen Lieferant erstellen')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ pt: 1 }}>
            {/* Linke Spalte: Allgemeine Infos & Kontakt */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Allgemeine Informationen</Typography>
              <TextField
                label="Lieferantenname"
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
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
              />
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
                      <WebsiteIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Kontakt</Typography>
              <TextField
                label="Ansprechpartner"
                fullWidth
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ContactPersonIcon />
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

            {/* Rechte Spalte: Adresse, Vertrag & Sonstiges */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Adresse</Typography>
              <TextField
                label="Adresse"
                fullWidth
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={8}>
                  <TextField
                    label="Stadt"
                    fullWidth
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={viewMode}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="PLZ"
                    fullWidth
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={viewMode}
                  />
                </Grid>
              </Grid>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Vertragsdetails & Notizen</Typography>
              <TextField
                label="Vertragsnummer"
                fullWidth
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ContractIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Notizen"
                fullWidth
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={viewMode}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <NoteIcon />
                    </InputAdornment>
                  ),
                }}
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
                label="Lieferant aktiv"
                sx={{ display: 'block', mt: 1 }}
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

      {/* *** NEU: Confirmation Dialog for Delete *** */}
      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Lieferant löschen?"
        message={`Möchten Sie den Lieferant "${supplierToDelete?.name}" wirklich endgültig löschen?`}
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

export default Suppliers;
