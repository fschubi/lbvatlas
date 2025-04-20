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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  CircularProgress,
  Chip,
  FormHelperText,
  SelectChangeEvent,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LaptopChromebook as DeviceModelIcon,
  Memory as RamIcon,
  DeveloperBoard as CpuIcon,
  Save as HddIcon,
  Category as CategoryIcon,
  Factory as ManufacturerIcon,
  Description as DescriptionIcon,
  Info as InfoIcon,
  CalendarMonth as WarrantyIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import {
  DeviceModel,
  DeviceModelCreate,
  DeviceModelUpdate,
  deviceModelsApi,
} from '../../utils/api'; // DeviceModel-Typen und API importieren
import { settingsApi } from '../../utils/api'; // Für Hersteller & Kategorien
import { Manufacturer, Category } from '../../types/settings'; // Typen importieren
import handleApiError from '../../utils/errorHandler';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Typ für den Formularstatus
interface DeviceModelFormData {
    name: string;
    description: string;
    manufacturerId: number | '';
    categoryId: number | '';
    specifications: string;
    cpu: string;
    ram: string;
    hdd: string;
    warrantyMonths: number | '';
    isActive: boolean;
}

const initialFormData: DeviceModelFormData = {
    name: '',
    description: '',
    manufacturerId: '',
    categoryId: '',
    specifications: '',
    cpu: '',
    ram: '',
    hdd: '',
    warrantyMonths: '',
    isActive: true,
};

