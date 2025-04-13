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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Description as SpecIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Devices as DevicesIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { DeviceModel, Manufacturer, Category } from '../../types/settings';
import { deviceModelsApi, settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const DeviceModels: React.FC = () => {
  // State für die Daten
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<DeviceModel | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    modelId: number;
  } | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [manufacturerId, setManufacturerId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [specifications, setSpecifications] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [cpu, setCpu] = useState<string>('');
  const [ram, setRam] = useState<string>('');
  const [hdd, setHdd] = useState<string>('');
  const [warrantyMonths, setWarrantyMonths] = useState<string>('');

  // Validation State
  const [errors, setErrors] = useState<{
    name?: string;
    manufacturerId?: string;
    categoryId?: string;
    cpu?: string;
    ram?: string;
    hdd?: string;
    warrantyMonths?: string;
  }>({});

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

  // Mock-Daten für das Beispiel
  const mockManufacturers: Manufacturer[] = [
    {
      id: 1,
      name: 'Dell Technologies',
      description: 'US-amerikanischer Hersteller von PCs, Servern und Speichersystemen',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'HP Inc.',
      description: 'Hersteller von PCs, Druckern und anderen Peripheriegeräten',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Lenovo Group',
      description: 'Chinesischer Hersteller von PCs, Laptops und Mobilgeräten',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockCategories: Category[] = [
    {
      id: 1,
      name: 'Laptops',
      description: 'Tragbare Computer',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Desktop-PCs',
      description: 'Stationäre Computer',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Server',
      description: 'Serversysteme',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      name: 'Monitore',
      description: 'Bildschirme',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const mockDeviceModels: DeviceModel[] = [
    {
      id: 1,
      name: 'Latitude 5420',
      description: 'Business-Laptop für professionelle Anwender',
      manufacturerId: 1,
      categoryId: 1,
      specifications: 'Windows 11 Pro',
      cpu: 'Intel Core i5-1135G7',
      ram: '16GB DDR4 3200MHz',
      hdd: '512GB SSD NVMe',
      warrantyMonths: 36,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'OptiPlex 7090',
      description: 'Desktop-PC für Unternehmen',
      manufacturerId: 1,
      categoryId: 2,
      specifications: 'Windows 11 Pro',
      cpu: 'Intel Core i7-11700',
      ram: '32GB DDR4 3200MHz',
      hdd: '1TB SSD NVMe + 1TB HDD',
      warrantyMonths: 24,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'ThinkPad X1 Carbon',
      description: 'Premium Business-Laptop',
      manufacturerId: 3,
      categoryId: 1,
      specifications: 'Windows 11 Pro',
      cpu: 'Intel Core i7-1260P',
      ram: '16GB LPDDR5 5200MHz',
      hdd: '1TB SSD NVMe Gen4',
      warrantyMonths: 36,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 4,
      name: 'EliteBook 840',
      description: 'Business-Laptop mit hoher Sicherheit',
      manufacturerId: 2,
      categoryId: 1,
      specifications: 'Windows 11 Pro',
      cpu: 'Intel Core i5-1240P',
      ram: '8GB DDR4 3200MHz',
      hdd: '256GB SSD NVMe',
      warrantyMonths: 12,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Mock-Daten für die Anzahl der Geräte pro Modell
  const mockDeviceCount = {
    1: 24, // Latitude 5420: 24 Geräte
    2: 17, // OptiPlex 7090: 17 Geräte
    3: 8,  // ThinkPad X1 Carbon: 8 Geräte
    4: 3   // EliteBook 840: 3 Geräte
  };

  // Spalten für die Tabelle
  const columns: AtlasColumn<DeviceModel>[] = [
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
            handleViewModel(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
    {
      dataKey: 'manufacturerId',
      label: 'Hersteller',
      render: (value, row) => {
        // Prüfen auf beide mögliche Feldnamen (camelCase und snake_case)
        const manufacturerId = row.manufacturer_id !== undefined ? row.manufacturer_id : row.manufacturerId;
        const manufacturer = manufacturers.find(m => m.id === manufacturerId);
        return manufacturer ? manufacturer.name : '-';
      }
    },
    {
      dataKey: 'categoryId',
      label: 'Kategorie',
      render: (value, row) => {
        // Prüfen auf beide mögliche Feldnamen (camelCase und snake_case)
        const categoryId = row.category_id !== undefined ? row.category_id : row.categoryId;
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '-';
      }
    },
    {
      dataKey: 'deviceCount',
      label: 'Anzahl Geräte',
      width: 130,
      numeric: true,
      render: (_, row) => {
        const count = deviceCounts[row.id] || 0;
        return (
          <Chip
            label={count.toString()}
            color={count > 0 ? 'primary' : 'default'}
            size="small"
            sx={{
              minWidth: '60px',
              fontWeight: count > 0 ? 'bold' : 'normal'
            }}
          />
        );
      }
    },
    {
      dataKey: 'isActive',
      label: 'Status',
      width: 120,
      render: (value, row) => {
        // Prüfen auf beide mögliche Feldnamen (camelCase und snake_case)
        const isActive = row.is_active !== undefined ? row.is_active : row.isActive;
        return (
          <Chip
            label={isActive ? 'Aktiv' : 'Inaktiv'}
            color={isActive ? 'success' : 'default'}
            size="small"
            variant="outlined"
          />
        );
      }
    },
    {
      dataKey: 'createdAt',
      label: 'Erstellt am',
      width: 180,
      render: (value) => value ? new Date(value as string).toLocaleDateString('de-DE') : '-'
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
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      // API-Anfragen für alle Daten parallel ausführen
      const [modelsResponse, manufacturersResponse, categoriesResponse] = await Promise.all([
        deviceModelsApi.getAll(),
        settingsApi.getAllManufacturers(),
        settingsApi.getAllCategories()
      ]);

      // Daten setzen - auch leere Arrays sind gültige Ergebnisse!
      const modelsData = modelsResponse?.data || [];
      const manufacturersResult = manufacturersResponse?.data || [];
      const categoriesResult = categoriesResponse?.data || [];

      console.log("Geladene Daten:", {
        models: modelsData,
        manufacturers: manufacturersResult,
        categories: categoriesResult
      });

      // Daten aus der API verwenden, auch wenn diese leer sind
      setDeviceModels(modelsData);
      setManufacturers(manufacturersResult);
      setCategories(categoriesResult);

      // Gerätezahl aus den Daten extrahieren
      const countMap: Record<number, number> = {};
      modelsData.forEach((model: any) => {
        countMap[model.id] = parseInt(model.device_count || '0');
      });
      setDeviceCounts(countMap);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Gerätemodelle: ${errorMessage}`,
        severity: 'error'
      });

      // Im Fehlerfall leere Arrays anzeigen
      setDeviceModels([]);
      setManufacturers([]);
      setCategories([]);
      setDeviceCounts({});
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentModel(null);
    resetForm();
    setDialogOpen(true);
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setName('');
    setDescription('');
    setManufacturerId('');
    setCategoryId('');
    setSpecifications('');
    setIsActive(true);
    setCpu('');
    setRam('');
    setHdd('');
    setWarrantyMonths('');
    setErrors({});
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (model: DeviceModel) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentModel(model);
    setName(model.name);
    setDescription(model.description || '');
    setManufacturerId(model.manufacturer_id || model.manufacturerId || '');
    setCategoryId(model.category_id || model.categoryId || '');
    setSpecifications(model.specifications || '');
    setCpu(model.cpu || '');
    setRam(model.ram || '');
    setHdd(model.hdd || '');
    setWarrantyMonths(model.warranty_months?.toString() || model.warrantyMonths?.toString() || '');
    setIsActive(model.is_active === undefined ? (model.isActive === undefined ? true : model.isActive) : model.is_active);
    setErrors({});
    setDialogOpen(true);
  };

  // Löschen eines Modells
  const handleDelete = async (model: DeviceModel) => {
    if (!window.confirm(`Möchten Sie das Gerätemodell "${model.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await deviceModelsApi.delete(model.id);

      // Neu laden statt nur lokale Liste aktualisieren
      loadModels();

      setSnackbar({
        open: true,
        message: `Gerätemodell "${model.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Gerätemodells: ${errorMessage}`,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Kontextmenü öffnen
  const handleContextMenu = (event: React.MouseEvent, modelId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      modelId
    });
  };

  // Kontextmenü schließen
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Ansicht im Kontextmenü
  const handleContextMenuView = () => {
    const model = deviceModels.find(m => m.id === contextMenu?.modelId);
    if (model) {
      handleViewModel(model);
    }
    handleContextMenuClose();
  };

  // Bearbeitung im Kontextmenü
  const handleContextMenuEdit = () => {
    const model = deviceModels.find(m => m.id === contextMenu?.modelId);
    if (model) {
      handleEdit(model);
    }
    handleContextMenuClose();
  };

  // Löschen im Kontextmenü
  const handleContextMenuDelete = () => {
    const model = deviceModels.find(m => m.id === contextMenu?.modelId);
    if (model) {
      handleDelete(model);
    }
    handleContextMenuClose();
  };

  // Anzeigen eines Modells
  const handleViewModel = (model: DeviceModel) => {
    setEditMode(true);
    setReadOnly(true);
    setCurrentModel(model);
    setName(model.name);
    setDescription(model.description || '');
    setManufacturerId(model.manufacturer_id || model.manufacturerId || '');
    setCategoryId(model.category_id || model.categoryId || '');
    setSpecifications(model.specifications || '');
    setCpu(model.cpu || '');
    setRam(model.ram || '');
    setHdd(model.hdd || '');
    setWarrantyMonths(model.warranty_months?.toString() || model.warrantyMonths?.toString() || '');
    setIsActive(model.is_active === undefined ? (model.isActive === undefined ? true : model.isActive) : model.is_active);
    setDialogOpen(true);
  };

  // Formular validieren
  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      manufacturerId?: string;
      categoryId?: string;
      warrantyMonths?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (manufacturerId === '') {
      newErrors.manufacturerId = 'Hersteller ist erforderlich';
    }

    if (categoryId === '') {
      newErrors.categoryId = 'Kategorie ist erforderlich';
    }

    if (warrantyMonths) {
      const months = parseInt(warrantyMonths, 10);
      if (isNaN(months) || months < 0) {
        newErrors.warrantyMonths = 'Bitte geben Sie eine positive Zahl ein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Speichern des Modells
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const modelData = {
      name,
      description,
      manufacturerId: typeof manufacturerId === 'number' ? manufacturerId : parseInt(manufacturerId as string, 10),
      categoryId: typeof categoryId === 'number' ? categoryId : parseInt(categoryId as string, 10),
      specifications,
      cpu,
      ram,
      hdd,
      warrantyMonths: warrantyMonths ? parseInt(warrantyMonths, 10) : undefined,
      isActive
    };

    try {
      setLoading(true);

      if (editMode && currentModel) {
        // Bearbeiten
        await deviceModelsApi.update(currentModel.id, modelData);
      } else {
        // Neu erstellen
        await deviceModelsApi.create(modelData);
      }

      // Neu laden
      loadModels();

      setSnackbar({
        open: true,
        message: `Gerätemodell "${name}" wurde ${editMode ? 'aktualisiert' : 'erstellt'}.`,
        severity: 'success'
      });

      setDialogOpen(false);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern des Gerätemodells: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Aktualisieren der Daten
  const handleRefresh = () => {
    loadModels();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DevicesIcon fontSize="large" color="primary" />
            <Typography variant="h5" component="h1">
              Gerätemodelle
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Aktualisieren
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              Neues Gerätemodell
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <AtlasTable
            columns={columns}
            rows={deviceModels}
          />
        )}
      </Paper>

      {/* Dialog für neues/bearbeiten/anzeigen */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {readOnly
            ? `Gerätemodell anzeigen: ${name}`
            : editMode
              ? `Gerätemodell bearbeiten: ${name}`
              : 'Neues Gerätemodell erstellen'
          }
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DevicesIcon />
                  </InputAdornment>
                )
              }}
            />

            <FormControl fullWidth margin="normal" error={!!errors.manufacturerId}>
              <Autocomplete
                value={manufacturers.find(m => m.id === manufacturerId) || null}
                onChange={(_, newValue) => {
                  setManufacturerId(newValue ? newValue.id : '');
                }}
                options={manufacturers}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Hersteller"
                    error={!!errors.manufacturerId}
                    helperText={errors.manufacturerId}
                  />
                )}
                disabled={readOnly}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </FormControl>

            <FormControl fullWidth margin="normal" error={!!errors.categoryId}>
              <Autocomplete
                value={categories.find(c => c.id === categoryId) || null}
                onChange={(_, newValue) => {
                  setCategoryId(newValue ? newValue.id : '');
                }}
                options={categories}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kategorie"
                    error={!!errors.categoryId}
                    helperText={errors.categoryId}
                  />
                )}
                disabled={readOnly}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </FormControl>

            <TextField
              label="Garantie (Monate)"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              error={!!errors.warrantyMonths}
              helperText={errors.warrantyMonths}
              type="number"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              label="CPU"
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              placeholder="z.B. Intel Core i7-12700K"
            />

            <TextField
              label="RAM"
              value={ram}
              onChange={(e) => setRam(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              placeholder="z.B. 16GB DDR4 3200MHz"
            />

            <TextField
              label="HDD"
              value={hdd}
              onChange={(e) => setHdd(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              placeholder="z.B. 512GB SSD NVMe"
            />

            <TextField
              label="Beschreibung"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              multiline
              rows={4}
              sx={{ gridColumn: { md: '1 / span 2' } }}
            />

            <TextField
              label="Spezifikationen"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              fullWidth
              margin="normal"
              disabled={readOnly}
              multiline
              rows={4}
              sx={{ gridColumn: { md: '1 / span 2' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SpecIcon />
                  </InputAdornment>
                )
              }}
            />

            <FormControlLabel
              control={
                <MuiSwitch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={readOnly}
                />
              }
              label="Aktiv"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {readOnly ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!readOnly && (
            <Button onClick={handleSave} variant="contained" color="primary">
              Speichern
            </Button>
          )}
        </DialogActions>
      </Dialog>

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
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Anzeigen</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleContextMenuEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bearbeiten</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleContextMenuDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Löschen</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeviceModels;
