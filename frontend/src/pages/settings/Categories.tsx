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
  ListItemIcon,
  ListItemText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import TableContextMenu, { MenuAction } from '../../components/TableContextMenu';
import { categoryApi } from '../../api/api';
import handleApiError from '../../utils/errorHandler';
import { Category, CategoryCreate, CategoryUpdate } from '../../types/settings';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Interface für Snackbar-Status
interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Korrigiere die SelectOption-Schnittstelle
interface SelectOption {
  id: number;
  label: string;
  value?: number; // Füge das fehlende value-Feld hinzu
}

const Categories = () => {
  // State für die Daten
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryDescription, setNewCategoryDescription] = useState<string>('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [newCategoryIsActive, setNewCategoryIsActive] = useState<boolean>(true);
  const [parentCategoryOptions, setParentCategoryOptions] = useState<SelectOption[]>([]);
  const [nameError, setNameError] = useState<string>('');
  const [parentError, setParentError] = useState<string>('');
  const [viewOnly, setViewOnly] = useState<boolean>(false); // Neue State-Variable für Nur-Lese-Modus

  // State für Snackbar
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // State für ConfirmationDialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);

  // State für Suche
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Platzhalter für Berechtigungen
  const { hasPermission } = { hasPermission: (p: string) => true }; // usePermissions(); // Auskommentiert
  const canCreate = hasPermission('categories.create');
  const canUpdate = hasPermission('categories.update');
  const canDelete = hasPermission('categories.delete');

  // Spalten für die Tabelle
  const columns: AtlasColumn<Category>[] = [
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
            handleViewDetailsOnly(row);
          }}
        >
          {value}
        </Box>
      )
    },
    { dataKey: 'description', label: 'Beschreibung' },
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
      render: (value) => value ? new Date(value as string).toLocaleDateString('de-DE') : '-'
    },
    {
      dataKey: 'parentId',
      label: 'Elternkategorie',
      width: 180,
      render: (value) => getParentCategoryName(value as number | null)
    }
  ];

  // Daten laden (mit Korrektur für API-Antwort und Typisierung)
  const loadCategories = useCallback(async () => {
    console.log('[Categories] Loading categories...');
    setLoading(true);
    setCategories([]); // Clear existing data before loading
    setParentCategoryOptions([]);
    try {
      // categoryApi.getAll() gibt direkt Category[] zurück (gemäß api.ts)
      const fetchedCategories: Category[] = await categoryApi.getAll();
      // Korrigiere die Zuweisung
      setCategories(fetchedCategories || []); // Stelle sicher, dass es ein Array ist, falls API undefined liefert
      console.log('[Categories] Fetched categories:', fetchedCategories);

      // Create options for parent category dropdown
      if (Array.isArray(fetchedCategories)) { // Prüfe zur Sicherheit
        const options = fetchedCategories.reduce((acc: SelectOption[], cat: Category) => {
            if (cat.isActive) {
                acc.push({ id: cat.id, label: cat.name, value: cat.id });
            }
            return acc;
        }, []);
        setParentCategoryOptions(options);
        console.log('[Categories] Parent category options set:', options);
      }

    } catch (error) {
      console.error('[Categories] Error loading categories:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Kategorien: ${errorMessage}`,
        severity: 'error'
      });
      setCategories([]);
      setParentCategoryOptions([]);
    } finally {
      console.log('[Categories] Finished loading, setLoading(false)');
      setLoading(false);
    }
  }, []);

  // --- useEffect Hook hinzufügen --- //
  useEffect(() => {
    console.log('[Categories] Component mounted, calling loadCategories.');
    loadCategories();
  }, [loadCategories]); // Dependency array includes the useCallback function

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentCategory(null);
    setNewCategoryName('');
    setNewCategoryDescription('');
    setNewCategoryParentId(null);
    setNewCategoryIsActive(true);
    setModalOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (category: Category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryParentId(category.parentId || null);
    setNewCategoryIsActive(category.isActive ?? true);
    setModalOpen(true);
  };

  // Step 1: Prepare for delete confirmation
  const handleDeleteRequest = (category: Category) => {
    setItemToDelete(category);
    setConfirmDialogOpen(true);
  };

  // Step 2: Actual delete logic
  const executeDelete = async () => {
    if (!itemToDelete) return;

    // Close the confirmation dialog first
    setConfirmDialogOpen(false);

    try {
      setLoading(true);
      await categoryApi.delete(itemToDelete.id);
      loadCategories(); // Reload data
      setSnackbar({
        open: true,
        message: `Kategorie "${itemToDelete.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Kategorie: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setItemToDelete(null); // Clear the category to delete
    }
  };

  // Step 3: Close confirmation dialog without deleting
   const handleCloseConfirmDialog = () => {
      setConfirmDialogOpen(false);
      setItemToDelete(null);
   };

  // Dialog schließen
  const handleCloseModal = () => {
    setModalOpen(false);
    resetForm();
  };

  // Speichern der Kategorie
  const handleSave = async () => {
    if (!newCategoryName.trim()) {
      setSnackbar({ open: true, message: 'Bitte geben Sie einen Namen ein.', severity: 'error' });
      return;
    }

    // Prevent saving if name already exists (check only if name changed or new category)
    const isNew = !isEditing;
    const nameChanged = isEditing && currentCategory && newCategoryName !== currentCategory.name;

    if (isNew || nameChanged) {
        const nameExists = await categoryApi.checkCategoryNameExists(newCategoryName, currentCategory?.id);
        if (nameExists) {
            setSnackbar({ open: true, message: `Eine Kategorie mit dem Namen "${newCategoryName}" existiert bereits.`, severity: 'warning' });
            return;
        }
    }

    // Erstellen eines typkonformen Objekts - parentId verarbeiten
    const categoryData = {
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim(),
      isActive: newCategoryIsActive,
    } as CategoryCreate | CategoryUpdate;

    // Nur setzen wenn nicht null, sonst weglassen (undefined)
    if (newCategoryParentId !== null) {
      categoryData.parentId = newCategoryParentId;
    }

    setLoading(true); // Indicate loading during save
    try {
      if (isEditing && currentCategory) {
        console.log('[Categories] Updating category:', currentCategory.id, categoryData);
        await categoryApi.update(currentCategory.id, categoryData as CategoryUpdate);
        setSnackbar({ open: true, message: 'Kategorie erfolgreich aktualisiert.', severity: 'success' });
      } else {
        console.log('[Categories] Creating category:', categoryData);
        await categoryApi.create(categoryData as CategoryCreate);
        setSnackbar({ open: true, message: 'Kategorie erfolgreich erstellt.', severity: 'success' });
      }
      setModalOpen(false);
      loadCategories(); // Reload data after saving
    } catch (error) {
      console.error('[Categories] Error saving category:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Speichern: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoading(false); // Ensure loading is set to false
    }
  };

  // Aktualisieren der Daten
  const handleRefresh = () => {
    loadCategories();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handler für Aktionen aus dem Kontextmenü
  const handleContextMenuAction = (actionType: MenuAction | string, category: Category) => {
    switch (actionType) {
      case 'view':
        handleViewDetailsOnly(category);
        break;
      case 'edit':
        handleEdit(category);
        break;
      case 'delete':
        handleDeleteRequest(category);
        break;
      default:
        console.warn(`Unbekannte Aktion: ${actionType}`);
    }
  };

  // Separate Funktion für die Nur-Lese-Ansicht
  const handleViewDetailsOnly = (category: Category) => {
    setIsEditing(false);
    setViewOnly(true);
    setCurrentCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryParentId(category.parentId || null);
    setNewCategoryIsActive(category.isActive ?? true);
    setModalOpen(true);
  };

  // Neue Funktion für die Anzeige der Kategorie beim Klick auf den Namen - bearbeitbar
  const handleViewCategory = (category: Category) => {
    setIsEditing(false);
    setViewOnly(false);
    setCurrentCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryParentId(category.parentId || null);
    setNewCategoryIsActive(category.isActive ?? true);
    setModalOpen(true);
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setIsEditing(false);
    setViewOnly(false);
    setCurrentCategory(null);
    setNewCategoryName('');
    setNewCategoryDescription('');
    setNewCategoryParentId(null);
    setNewCategoryIsActive(true);
    setNameError('');
    setParentError('');
  };

  // Dropdown Wertänderung für Parent-Kategorie
  const handleParentChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    if (value === '' || value === 'none') {
      setNewCategoryParentId(null);
    } else {
      setNewCategoryParentId(Number(value));
    }
    setParentError('');
  };

  // Funktion um Elternkategorie-Namen zu erhalten
  const getParentCategoryName = (parentId: number | null | undefined): string => {
    if (!parentId) return 'Keine';
    const parent = categories.find(cat => cat.id === parentId);
    return parent ? parent.name : 'Unbekannt';
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
          <CategoryIcon sx={{ fontSize: 32, mr: 2, color: 'white' }} />
          <Typography variant="h5" component="h1">
            Kategorienverwaltung
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
          Neue Kategorie
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
            rows={categories}
            heightPx={600}
            emptyMessage="Keine Kategorien vorhanden"
            initialSortColumn="name"
            initialSortDirection="asc"
            onRowClick={handleViewDetailsOnly}
            useContextMenu={true}
            onContextMenuAction={handleContextMenuAction}
            contextMenuUsePosition={true}
          />
        )}
      </Paper>

      {/* Dialog für Erstellen/Bearbeiten/Ansehen */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? `Kategorie bearbeiten: ${currentCategory?.name}` :
           viewOnly ? `Kategorie anzeigen: ${currentCategory?.name}` : 'Neue Kategorie erstellen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Name"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setNameError('');
              }}
              disabled={viewOnly}
              error={!!nameError}
              helperText={nameError}
              autoFocus
            />
            <TextField
              fullWidth
              margin="normal"
              label="Beschreibung"
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              multiline
              rows={3}
              disabled={viewOnly}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="parent-category-label">Übergeordnete Kategorie</InputLabel>
              <Select
                labelId="parent-category-label"
                value={newCategoryParentId === null ? '' : newCategoryParentId.toString()}
                onChange={handleParentChange}
                disabled={viewOnly}
                error={!!parentError}
                label="Übergeordnete Kategorie"
              >
                <MenuItem value="">Keine</MenuItem>
                {categories
                  .filter(cat => cat.id !== currentCategory?.id) // Filter out current category
                  .map(category => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
              {parentError && (
                <FormHelperText error>{parentError}</FormHelperText>
              )}
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={
                  <MuiSwitch
                    checked={newCategoryIsActive}
                    onChange={(e) => setNewCategoryIsActive(e.target.checked)}
                    disabled={viewOnly}
                    color="primary"
                  />
                }
                label="Aktiv"
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit">
            Abbrechen
          </Button>
          {!viewOnly && (
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Speichern'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bestätigungsdialog für das Löschen */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        title="Kategorie löschen"
        message={`Sind Sie sicher, dass Sie die Kategorie "${itemToDelete?.name}" löschen möchten?`}
        onConfirm={executeDelete}
        onClose={handleCloseConfirmDialog}
      />

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Categories;