const DeviceModels: React.FC = () => {
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<DeviceModel | null>(null);
  const [formData, setFormData] = useState<DeviceModelFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<DeviceModel | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsResponse, manufacturersResponse, categoriesResponse] = await Promise.all([
        deviceModelsApi.getAll(),
        settingsApi.getAllManufacturers(),
        settingsApi.getAllCategories(),
      ]);

      if (modelsResponse.success && Array.isArray(modelsResponse.data)) {
        setDeviceModels(modelsResponse.data); // toCamelCase wird in apiRequest gemacht
      } else {
        throw new Error(modelsResponse.message || 'Fehler beim Laden der Gerätemodelle');
      }

      if (manufacturersResponse.success && Array.isArray(manufacturersResponse.data)) {
        setManufacturers(manufacturersResponse.data);
      } else {
        throw new Error(manufacturersResponse.message || 'Fehler beim Laden der Hersteller');
      }

      if (categoriesResponse.success && Array.isArray(categoriesResponse.data)) {
        setCategories(categoriesResponse.data);
      } else {
        throw new Error(categoriesResponse.message || 'Fehler beim Laden der Kategorien');
      }

    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setSnackbar({
        open: true,
        message: handleApiError(error),
        severity: 'error',
      });
      setDeviceModels([]);
      setManufacturers([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<number | ''>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  };

  const handleAddNew = () => {
    setEditMode(false);
    setCurrentModel(null);
    setFormData(initialFormData);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (model: DeviceModel) => {
    setEditMode(true);
    setCurrentModel(model);
    setFormData({
        name: model.name || '',
        description: model.description || '',
        manufacturerId: model.manufacturerId || '',
        categoryId: model.categoryId || '',
        specifications: model.specifications || '',
        cpu: model.cpu || '',
        ram: model.ram || '',
        hdd: model.hdd || '',
        warrantyMonths: model.warrantyMonths ?? '',
        isActive: model.isActive ?? true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const validateForm = async (): Promise<boolean> => {
    let errors: { [key: string]: string } = {};
    const { name, manufacturerId, categoryId, warrantyMonths } = formData;

    if (!name.trim()) errors.name = 'Modellname ist erforderlich.';
    if (!manufacturerId) errors.manufacturerId = 'Hersteller ist erforderlich.';
    if (!categoryId) errors.categoryId = 'Kategorie ist erforderlich.';
    if (warrantyMonths && isNaN(Number(warrantyMonths))) errors.warrantyMonths = 'Garantie muss eine Zahl sein.';

    if (name.trim() && manufacturerId) {
      try {
        const nameExists = await deviceModelsApi.checkDeviceModelNameExists(
          name.trim(),
          Number(manufacturerId),
          editMode ? currentModel?.id : undefined
        );
        if (nameExists) {
          errors.name = 'Ein Modell mit diesem Namen existiert bereits für diesen Hersteller.';
        }
      } catch (error) {
        console.error("Fehler bei Namensprüfung:", error);
        errors.name = "Fehler bei der Prüfung des Modellnamens.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setSaveLoading(true);
    const isValid = await validateForm();
    if (!isValid) {
      setSaveLoading(false);
      return;
    }

    const modelPayload: Partial<DeviceModelCreate | DeviceModelUpdate> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        manufacturerId: Number(formData.manufacturerId),
        categoryId: Number(formData.categoryId),
        specifications: formData.specifications.trim() || undefined,
        cpu: formData.cpu.trim() || undefined,
        ram: formData.ram.trim() || undefined,
        hdd: formData.hdd.trim() || undefined,
        warrantyMonths: formData.warrantyMonths ? Number(formData.warrantyMonths) : undefined,
        isActive: formData.isActive,
    };

    try {
      let response;
      const modelName = modelPayload.name; // Für Snackbar
      if (editMode && currentModel) {
        response = await deviceModelsApi.update(currentModel.id, modelPayload as DeviceModelUpdate);
      } else {
        response = await deviceModelsApi.create(modelPayload as DeviceModelCreate);
      }

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || `Gerätemodell "${modelName}" erfolgreich ${editMode ? 'aktualisiert' : 'erstellt'}.`,
          severity: 'success',
        });
        handleCloseDialog();
        await loadData();
      } else {
        setSnackbar({
          open: true,
          message: response.message || `Fehler beim Speichern des Gerätemodells.`,
          severity: 'error',
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: handleApiError(error),
        severity: 'error',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRequest = (model: DeviceModel) => {
    setModelToDelete(model);
    setConfirmDeleteDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setModelToDelete(null);
  };

  const executeDelete = async () => {
    if (!modelToDelete) return;
    setSaveLoading(true); // Reuse saveLoading state for delete operation indication
    try {
      const response = await deviceModelsApi.delete(modelToDelete.id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || `Gerätemodell "${modelToDelete.name}" gelöscht.`,
          severity: 'success',
        });
        await loadData();
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Löschen.',
          severity: 'error',
        });
      }
    } catch (error: any) {
        // Spezifischen 409-Fehler abfangen
        if (error?.message?.includes('verwendet wird')) {
             setSnackbar({
                open: true,
                message: error.message, // Zeige die spezifische Fehlermeldung an
                severity: 'error',
            });
        } else {
            setSnackbar({
                open: true,
                message: handleApiError(error),
                severity: 'error',
            });
        }
    } finally {
      setSaveLoading(false);
      handleCloseConfirmDialog();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const columns: AtlasColumn<DeviceModel>[] = [
    // { dataKey: 'id', label: 'ID', width: 70, numeric: true, sortable: true }, // Ausgeblendet
    { dataKey: 'name', label: 'Modellname', width: 250, sortable: true },
    {
      dataKey: 'manufacturerName',
      label: 'Hersteller',
      width: 180,
      sortable: true,
      render: (value, row) => value || `ID: ${row.manufacturerId}`
    },
    {
      dataKey: 'categoryName',
      label: 'Kategorie',
      width: 180,
      sortable: true,
      render: (value, row) => value || `ID: ${row.categoryId}`
    },
    // Ausgeblendete Spalten
    // { dataKey: 'cpu', label: 'CPU', width: 150, sortable: true },
    // { dataKey: 'ram', label: 'RAM', width: 100, sortable: true },
    // { dataKey: 'hdd', label: 'HDD/SSD', width: 100, sortable: true },
    { dataKey: 'warrantyMonths', label: 'Garantie (Mon.)', width: 120, numeric: true, sortable: true },
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
        dataKey: 'deviceCount',
        label: 'Geräte',
        width: 100,
        numeric: true,
        sortable: true,
        render: (value) => value ?? 0
    },
    {
      dataKey: 'actions',
      label: 'Aktionen',
      width: 100,
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="Bearbeiten">
            <IconButton size="small" onClick={() => handleEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Löschen">
            <IconButton size="small" onClick={() => handleDeleteRequest(row)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <DeviceModelIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">Gerätemodelle verwalten</Typography>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNew}>
          Neues Gerätemodell
        </Button>
      </Box>

      <Paper elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={columns}
            rows={deviceModels}
            loading={loading}
            heightPx={600}
            initialSortColumn="name"
            initialSortDirection="asc"
            emptyMessage="Keine Gerätemodelle gefunden."
          />
        )}
      </Paper>

      {/* Dialog für Erstellen/Bearbeiten */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? `Gerätemodell bearbeiten: ${currentModel?.name}` : 'Neues Gerätemodell erstellen'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Linke Spalte */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Modellname"
                name="name"
                fullWidth
                margin="normal"
                variant="outlined"
                value={formData.name}
                onChange={handleInputChange}
                required
                error={!!formErrors.name}
                helperText={formErrors.name}
                InputProps={{ startAdornment: <InputAdornment position="start"><DeviceModelIcon /></InputAdornment> }}
              />
              <FormControl fullWidth margin="normal" required error={!!formErrors.manufacturerId}>
                <InputLabel id="manufacturer-label">Hersteller</InputLabel>
                <Select
                  labelId="manufacturer-label"
                  name="manufacturerId"
                  value={formData.manufacturerId}
                  label="Hersteller"
                  onChange={handleInputChange}
                  startAdornment={<InputAdornment position="start"><ManufacturerIcon /></InputAdornment>}
                >
                  <MenuItem value=""><em>Bitte wählen</em></MenuItem>
                  {manufacturers.map((man) => (
                    <MenuItem key={man.id} value={man.id}>{man.name}</MenuItem>
                  ))}
                </Select>
                 {formErrors.manufacturerId && <FormHelperText>{formErrors.manufacturerId}</FormHelperText>}
              </FormControl>
               <FormControl fullWidth margin="normal" required error={!!formErrors.categoryId}>
                <InputLabel id="category-label">Kategorie</InputLabel>
                <Select
                  labelId="category-label"
                  name="categoryId"
                  value={formData.categoryId}
                  label="Kategorie"
                  onChange={handleInputChange}
                   startAdornment={<InputAdornment position="start"><CategoryIcon /></InputAdornment>}
                >
                  <MenuItem value=""><em>Bitte wählen</em></MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
                 {formErrors.categoryId && <FormHelperText>{formErrors.categoryId}</FormHelperText>}
              </FormControl>
               <TextField
                label="Beschreibung"
                name="description"
                fullWidth
                multiline
                rows={3}
                margin="normal"
                variant="outlined"
                value={formData.description}
                onChange={handleInputChange}
                InputProps={{ startAdornment: <InputAdornment position="start"><DescriptionIcon /></InputAdornment> }}
              />
            </Grid>

            {/* Rechte Spalte */}
            <Grid item xs={12} md={6}>
               <TextField
                label="Spezifikationen"
                name="specifications"
                fullWidth
                multiline
                rows={3}
                margin="normal"
                variant="outlined"
                value={formData.specifications}
                onChange={handleInputChange}
                 InputProps={{ startAdornment: <InputAdornment position="start"><InfoIcon /></InputAdornment> }}
              />
               <Grid container spacing={2}>
                  <Grid item xs={6}>
                     <TextField
                        label="CPU"
                        name="cpu"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={formData.cpu}
                        onChange={handleInputChange}
                        InputProps={{ startAdornment: <InputAdornment position="start"><CpuIcon /></InputAdornment> }}
                    />
                 </Grid>
                  <Grid item xs={6}>
                    <TextField
                        label="RAM"
                        name="ram"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={formData.ram}
                        onChange={handleInputChange}
                         InputProps={{ startAdornment: <InputAdornment position="start"><RamIcon /></InputAdornment> }}
                    />
                 </Grid>
               </Grid>
                 <Grid container spacing={2}>
                   <Grid item xs={6}>
                     <TextField
                        label="HDD/SSD"
                        name="hdd"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={formData.hdd}
                        onChange={handleInputChange}
                         InputProps={{ startAdornment: <InputAdornment position="start"><HddIcon /></InputAdornment> }}
                    />
                 </Grid>
                   <Grid item xs={6}>
                    <TextField
                        label="Garantie (Monate)"
                        name="warrantyMonths"
                        type="number"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={formData.warrantyMonths}
                        onChange={handleInputChange}
                        error={!!formErrors.warrantyMonths}
                        helperText={formErrors.warrantyMonths}
                         InputProps={{
                            startAdornment: <InputAdornment position="start"><WarrantyIcon /></InputAdornment>,
                            inputProps: { min: 0 }
                         }}
                    />
                 </Grid>
               </Grid>
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={formData.isActive}
                    onChange={handleSwitchChange}
                    name="isActive"
                    color="primary"
                  />
                }
                label="Modell aktiv"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saveLoading}>Abbrechen</Button>
          <Button onClick={handleSave} color="primary" variant="contained" disabled={saveLoading}>
            {saveLoading ? <CircularProgress size={24} /> : (editMode ? 'Speichern' : 'Erstellen')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Gerätemodell löschen?"
        message={`Möchten Sie das Gerätemodell "${modelToDelete?.name}" wirklich löschen? Dies ist nicht möglich, wenn dem Modell noch Geräte zugewiesen sind.`}
        confirmText="Löschen"
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceModels;
