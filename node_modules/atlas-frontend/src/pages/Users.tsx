import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Paper,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import { ApiResponse } from '../types/api';
import { useNavigate } from 'react-router-dom';
import UserDetailsDialog from '../components/UserDetailsDialog';
import { User } from '../types/user';
import { usersApi } from '../utils/api';
import handleApiError from '../utils/errorHandler';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const Users: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const columns: AtlasColumn<User>[] = [
    { label: 'ID', dataKey: 'id', numeric: true, width: 80 },
    { label: 'Benutzername', dataKey: 'username', width: 150 },
    { label: 'Vorname', dataKey: 'first_name', width: 150 },
    { label: 'Nachname', dataKey: 'last_name', width: 150 },
    { label: 'E-Mail', dataKey: 'email', width: 200 },
    { label: 'Rolle', dataKey: 'role', width: 100 },
    { label: 'Abteilung', dataKey: 'department', width: 120, render: (dept: { name: string } | undefined) => dept?.name || '-' },
    { label: 'Standort', dataKey: 'location', width: 120, render: (loc: { name: string } | undefined) => loc?.name || '-' },
    {
      label: 'Status',
      dataKey: 'active',
      width: 80,
      render: (value: boolean | undefined) => (
        <Chip label={value ? 'Aktiv' : 'Inaktiv'} color={value ? 'success' : 'default'} size="small" />
      )
    },
    {
      label: 'Aktionen',
      dataKey: 'actions',
      width: 80,
      render: (_value: any, row: User) => (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title="Details anzeigen">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewUser(Number(row.id)); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<User[]> = await usersApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
        console.warn('API call successful but no data or unexpected format:', response);
        if (!response.success) {
          setError(response.message || 'Benutzer konnten nicht geladen werden.');
        }
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(`Fehler beim Laden der Benutzer: ${errorMessage}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleViewUser = (userId: number) => {
    setSelectedUserId(userId);
    setUserDetailDialogOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUserId(null);
    setUserDetailDialogOpen(true);
  };

  const handleCloseUserDetailDialog = () => {
    setUserDetailDialogOpen(false);
    setSelectedUserId(null);
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Benutzerverwaltung</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Benutzer suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon color="action" sx={{ mr: 1 }} />
            ),
          }}
          sx={{ width: '300px' }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
        >
          Neuer Benutzer
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mt: 2 }}>
        <AtlasTable<User>
          columns={columns}
          rows={filteredUsers}
          loading={loading}
          onRowClick={(row) => handleViewUser(Number(row.id))}
          emptyMessage="Keine Benutzer gefunden."
          height={600}
          stickyHeader
        />
      </Paper>

      <UserDetailsDialog
        userId={selectedUserId}
        open={userDetailDialogOpen}
        onClose={handleCloseUserDetailDialog}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
