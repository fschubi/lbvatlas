import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { networkPortsApi } from '../utils/api';
import { NetworkPort } from '../types/network';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';

const NetworkPorts: React.FC = () => {
  const [ports, setPorts] = useState<NetworkPort[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedPort, setSelectedPort] = useState<NetworkPort | null>(null);
  const [portNumber, setPortNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const columns: AtlasColumn[] = [
    { label: 'Port', dataKey: 'port_number', numeric: true, width: 100 },
    { label: 'Erstellt am', dataKey: 'created_at', width: 200 },
    { label: 'Aktionen', dataKey: 'actions', width: 150 },
  ];

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const response = await networkPortsApi.getAll();
      if (response.data && Array.isArray(response.data)) {
        setPorts(response.data);
      } else {
        console.error('Unerwartetes Datenformat:', response);
        setError('Unerwartetes Datenformat vom Server');
      }
    } catch (err) {
      console.error('Fehler beim Laden der Ports:', err);
      setError('Fehler beim Laden der Ports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleOpen = (port?: NetworkPort) => {
    if (port) {
      setSelectedPort(port);
      setPortNumber(port.port_number.toString());
    } else {
      setSelectedPort(null);
      setPortNumber('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPort(null);
    setPortNumber('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!portNumber || isNaN(parseInt(portNumber))) {
      setError('Bitte geben Sie eine gültige Portnummer ein');
      return;
    }

    try {
      if (selectedPort) {
        await networkPortsApi.update(selectedPort.id, { port_number: parseInt(portNumber) });
      } else {
        await networkPortsApi.create({ port_number: parseInt(portNumber) });
      }
      handleClose();
      fetchPorts();
    } catch (err: any) {
      console.error('Fehler beim Speichern des Ports:', err);
      setError(err.response?.data?.message || 'Fehler beim Speichern des Ports');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Möchten Sie diesen Port wirklich löschen?')) {
      try {
        await networkPortsApi.delete(id);
        fetchPorts();
      } catch (err: any) {
        console.error('Fehler beim Löschen des Ports:', err);
        setError(err.response?.data?.message || 'Fehler beim Löschen des Ports');
      }
    }
  };

  const rows = ports.map((port) => ({
    ...port,
    actions: (
      <Box>
        <IconButton onClick={() => handleOpen(port)} size="small">
          <EditIcon />
        </IconButton>
        <IconButton onClick={() => handleDelete(port.id)} size="small">
          <DeleteIcon />
        </IconButton>
      </Box>
    ),
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Netzwerkports</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Neuer Port
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography>Lade Daten...</Typography>
      ) : (
        <AtlasTable columns={columns} rows={rows} />
      )}

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {selectedPort ? 'Port bearbeiten' : 'Neuer Port'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Portnummer"
            type="number"
            fullWidth
            value={portNumber}
            onChange={(e) => setPortNumber(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NetworkPorts;
