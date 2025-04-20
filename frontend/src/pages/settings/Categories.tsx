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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { categoryApi } from '../../api/api';
import handleApiError from '../../utils/errorHandler';
import { Category, CategoryCreate, CategoryUpdate } from '../../types/settings';
import { toCamelCase, toSnakeCase } from '../../utils/caseConverter';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Add missing type/interface if needed from the file
interface SelectOption {
  id: number;
  label: string;
}

// Interface für ContextMenu-Status
interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  item: Category | null;
}

// Interface für Snackbar-Status
interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
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
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | ''>('');
  const [newCategoryIsActive, setNewCategoryIsActive] = useState<boolean>(true);
  const [parentCategoryOptions, setParentCategoryOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [nameError, setNameError] = useState<string>('');
  const [parentError, setParentError] = useState<string>('');

  // State für Snackbar
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // State für ConfirmationDialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<Category | null>(null);

  // State für ContextMenu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
            handleViewCategory(row);
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
                acc.push({ id: cat.id, label: cat.name });
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
    setNewCategoryParentId('');
    setNewCategoryIsActive(true);
    setModalOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (category: Category) => {
    setIsEditing(true);
    setCurrentCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryParentId(category.parentId || '');
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
  const handleCloseDialog = () => {
    setModalOpen(false);
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

    const categoryData: CategoryCreate | CategoryUpdate = {
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim(),
      isActive: newCategoryIsActive,
      parentId: typeof newCategoryParentId === 'number' ? newCategoryParentId : null,
    };

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

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, categoryId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      item: categories.find(c => c.id === categoryId) || null
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const category = categories.find(c => c.id === contextMenu.item?.id);
      if (category) {
        handleViewCategory(category);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const category = categories.find(c => c.id === contextMenu.item?.id);
      if (category) {
        handleEdit(category);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const category = categories.find(c => c.id === contextMenu.item?.id);
      if (category) {
        handleDeleteRequest(category);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige der Kategorie beim Klick auf den Namen
  const handleViewCategory = (category: Category) => {
    setIsEditing(false);
    setCurrentCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || '');
    setNewCategoryParentId(category.parentId || '');
    setNewCategoryIsActive(category.isActive ?? true);
    setModalOpen(true);
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
        <Tooltip title="Daten neu laden">
          <IconButton onClick={handleRefresh} color="primary">
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
            rows={categories}
            heightPx={600}
            emptyMessage="Keine Kategorien vorhanden"
            initialSortColumn="name"
            initialSortDirection="asc"
            onRowClick={handleViewCategory}
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
      <Dialog open={modalOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? `Kategorie bearbeiten: ${currentCategory?.name}` : 'Neue Kategorie erstellen'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />
            <TextField
              label="Beschreibung"
              fullWidth
              multiline
              rows={3}
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
            />
            <FormControlLabel
              control={
                <MuiSwitch
                  checked={newCategoryIsActive}
                  onChange={(e) => setNewCategoryIsActive(e.target.checked)}
                  color="primary"
                />
              }
              label="Kategorie aktiv"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Abbrechen
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" disableElevation>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={executeDelete}
        title="Kategorie löschen?"
        message={`Möchten Sie die Kategorie "${itemToDelete?.name}" wirklich endgültig löschen? Dies kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
      />

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

export default Categories;
