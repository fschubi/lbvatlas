import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

// API-Basis-URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Typen
interface UserGroup {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: number;
  user_count?: number;
}

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  added_at?: string;
  added_by?: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

// Aktualisierte Typ-Definition für API-Antworten
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Styled-Komponenten
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.background.default,
  },
  '&:nth-of-type(even)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

// Helper für Authorization Header
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('Kein Auth-Token gefunden');
    return {};
  }
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

// Hauptkomponente
const UserGroupManagement: React.FC = () => {
  // Zustände
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openMembersDialog, setOpenMembersDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Daten laden
  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
  }, []);

  // Gruppen laden
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get<ApiResponse<UserGroup[]>>(`${API_BASE_URL}/user-groups`, getAuthConfig());

      if (!response.data.success) {
        throw new Error('Keine gültige Antwort vom Server');
      }

      setGroups(response.data.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzergruppen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Benutzergruppen: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Alle Benutzer laden
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get<ApiResponse<User[]>>(`${API_BASE_URL}/users`, getAuthConfig());

      if (!response.data.success) {
        throw new Error('Keine gültige Antwort vom Server');
      }

      setAllUsers(response.data.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Benutzer: Verbindungsproblem',
        severity: 'error'
      });
    }
  };

  // Gruppenmitglieder laden
  const fetchGroupMembers = async (groupId: number) => {
    try {
      setMembersLoading(true);
      const response = await axios.get<ApiResponse<User[]>>(
        `${API_BASE_URL}/user-groups/${groupId}/members`,
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setGroupMembers(response.data.data || []);
    } catch (error) {
      console.error(`Fehler beim Laden der Mitglieder für Gruppe ${groupId}:`, error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Gruppenmitglieder: Verbindungsproblem`,
        severity: 'error'
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Gruppe auswählen
  const handleSelectGroup = (group: UserGroup) => {
    setSelectedGroup(group);
    fetchGroupMembers(group.id);
  };

  // Dialog öffnen
  const handleOpenDialog = (type: 'create' | 'edit', group?: UserGroup) => {
    setDialogType(type);
    if (type === 'edit' && group) {
      setGroupName(group.name);
      setGroupDescription(group.description || '');
      setSelectedGroup(group);
    } else {
      setGroupName('');
      setGroupDescription('');
    }
    setOpenDialog(true);
  };

  // Dialog schließen
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Mitglieder-Dialog öffnen
  const handleOpenMembersDialog = () => {
    setSelectedUsers([]);
    setOpenMembersDialog(true);
  };

  // Mitglieder-Dialog schließen
  const handleCloseMembersDialog = () => {
    setOpenMembersDialog(false);
  };

  // Gruppe erstellen
  const handleCreateGroup = async () => {
    try {
      setLoading(true);
      const response = await axios.post<ApiResponse<UserGroup>>(
        `${API_BASE_URL}/user-groups`,
        {
          name: groupName,
          description: groupDescription
        },
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setGroups([...groups, response.data.data as UserGroup]);
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Benutzergruppe erfolgreich erstellt',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Benutzergruppe:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen der Benutzergruppe: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gruppe aktualisieren
  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      setLoading(true);
      const response = await axios.put<ApiResponse<UserGroup>>(
        `${API_BASE_URL}/user-groups/${selectedGroup.id}`,
        {
          name: groupName,
          description: groupDescription
        },
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setGroups(groups.map(group =>
        group.id === selectedGroup.id ? (response.data.data as UserGroup) : group
      ));
      setSelectedGroup(response.data.data as UserGroup);
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: 'Benutzergruppe erfolgreich aktualisiert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Benutzergruppe:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren der Benutzergruppe: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gruppe löschen
  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Möchten Sie diese Benutzergruppe wirklich löschen?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete<ApiResponse<null>>(
        `${API_BASE_URL}/user-groups/${groupId}`,
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      setGroups(groups.filter(group => group.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setGroupMembers([]);
      }
      setSnackbar({
        open: true,
        message: 'Benutzergruppe erfolgreich gelöscht',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Benutzergruppe:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Löschen der Benutzergruppe: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Benutzer zur Gruppe hinzufügen
  const handleAddUsersToGroup = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;

    try {
      setMembersLoading(true);
      const userIds = selectedUsers.map(user => user.id);
      const response = await axios.post<ApiResponse<null>>(
        `${API_BASE_URL}/user-groups/${selectedGroup.id}/members`,
        { userIds },
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      // Gruppenmitglieder neu laden
      fetchGroupMembers(selectedGroup.id);
      handleCloseMembersDialog();
      setSnackbar({
        open: true,
        message: `${selectedUsers.length} Benutzer erfolgreich zur Gruppe hinzugefügt`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Hinzufügen von Benutzern zur Gruppe:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Hinzufügen von Benutzern: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Benutzer aus der Gruppe entfernen
  const handleRemoveUserFromGroup = async (userId: number) => {
    if (!selectedGroup) return;

    try {
      setMembersLoading(true);
      const response = await axios.delete<ApiResponse<null>>(
        `${API_BASE_URL}/user-groups/${selectedGroup.id}/members/${userId}`,
        getAuthConfig()
      );

      if (!response.data.success) {
        throw new Error('Ungültige Antwort vom Server');
      }

      // Gruppenmitglieder neu laden
      fetchGroupMembers(selectedGroup.id);
      setSnackbar({
        open: true,
        message: 'Benutzer erfolgreich aus der Gruppe entfernt',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Entfernen des Benutzers aus der Gruppe:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Entfernen des Benutzers: Verbindungsproblem',
        severity: 'error'
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Dialog-Aktion
  const handleDialogAction = () => {
    if (dialogType === 'create') {
      handleCreateGroup();
    } else {
      handleUpdateGroup();
    }
  };

  // Nicht-Mitglieder filtern (für Dialog zum Hinzufügen von Benutzern)
  const getNonMembers = () => {
    if (!selectedGroup) return allUsers;

    const memberIds = groupMembers.map(member => member.id);
    return allUsers.filter(user => !memberIds.includes(user.id));
  };

  const GroupRow = ({ group }: { group: UserGroup }) => {
    return (
      <StyledTableRow
        hover
        key={group.id}
        selected={selectedGroup?.id === group.id}
        onClick={() => handleSelectGroup(group)}
        sx={{ cursor: 'pointer' }}
      >
        <StyledTableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {group.name}
          </Box>
        </StyledTableCell>
        <StyledTableCell>{group.description || '—'}</StyledTableCell>
        <StyledTableCell align="center">
          {group.user_count || 0}
        </StyledTableCell>
        <StyledTableCell align="right">
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('edit', group);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteGroup(group.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </StyledTableCell>
      </StyledTableRow>
    );
  };

  if (loading && groups.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Benutzergruppen</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('create')}
        >
          Neue Gruppe erstellen
        </Button>
      </Box>

      {/* Gruppen-Tabelle */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table sx={{ minWidth: 650 }} aria-label="Benutzergruppen">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell align="center">Mitglieder</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <GroupRow key={group.id} group={group} />
            ))}
            {groups.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Keine Benutzergruppen verfügbar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Gruppenmitglieder-Liste */}
      {selectedGroup && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Mitglieder von Gruppe: {selectedGroup.name}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenMembersDialog}
              disabled={membersLoading}
            >
              Benutzer hinzufügen
            </Button>
          </Box>

          <Paper variant="outlined" sx={{ mb: 2 }}>
            {membersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <List>
                {groupMembers.length > 0 ? (
                  groupMembers.map((member, index) => (
                    <React.Fragment key={member.id}>
                      <ListItem>
                        <ListItemText
                          primary={member.name}
                          secondary={member.email}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleRemoveUserFromGroup(member.id)}
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < groupMembers.length - 1 && <Divider />}
                    </React.Fragment>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="Keine Mitglieder in dieser Gruppe"
                      primaryTypographyProps={{ align: 'center', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            )}
          </Paper>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <InfoIcon fontSize="small" color="info" sx={{ mr: 1, mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" color="text.primary" gutterBottom>
                Hinweise zu Benutzergruppen:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Benutzergruppen helfen bei der Organisation und Verwaltung von Benutzern<br />
                • Jeder Benutzer kann Mitglied in mehreren Gruppen sein<br />
                • Gruppenmitgliedschaften können jederzeit geändert werden<br />
                • Für die Zuweisung von Berechtigungen verwenden Sie bitte die Rollenverwaltung
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Dialog für Gruppe erstellen/bearbeiten */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'create' ? 'Neue Benutzergruppe erstellen' : 'Benutzergruppe bearbeiten'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Gruppenname"
              type="text"
              fullWidth
              variant="outlined"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="description"
              label="Beschreibung"
              type="text"
              fullWidth
              variant="outlined"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button
            onClick={handleDialogAction}
            variant="contained"
            color="primary"
            disabled={!groupName.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : (dialogType === 'create' ? 'Erstellen' : 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog für Benutzer hinzufügen */}
      <Dialog open={openMembersDialog} onClose={handleCloseMembersDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Benutzer zu Gruppe hinzufügen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              multiple
              id="user-selector"
              options={getNonMembers()}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              filterSelectedOptions
              value={selectedUsers}
              onChange={(_, newValue) => setSelectedUsers(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Benutzer auswählen"
                  placeholder="Benutzer suchen..."
                  variant="outlined"
                />
              )}
              noOptionsText="Keine Benutzer verfügbar"
            />
            {getNonMembers().length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Alle verfügbaren Benutzer sind bereits Mitglieder dieser Gruppe.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMembersDialog}>Abbrechen</Button>
          <Button
            onClick={handleAddUsersToGroup}
            variant="contained"
            color="primary"
            disabled={selectedUsers.length === 0 || membersLoading}
          >
            {membersLoading ? <CircularProgress size={24} /> : 'Hinzufügen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default UserGroupManagement;
