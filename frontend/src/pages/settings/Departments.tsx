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
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { departmentApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { Department, DepartmentCreate, DepartmentUpdate } from '../../types/settings';
import { toCamelCase } from '../../utils/caseConverter';

const Departments: React.FC = () => {
  // State für die Daten
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
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
    departmentId: number;
  } | null>(null);

  // Spalten für die Tabelle mit zusätzlicher Aktionsspalte
  const columns: AtlasColumn<Department>[] = [
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
            handleViewDepartment(row);
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
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      // 1. Antwortobjekt von der API abrufen
      const response = await departmentApi.getAll();
      console.log('DEBUG: Rohdaten von API (Response Objekt):', response);

      // 2. Prüfen, ob die Antwort erfolgreich war und Daten enthält
      if (response && response.data) { // Zugriff auf response.data
        // 3. Daten aus response.data in camelCase konvertieren
        const formattedDepartments = response.data.map(dept => toCamelCase(dept) as Department);
        console.log('DEBUG: Konvertierte Daten (camelCase):', formattedDepartments);

        // 4. Konvertierte Daten im State speichern
        setDepartments(formattedDepartments);
      } else {
        // Fallback, falls die Datenstruktur unerwartet ist
        console.warn('Unerwartete Datenstruktur von departmentApi.getAll:', response);
        setDepartments([]); // Tabelle leeren oder alte Daten behalten?
      }

    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Abteilungen: ${errorMessage}`,
        severity: 'error'
      });
      setDepartments([]); // Tabelle im Fehlerfall leeren
    } finally {
      setLoading(false);
    }
  };

  // Dialog öffnen für neuen Eintrag
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentDepartment(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (department: Department) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentDepartment(department);
    setName(department.name);
    setDescription(department.description);
    setIsActive(department.isActive ?? true);
    setDialogOpen(true);
  };

  // Löschen einer Abteilung
  const handleDelete = async (department: Department) => {
    if (!window.confirm(`Möchten Sie die Abteilung "${department.name}" wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await departmentApi.delete(department.id);

      // Neu laden statt nur lokale Liste aktualisieren
      loadDepartments();

      setSnackbar({
        open: true,
        message: `Abteilung "${department.name}" wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Abteilung: ${errorMessage}`,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Speichern der Abteilung
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

    const departmentData: DepartmentCreate | DepartmentUpdate = {
      name: name.trim(),
      description: description.trim(),
      isActive: isActive
    };

    try {
      setLoading(true);

      if (editMode && currentDepartment) {
        // Bearbeiten
        await departmentApi.update(currentDepartment.id, departmentData);

        // Neu laden statt nur lokale Liste aktualisieren
        loadDepartments();

        setSnackbar({
          open: true,
          message: `Abteilung "${name}" wurde aktualisiert.`,
          severity: 'success'
        });
      } else {
        // Neu erstellen
        await departmentApi.create(departmentData as DepartmentCreate);

        // Neu laden statt nur lokale Liste aktualisieren
        loadDepartments();

        setSnackbar({
          open: true,
          message: `Abteilung "${name}" wurde erstellt.`,
          severity: 'success'
        });
      }

      setDialogOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern der Abteilung: ${errorMessage}`,
        severity: 'error'
      });
    }
  };

  // Aktualisieren der Daten
  const handleRefresh = () => {
    loadDepartments();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handlefunktionen für das Kontextmenü
  const handleContextMenu = (event: React.MouseEvent, departmentId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      departmentId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleContextMenuView = () => {
    if (contextMenu) {
      const department = departments.find(d => d.id === contextMenu.departmentId);
      if (department) {
        setEditMode(false);
        setReadOnly(true);
        setCurrentDepartment(department);
        setName(department.name);
        setDescription(department.description);
        setIsActive(department.isActive ?? true);
        setDialogOpen(true);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const department = departments.find(d => d.id === contextMenu.departmentId);
      if (department) {
        handleEdit(department);
      }
      handleContextMenuClose();
    }
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const department = departments.find(d => d.id === contextMenu.departmentId);
      if (department) {
        handleDelete(department);
      }
      handleContextMenuClose();
    }
  };

  // Neue Funktion für die Anzeige der Abteilung beim Klick auf den Namen
  const handleViewDepartment = (department: Department) => {
    setEditMode(false);
    setReadOnly(true);
    setCurrentDepartment(department);
    setName(department.name);
    setDescription(department.description);
    setIsActive(department.isActive ?? true);
    setDialogOpen(true);
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
            Abteilungsverwaltung
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
          Neue Abteilung
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
            rows={departments}
            heightPx={600}
            emptyMessage="Keine Abteilungen vorhanden"
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
          {readOnly ? `Abteilung anzeigen: ${currentDepartment?.name}` :
            (editMode ? `Abteilung bearbeiten: ${currentDepartment?.name}` : 'Neue Abteilung erstellen')}
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
            <FormControlLabel
              control={
                <MuiSwitch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  name="isActive"
                  disabled={readOnly}
                />
              }
              label="Aktiv"
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Departments;
