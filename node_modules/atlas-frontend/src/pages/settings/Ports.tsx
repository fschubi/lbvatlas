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
  Router as RouterIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { NetworkPort } from '../../types/network';
import { networkPortsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';

const Ports: React.FC = () => {
  // State für die Daten
  const [ports, setPorts] = useState<NetworkPort[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [portNumber, setPortNumber] = useState<string>('');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [currentPort, setCurrentPort] = useState<NetworkPort | null>(null);
  const [readOnly, setReadOnly] = useState<boolean>(false);

  // Neuer State für das Kontextmenü
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    portId: number;
  } | null>(null);

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

  // Spalten für die Tabelle
  const columns: AtlasColumn<NetworkPort>[] = [
    {
      dataKey: 'port_number',
      label: 'Port #',
      width: 100,
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
            handleViewPort(row);
          }}
        >
          {value}
        </Box>
      )
    },
    {
      dataKey: 'created_at',
      label: 'Erstellt am',
      width: 180,
      render: (value) => new Date(value).toLocaleDateString('de-DE')
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
  const loadPorts = async () => {
    setLoading(true);
    try {
      const response = await networkPortsApi.getAll();
      console.log('API Response:', response);

      if (response.data?.success && Array.isArray(response.data.data)) {
        setPorts(response.data.data);
      } else {
        console.error('Unerwartetes Datenformat:', response);
        setSnackbar({
          open: true,
          message: 'Fehler beim Laden der Daten: Unerwartetes Format',
          severity: 'error'
        });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Load Error:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Ports: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPorts();
  }, []);

  // Dialog öffnen für neuen Port
  const handleAddNew = () => {
    setEditMode(false);
    setReadOnly(false);
    setCurrentPort(null);
    setPortNumber('');
    setDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (port: NetworkPort) => {
    setEditMode(true);
    setReadOnly(false);
    setCurrentPort(port);
    setPortNumber(port.port_number.toString());
    setDialogOpen(true);
  };

  // Port anzeigen
  const handleViewPort = (port: NetworkPort) => {
    setEditMode(true);
    setReadOnly(true);
    setCurrentPort(port);
    setPortNumber(port.port_number.toString());
    setDialogOpen(true);
  };

  // Kontextmenü öffnen
  const handleContextMenu = (event: React.MouseEvent, portId: number) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      portId
    });
  };

  // Kontextmenü schließen
  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Kontextmenü Aktionen
  const handleContextMenuView = () => {
    if (contextMenu) {
      const port = ports.find(p => p.id === contextMenu.portId);
      if (port) {
        handleViewPort(port);
      }
    }
    handleContextMenuClose();
  };

  const handleContextMenuEdit = () => {
    if (contextMenu) {
      const port = ports.find(p => p.id === contextMenu.portId);
      if (port) {
        handleEdit(port);
      }
    }
    handleContextMenuClose();
  };

  const handleContextMenuDelete = () => {
    if (contextMenu) {
      const port = ports.find(p => p.id === contextMenu.portId);
      if (port) {
        handleDelete(port);
      }
    }
    handleContextMenuClose();
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setReadOnly(false);
    setCurrentPort(null);
    setPortNumber('');
  };

  // Port löschen
  const handleDelete = async (port: NetworkPort) => {
    if (!window.confirm(`Möchten Sie Port ${port.port_number} wirklich löschen?`)) {
      return;
    }

    try {
      setLoading(true);
      await networkPortsApi.delete(port.id);
      loadPorts();
      setSnackbar({
        open: true,
        message: `Port ${port.port_number} wurde gelöscht.`,
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Ports: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Port speichern
  const handleSave = async () => {
    const portNumberValue = parseInt(portNumber, 10);
    if (isNaN(portNumberValue) || portNumberValue < 1 || portNumberValue > 48) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie eine gültige Portnummer zwischen 1 und 48 ein.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      if (editMode && currentPort) {
        // Port aktualisieren
        const response = await networkPortsApi.update(currentPort.id, { port_number: portNumberValue });
        if (response.data?.success) {
          await loadPorts();
          setSnackbar({
            open: true,
            message: `Port wurde aktualisiert.`,
            severity: 'success'
          });
          handleCloseDialog();
        }
      } else {
        // Neuen Port erstellen
        const response = await networkPortsApi.create({ port_number: portNumberValue });
        if (response.data?.success) {
          await loadPorts();
          setSnackbar({
            open: true,
            message: `Port ${portNumberValue} wurde erstellt.`,
            severity: 'success'
          });
          handleCloseDialog();
        }
      }
    } catch (error: any) {
      console.error('Save Error:', error);
      const errorMessage = handleApiError(error);
      if (errorMessage.includes('existiert bereits')) {
        setSnackbar({
          open: true,
          message: `Port ${portNumberValue} existiert bereits. Bitte wählen Sie eine andere Portnummer.`,
          severity: 'error'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Fehler beim ${editMode ? 'Aktualisieren' : 'Erstellen'} des Ports: ${errorMessage}`,
          severity: 'error'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Aktualisieren der Daten
  const handleRefresh = () => {
    loadPorts();
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'white',
          borderRadius: 0
        }}
      >
        <RouterIcon />
        <Typography variant="h6">Netzwerk-Ports</Typography>
      </Paper>

      {/* Action Button */}
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          Neuer Port
        </Button>
      </Box>

      {/* Tabelle */}
      <Paper
        elevation={1}
        sx={{
          mx: 2,
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <AtlasTable
          columns={columns}
          rows={ports}
          loading={loading}
          heightPx={600}
          emptyMessage="Keine Ports vorhanden"
        />
      </Paper>

      {/* Dialog für Port */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editMode ? (readOnly ? 'Port Details' : 'Port bearbeiten') : 'Neuer Port'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus={!readOnly}
              margin="dense"
              label="Portnummer"
              type="number"
              fullWidth
              value={portNumber}
              onChange={(e) => setPortNumber(e.target.value)}
              inputProps={{ min: 1, max: 48 }}
              error={snackbar.severity === 'error' && snackbar.message.includes('existiert bereits')}
              helperText={snackbar.severity === 'error' && snackbar.message.includes('existiert bereits') ?
                'Diese Portnummer existiert bereits' : ''}
              disabled={readOnly}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {readOnly ? 'Schließen' : 'Abbrechen'}
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Speichern'}
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
            <RouterIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Details anzeigen</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleContextMenuEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Bearbeiten</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleContextMenuDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Löschen</ListItemText>
        </MenuItem>
      </Menu>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Ports;
