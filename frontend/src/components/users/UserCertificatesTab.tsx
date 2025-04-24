import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import AtlasTable, { AtlasColumn } from '../AtlasTable';
import { Certificate } from '../../types/certificate';
import { certificateService } from '../../services/certificateService';
import { userService } from '../../services/userService';

interface UserCertificatesTabProps {
  userId: number;
  userName?: string;
}

// Lokale Schnittstelle für die Zertifikate mit korrektem ID-Typ
interface LocalCertificate extends Certificate {
  id: number; // Stellt sicher, dass ID als number statt string behandelt wird
}

const UserCertificatesTab: React.FC<UserCertificatesTabProps> = ({ userId, userName }) => {
  // Dialog-Status
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Status für zugewiesene Zertifikate
  const [assignedCertificates, setAssignedCertificates] = useState<LocalCertificate[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [errorAssigned, setErrorAssigned] = useState<string | null>(null);

  // Status für verfügbare Zertifikate
  const [availableCertificates, setAvailableCertificates] = useState<LocalCertificate[]>([]);
  const [filteredAvailableCertificates, setFilteredAvailableCertificates] = useState<LocalCertificate[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);

  // Suchstatus
  const [searchTerm, setSearchTerm] = useState('');

  // Zuweisung/Entfernung Status
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Snackbar-Zustände
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Daten beim ersten Rendern laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingAssigned(true);
        setErrorAssigned(null);

        // Hier könnten echte API-Aufrufe stehen
        // Für dieses Beispiel verwenden wir simulierte Daten
        setTimeout(() => {
          // Zugewiesene Zertifikate des Benutzers
          const assignedCerts: LocalCertificate[] = [
            {
              id: 1001,
              name: 'TLS Certificate',
              service: 'ATLAS Server',
              domain: 'atlas.example.com',
              issued_at: '2023-01-01',
              expiration_date: '2024-01-01',
              created_at: '2023-01-01',
              updated_at: '2023-01-01',
              note: 'Standard Office-Paket'
            },
            {
              id: 1002,
              name: 'Code Signing Certificate',
              service: 'Entwicklung',
              domain: 'N/A',
              issued_at: '2023-03-15',
              expiration_date: '2025-03-15',
              created_at: '2023-03-15',
              updated_at: '2023-03-15',
              note: 'Design-Software'
            }
          ];

          // Verfügbare Zertifikate
          const availableCerts: LocalCertificate[] = [
            {
              id: 1003,
              name: 'Email Certificate',
              service: 'Exchange',
              domain: 'mail.example.com',
              issued_at: '2023-01-10',
              expiration_date: '2024-01-10',
              created_at: '2023-01-10',
              updated_at: '2023-01-10',
              note: 'Standard Office-Paket'
            },
            {
              id: 1004,
              name: 'VPN Certificate',
              service: 'VPN Gateway',
              domain: 'vpn.example.com',
              issued_at: '2023-02-20',
              expiration_date: '2024-02-20',
              created_at: '2023-02-20',
              updated_at: '2023-02-20',
              note: 'Design-Software'
            },
            {
              id: 1005,
              name: 'Database Certificate',
              service: 'PostgreSQL',
              domain: 'db.example.com',
              issued_at: '2023-05-05',
              expiration_date: '2024-05-05',
              created_at: '2023-05-05',
              updated_at: '2023-05-05',
              note: 'Design-Software'
            }
          ];

          setAssignedCertificates(assignedCerts);
          setAvailableCertificates(availableCerts);
          setFilteredAvailableCertificates(availableCerts);
          setLoadingAssigned(false);
        }, 1000);

      } catch (error) {
        console.error('Fehler beim Laden der Zertifikate:', error);
        setErrorAssigned('Fehler beim Laden der Zertifikate');
        setLoadingAssigned(false);
      }
    };

    fetchData();
  }, [userId]);

  // Handler für die Suche nach Zertifikaten
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);

    if (value.trim() === '') {
      setFilteredAvailableCertificates(availableCertificates);
    } else {
      const filtered = availableCertificates.filter(cert =>
        cert.name.toLowerCase().includes(value.toLowerCase()) ||
        cert.service?.toLowerCase().includes(value.toLowerCase()) ||
        cert.domain?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAvailableCertificates(filtered);
    }
  };

  // Handler für das Löschen des Suchbegriffs
  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredAvailableCertificates(availableCertificates);
  };

  // Handler für die Zertifikatszuweisung
  const handleAssignCertificate = async (certificateId: number) => {
    try {
      setAssigning(true);
      setActionError(null);

      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Finde das zuzuweisende Zertifikat
      const certificateToAssign = availableCertificates.find(cert => cert.id === certificateId);

      if (certificateToAssign) {
        // Aktualisiere den lokalen Status
        setAssignedCertificates(prev => [...prev, certificateToAssign]);
        setAvailableCertificates(prev => prev.filter(cert => cert.id !== certificateId));
        setFilteredAvailableCertificates(prev => prev.filter(cert => cert.id !== certificateId));

        // Zeige Erfolgsbenachrichtigung
        setSnackbar({
          open: true,
          message: `Zertifikat "${certificateToAssign.name}" erfolgreich zugewiesen`,
          severity: 'success'
        });
      }

      // Schließe den Dialog
      setIsDialogOpen(false);

    } catch (error) {
      console.error('Fehler beim Zuweisen des Zertifikats:', error);
      setActionError('Fehler beim Zuweisen des Zertifikats');
    } finally {
      setAssigning(false);
    }
  };

  // Handler für das Entfernen eines Zertifikats
  const handleRemoveCertificate = async (certificateId: number) => {
    try {
      setRemoving(true);
      setActionError(null);

      // Simuliere API-Aufruf
      await new Promise(resolve => setTimeout(resolve, 800));

      // Finde das zu entfernende Zertifikat
      const certificateToRemove = assignedCertificates.find(cert => cert.id === certificateId);

      if (certificateToRemove) {
        // Aktualisiere den lokalen Status
        setAssignedCertificates(prev => prev.filter(cert => cert.id !== certificateId));

        // Füge es wieder zu den verfügbaren hinzu, wenn der Dialog geöffnet ist
        if (isDialogOpen) {
          setAvailableCertificates(prev => [...prev, certificateToRemove]);
          setFilteredAvailableCertificates(prev =>
            searchTerm.trim() === '' ?
              [...prev, certificateToRemove] :
              (certificateToRemove.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               certificateToRemove.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               certificateToRemove.domain?.toLowerCase().includes(searchTerm.toLowerCase())) ?
                [...prev, certificateToRemove] : prev
          );
        }

        // Zeige Erfolgsbenachrichtigung
        setSnackbar({
          open: true,
          message: `Zertifikat "${certificateToRemove.name}" erfolgreich entfernt`,
          severity: 'success'
        });
      }

    } catch (error) {
      console.error('Fehler beim Entfernen des Zertifikats:', error);
      setActionError('Fehler beim Entfernen des Zertifikats');
    } finally {
      setRemoving(false);
    }
  };

  // Spalten für die Tabelle der zugewiesenen Zertifikate
  const assignedColumns: AtlasColumn<LocalCertificate>[] = [
    { dataKey: 'name', label: 'Name', width: 250 },
    { dataKey: 'service', label: 'Dienst', width: 150 },
    { dataKey: 'expiration_date', label: 'Gültig bis', width: 120 },
    {
      dataKey: 'id',
      label: 'Aktionen',
      width: 100,
      render: (id, row) => (
        <Button
          size="small"
          color="error"
          variant="outlined"
          onClick={() => handleRemoveCertificate(row.id)}
          disabled={removing}
          sx={{ minWidth: 0, px: 1 }}
        >
          Entfernen
        </Button>
      )
    }
  ];

  // Spalten für die Tabelle der verfügbaren Zertifikate
  const availableColumns: AtlasColumn<LocalCertificate>[] = [
    { dataKey: 'name', label: 'Name', width: 250 },
    { dataKey: 'service', label: 'Dienst', width: 150 },
    { dataKey: 'expiration_date', label: 'Gültig bis', width: 120 },
    {
      dataKey: 'id',
      label: 'Aktionen',
      width: 100,
      render: (id, row) => (
        <Button
          size="small"
          color="primary"
          variant="contained"
          onClick={() => handleAssignCertificate(row.id)}
          disabled={assigning}
          sx={{ minWidth: 0, px: 1 }}
        >
          Zuweisen
        </Button>
      )
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="div">
          Zertifikate {userName ? `von ${userName}` : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
        >
          Zertifikat zuweisen
        </Button>
      </Box>

      {loadingAssigned ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : errorAssigned ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorAssigned}
        </Alert>
      ) : assignedCertificates.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Keine Zertifikate zugewiesen. Weisen Sie Zertifikate mit dem "Zertifikat zuweisen" Button zu.
        </Typography>
      ) : (
        <AtlasTable
          columns={assignedColumns}
          rows={assignedCertificates}
          heightPx={400}
          emptyMessage="Keine Zertifikate zugewiesen"
        />
      )}

      {/* Dialog zum Zuweisen neuer Zertifikate */}
      <Dialog
        open={isDialogOpen}
        onClose={() => !assigning && setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Zertifikat zuweisen
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              placeholder="Nach Zertifikaten suchen..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} edge="end" size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            {loadingAvailable ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : errorAvailable ? (
              <Alert severity="error">
                {errorAvailable}
              </Alert>
            ) : filteredAvailableCertificates.length === 0 ? (
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography align="center" color="text.secondary">
                  {searchTerm ? 'Keine Zertifikate gefunden' : 'Keine Zertifikate verfügbar'}
                </Typography>
              </Paper>
            ) : (
              <AtlasTable
                columns={availableColumns}
                rows={filteredAvailableCertificates}
                heightPx={300}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setIsDialogOpen(false)}
            color="inherit"
            disabled={assigning}
          >
            Abbrechen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserCertificatesTab;
