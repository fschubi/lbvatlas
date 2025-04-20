import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { UserGroup, User } from '../../types/user'; // Echte Typen verwenden
import { userGroupApi, usersApi } from '../../utils/api'; // API importieren
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { ApiResponse } from '../../utils/api'; // ApiResponse importieren
import { toCamelCase } from '../../utils/caseConverter'; // toCamelCase importieren
import { useAuth } from '../../context/AuthContext'; // Pfad anpassen!

// Konstanten für Berechtigungsnamen (müssen im Backend existieren!)
const USERGROUPS_READ = 'usergroups.read';
const USERGROUPS_CREATE = 'usergroups.create';
const USERGROUPS_UPDATE = 'usergroups.update';
const USERGROUPS_DELETE = 'usergroups.delete';
const USERGROUPS_MANAGE_MEMBERS = 'usergroups.manage_members';
const USERS_READ = 'users.read'; // Für Benutzerliste

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const UserGroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openMembersDialog, setOpenMembersDialog] = useState<boolean>(false);
  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [groupName, setGroupName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');
  const [groupInDialog, setGroupInDialog] = useState<Partial<UserGroup>>({ name: '', description: '' });
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>('');
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  // State für Bestätigungsdialog "Benutzer entfernen"
  const [confirmRemoveUserDialogOpen, setConfirmRemoveUserDialogOpen] = useState(false);
  const [userToRemoveFromGroup, setUserToRemoveFromGroup] = useState<User | null>(null);

  // --- Berechtigungen aus AuthContext beziehen ---
  const { user, isLoading: isAuthLoading } = useAuth(); // isLoading von useAuth holen (umbenennen zu isAuthLoading, um Konflikt zu vermeiden)
  // Annahme: user.permissions ist ein Set<string>. Passe dies ggf. an deine Struktur an.
  // Wichtig: Handle den Fall, dass user null ist (nicht eingeloggt oder Daten noch nicht geladen)
  const userPermissions = user?.permissions || new Set<string>();

  const canRead = userPermissions.has(USERGROUPS_READ);
  const canCreate = userPermissions.has(USERGROUPS_CREATE);
  const canUpdate = userPermissions.has(USERGROUPS_UPDATE);
  const canDelete = userPermissions.has(USERGROUPS_DELETE);
  const canManageMembers = userPermissions.has(USERGROUPS_MANAGE_MEMBERS);
  const canReadUsers = userPermissions.has(USERS_READ);

  const loadGroups = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setGroups([]);
      setSnackbar({ open: true, message: 'Keine Berechtigung zum Anzeigen von Gruppen.', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      console.log('[UserGroupManagement] Lade Benutzergruppen...');
      const response: ApiResponse<UserGroup[]> = await userGroupApi.getAll();

      if (response.success && Array.isArray(response.data)) {
        const camelCasedGroups = response.data.map(group => toCamelCase(group) as UserGroup);
        setGroups(camelCasedGroups);
        console.log('[UserGroupManagement] Benutzergruppen geladen:', camelCasedGroups);
      } else {
        console.error('[UserGroupManagement] Fehler beim Laden der Gruppen:', response.message || 'Ungültige Datenstruktur');
        setSnackbar({
          open: true,
          message: `Fehler beim Laden der Benutzergruppen: ${response.message || 'Ungültige Datenstruktur'}`,
          severity: 'error'
        });
        setGroups([]);
      }
    } catch (error) {
      console.error('[UserGroupManagement] CATCH-Fehler beim Laden der Gruppen:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Benutzergruppen: ${errorMessage}`, severity: 'error' });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const loadAllUsers = useCallback(async () => {
    if (!canReadUsers || !canManageMembers) {
       setAllUsers([]);
       setLoadingUsers(false);
       return;
    }
    setLoadingUsers(true);
    try {
      console.log('[UserGroupManagement] Lade alle Benutzer von API...');
      const response: ApiResponse<User[]> = await usersApi.getAll();

      if (response.success && Array.isArray(response.data)) {
        const camelCasedUsers = response.data.map(user => toCamelCase(user) as User);
        setAllUsers(camelCasedUsers);
        console.log('[UserGroupManagement] Alle Benutzer geladen:', camelCasedUsers);
      } else {
        console.error('[UserGroupManagement] Fehler beim Laden aller Benutzer:', response.message || 'Ungültige Datenstruktur');
        setSnackbar({ open: true, message: `Fehler beim Laden der Benutzerliste: ${response.message || 'Ungültige Datenstruktur'}`, severity: 'error' });
        setAllUsers([]);
      }
    } catch (error) {
      console.error('[UserGroupManagement] CATCH-Fehler beim Laden aller Benutzer:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Benutzerliste: ${errorMessage}`, severity: 'error' });
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [canReadUsers, canManageMembers]);

  const loadGroupUsers = useCallback(async (groupId: number | null) => {
    if (!groupId || !canRead) {
        setGroupUsers([]);
        setLoadingUsers(false);
        return;
    }
    setLoadingUsers(true);
    try {
      console.log(`[UserGroupManagement] Lade Benutzer für Gruppe ${groupId}...`);
      const response: ApiResponse<User[]> = await userGroupApi.getUsersInGroup(groupId);

      if (response.success && Array.isArray(response.data)) {
        const camelCasedUsers = response.data.map(user => toCamelCase(user) as User);
        setGroupUsers(camelCasedUsers);
        console.log(`[UserGroupManagement] Benutzer für Gruppe ${groupId} geladen:`, camelCasedUsers);
      } else {
        console.error(`[UserGroupManagement] Fehler beim Laden der Benutzer für Gruppe ${groupId}:`, response.message || 'Ungültige Datenstruktur');
        setSnackbar({
          open: true,
          message: `Fehler beim Laden der Gruppenmitglieder: ${response.message || 'Ungültige Datenstruktur'}`,
          severity: 'error'
        });
        setGroupUsers([]);
      }
    } catch (error) {
      console.error(`[UserGroupManagement] CATCH-Fehler beim Laden der Benutzer für Gruppe ${groupId}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Gruppenmitglieder: ${errorMessage}`, severity: 'error' });
      setGroupUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [canRead]);

  useEffect(() => {
    // Nur laden, wenn Authentifizierung abgeschlossen ist
    if (!isAuthLoading) {
      if (canRead) {
        loadGroups();
      } else {
        // Explizit Ladezustand beenden und ggf. Snackbar setzen, wenn keine Leseberechtigung vorhanden ist,
        // NACHDEM die Authentifizierung abgeschlossen ist.
        setLoading(false);
        setGroups([]);
        setSnackbar({ open: true, message: 'Keine Berechtigung zum Anzeigen von Gruppen.', severity: 'warning' });
      }

      // Auch das Laden der Benutzerliste sollte warten
      if (canReadUsers && canManageMembers) {
        loadAllUsers();
      }
    }
  }, [isAuthLoading, canRead, loadGroups, canReadUsers, canManageMembers, loadAllUsers]); // isAuthLoading als Abhängigkeit hinzufügen

  useEffect(() => {
    if (selectedGroup) {
      loadGroupUsers(Number(selectedGroup.id));
    } else {
      setGroupUsers([]);
    }
  }, [selectedGroup, loadGroupUsers]);

  const handleSelectGroup = (group: UserGroup) => {
    setSelectedGroup(group);
  };

  const handleOpenEditDialog = (type: 'create' | 'edit', group?: UserGroup) => {
    if (type === 'create' && !canCreate) {
       setSnackbar({ open: true, message: 'Keine Berechtigung zum Erstellen von Gruppen.', severity: 'warning' });
       return;
    }
    if (type === 'edit' && !canUpdate) {
       setSnackbar({ open: true, message: 'Keine Berechtigung zum Bearbeiten von Gruppen.', severity: 'warning' });
       return;
    }

    setDialogType(type);
    if (type === 'edit' && group) {
      setGroupInDialog({ id: group.id, name: group.name, description: group.description || '' });
    } else {
      setGroupInDialog({ name: '', description: '' });
    }
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setGroupInDialog({ name: '', description: '' });
  };

  const handleSaveGroup = async () => {
    const groupName = groupInDialog.name?.trim();
    if (!groupName) { return; }
    const action = dialogType === 'create' ? 'erstellen' : 'aktualisieren';

    if (dialogType === 'create' || (selectedGroup && groupName !== selectedGroup.name)) {
        const nameExists = await userGroupApi.checkGroupNameExists(groupName, groupInDialog.id);
        if (nameExists) {
            setSnackbar({ open: true, message: `Eine Gruppe mit dem Namen "${groupName}" existiert bereits.`, severity: 'warning' });
            return;
        }
    }

    setDialogLoading(true);
    try {
      console.log(`[UserGroupManagement] Versuche Gruppe zu ${action}...`, groupInDialog);

      const groupDataForApi = {
        name: groupName!,
        description: groupInDialog.description || ''
      };

      let response: ApiResponse<UserGroup>;

      if (dialogType === 'edit' && groupInDialog.id) {
        response = await userGroupApi.update(Number(groupInDialog.id), groupDataForApi);
      } else {
        response = await userGroupApi.create(groupDataForApi);
      }

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || `Gruppe "${groupName}" erfolgreich ${action}.`,
          severity: 'success'
        });
        handleCloseEditDialog();
        await loadGroups();
      } else {
        setSnackbar({
          open: true,
          message: response.message || `Fehler beim ${action} der Gruppe.`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`[UserGroupManagement] CATCH-Fehler beim ${action} der Gruppe:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim ${action} der Gruppe: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteRequest = (group: UserGroup) => {
    if (!canDelete) {
       setSnackbar({ open: true, message: 'Keine Berechtigung zum Löschen von Gruppen.', severity: 'warning' });
       return;
    }
    setGroupToDelete(group);
    setConfirmDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!groupToDelete) return;
    const groupIdToDelete = groupToDelete.id;
    const groupName = groupToDelete.name;
    setConfirmDeleteDialogOpen(false);
    setDialogLoading(true);
    try {
      console.log(`[UserGroupManagement] Versuche Gruppe ${groupIdToDelete} zu löschen...`);
      const response: ApiResponse<{ message?: string }> = await userGroupApi.delete(groupIdToDelete);

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || `Gruppe "${groupName}" erfolgreich gelöscht`,
          severity: 'success'
        });
        await loadGroups();
        if (selectedGroup?.id === groupIdToDelete) {
          setSelectedGroup(null);
        }
      } else {
        setSnackbar({
          open: true,
          message: response.message || `Fehler beim Löschen der Gruppe "${groupName}".`,
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`[UserGroupManagement] CATCH-Fehler beim Löschen der Gruppe ${groupIdToDelete}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Löschen der Gruppe: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
      setGroupToDelete(null);
    }
  };

  const handleCloseConfirmDeleteDialog = () => {
    setConfirmDeleteDialogOpen(false);
    setGroupToDelete(null);
  };

  const handleOpenAddUserDialog = () => {
    if (!canManageMembers) {
       setSnackbar({ open: true, message: 'Keine Berechtigung zum Verwalten von Mitgliedern.', severity: 'warning' });
       return;
    }
    if (!selectedGroup) return;
    setSelectedUserIdToAdd('');
    setAddUserDialogOpen(true);
  };

  const handleCloseAddUserDialog = () => {
    setAddUserDialogOpen(false);
    setSelectedUserIdToAdd('');
  };

  const handleAddUserToGroup = async () => {
    if (!selectedGroup || !selectedUserIdToAdd) return;
    setDialogLoading(true);
    try {
      console.log(`[UserGroupManagement] Füge Benutzer ${selectedUserIdToAdd} zu Gruppe ${selectedGroup.id} hinzu...`);
      const response: ApiResponse<void> = await userGroupApi.addUserToGroup(Number(selectedGroup.id), selectedUserIdToAdd);

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || 'Benutzer erfolgreich zur Gruppe hinzugefügt',
          severity: 'success'
        });
        handleCloseAddUserDialog();
        await loadGroupUsers(Number(selectedGroup.id));
        await loadGroups();
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Hinzufügen des Benutzers.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`[UserGroupManagement] CATCH-Fehler beim Hinzufügen von Benutzer ${selectedUserIdToAdd} zu Gruppe ${selectedGroup.id}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Hinzufügen des Benutzers: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleRemoveUserFromGroupRequest = (user: User) => {
    if (!selectedGroup || !canManageMembers) {
      setSnackbar({ open: true, message: 'Keine Berechtigung zum Entfernen von Mitgliedern.', severity: 'warning' });
      return;
    }
    setUserToRemoveFromGroup(user);
    setConfirmRemoveUserDialogOpen(true);
  };

  const handleCloseConfirmRemoveUserDialog = () => {
    setConfirmRemoveUserDialogOpen(false);
    setUserToRemoveFromGroup(null);
  };

  const executeRemoveUserFromGroup = async () => {
    if (!selectedGroup || !userToRemoveFromGroup) return;

    const userId = userToRemoveFromGroup.id;
    const groupId = selectedGroup.id;

    handleCloseConfirmRemoveUserDialog(); // Dialog sofort schließen
    setLoadingUsers(true); // Oder einen anderen Ladeindikator?

    try {
      console.log(`[UserGroupManagement] Entferne Benutzer ${userId} aus Gruppe ${groupId}...`);
      const response: ApiResponse<void> = await userGroupApi.removeUserFromGroup(Number(groupId), userId);

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message || 'Benutzer erfolgreich aus Gruppe entfernt',
          severity: 'success'
        });
        await loadGroupUsers(Number(groupId));
        await loadGroups();
      } else {
        setSnackbar({
          open: true,
          message: response.message || 'Fehler beim Entfernen des Benutzers.',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error(`[UserGroupManagement] CATCH-Fehler beim Entfernen von Benutzer ${userId} aus Gruppe ${groupId}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Entfernen des Benutzers: ${errorMessage}`, severity: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const groupColumns: AtlasColumn<UserGroup>[] = [
    { label: 'Name', dataKey: 'name', width: 250 },
    { label: 'Beschreibung', dataKey: 'description', width: 400 },
    { label: 'Mitglieder', dataKey: 'userCount', width: 100, numeric: true, render: (value) => value ?? '-' },
    { label: 'Erstellt am', dataKey: 'createdAt', width: 180, render: (value: string | undefined) => value ? new Date(value).toLocaleString('de-DE') : '-' },
    { label: 'Aktionen', dataKey: 'actions', width: 120, render: (_value: any, row: UserGroup) => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Tooltip title="Bearbeiten">
          <span>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog('edit', row); }} disabled={!canUpdate}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Löschen">
          <span>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(row); }} disabled={!canDelete}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    )}
  ];

  const userColumns: AtlasColumn<User>[] = [
    { label: 'Username', dataKey: 'username', width: 200 },
    { label: 'Vollständiger Name', dataKey: 'fullName', width: 300, render: (_value: any, row: User) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-' },
    { label: 'E-Mail', dataKey: 'email', width: 250, render: (value: string | undefined) => value || '-' },
    { label: 'Rolle', dataKey: 'role', width: 150 },
    { label: 'Aktionen', dataKey: 'actions', width: 100, render: (_value: any, row: User) => (
        <Tooltip title="Aus Gruppe entfernen">
            <span>
              <IconButton size="small" onClick={() => handleRemoveUserFromGroupRequest(row)} disabled={!canManageMembers || loadingUsers}>
                  <PersonRemoveIcon fontSize="small" color="warning" />
              </IconButton>
            </span>
        </Tooltip>
    )}
  ];

  if (loading && groups.length === 0 && !canRead) {
     return (
        <Box sx={{ p: 3 }}><Alert severity="warning">Keine Berechtigung zum Anzeigen von Benutzergruppen.</Alert></Box>
     );
  }
  if (loading && groups.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 112px)', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Lade Benutzergruppen...</Typography>
      </Box>
    );
  }

  const nonMemberUsers = allUsers.filter(user => !groupUsers.some(groupUser => groupUser.id === user.id));

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
         <GroupIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
         <Typography variant="h4" component="h1">Benutzergruppen verwalten</Typography>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenEditDialog('create')}
          disabled={!canCreate || loading}
        >
          Neue Gruppe erstellen
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ mb: 4 }}>
        <AtlasTable<UserGroup>
           columns={groupColumns}
           rows={groups}
           loading={loading}
           onRowClick={handleSelectGroup}
           emptyMessage="Keine Benutzergruppen gefunden oder keine Leseberechtigung."
           height={400}
           stickyHeader
        />
      </Paper>

      {selectedGroup && canRead && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Mitglieder der Gruppe: "{selectedGroup.name}"
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAddUserDialog}
              disabled={!canManageMembers || loadingUsers || nonMemberUsers.length === 0}
              size="small"
            >
              Mitglied hinzufügen
            </Button>
          </Box>

          <Paper variant="outlined">
             <AtlasTable<User>
                columns={userColumns}
                rows={groupUsers}
                loading={loadingUsers}
                emptyMessage="Diese Gruppe hat keine Mitglieder."
                height={300}
                stickyHeader
             />
          </Paper>
        </Box>
      )}

      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'create' ? 'Neue Benutzergruppe erstellen' : `Gruppe "${groupInDialog.name}" bearbeiten`}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Gruppenname"
            type="text"
            fullWidth
            variant="outlined"
            value={groupInDialog.name || ''}
            onChange={(e) => setGroupInDialog(prev => ({ ...prev, name: e.target.value }))}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Beschreibung (optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={groupInDialog.description || ''}
            onChange={(e) => setGroupInDialog(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={dialogLoading}>Abbrechen</Button>
          <Button
            onClick={handleSaveGroup}
            variant="contained"
            color="primary"
            disabled={!groupInDialog.name?.trim() || dialogLoading}
          >
            {dialogLoading ? <CircularProgress size={24} /> : (dialogType === 'create' ? 'Erstellen' : 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addUserDialogOpen} onClose={handleCloseAddUserDialog} maxWidth="xs" fullWidth>
         <DialogTitle>Benutzer zu "{selectedGroup?.name}" hinzufügen</DialogTitle>
          <DialogContent dividers>
              {loadingUsers && !allUsers.length ? (
                  <CircularProgress sx={{ display: 'block', margin: 'auto' }} />
              ) : (
                  <TextField
                      select
                      fullWidth
                      label="Benutzer auswählen"
                      value={selectedUserIdToAdd}
                      onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                      variant="outlined"
                      margin="normal"
                      disabled={nonMemberUsers.length === 0 || loadingUsers || !canManageMembers}
                      SelectProps={{ displayEmpty: true }}
                  >
                      <MenuItem value=""><em>-- Benutzer wählen --</em></MenuItem>
                      {nonMemberUsers.map(user => (
                          <MenuItem key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} (@{user.username})
                          </MenuItem>
                      ))}
                      {nonMemberUsers.length === 0 && <MenuItem value="" disabled><em>Keine weiteren Benutzer verfügbar</em></MenuItem>}
                      {!canReadUsers && <MenuItem value="" disabled><em>Keine Berechtigung zum Laden der Benutzerliste</em></MenuItem>}
                  </TextField>
              )}
          </DialogContent>
          <DialogActions>
              <Button onClick={handleCloseAddUserDialog} disabled={dialogLoading}>Abbrechen</Button>
              <Button
                  onClick={handleAddUserToGroup}
                  variant="contained"
                  color="secondary"
                  disabled={!selectedUserIdToAdd || dialogLoading || nonMemberUsers.length === 0 || !canManageMembers}
              >
                  {dialogLoading ? <CircularProgress size={24} /> : 'Hinzufügen'}
              </Button>
          </DialogActions>
      </Dialog>

      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDeleteDialog}
        onConfirm={() => { if (!dialogLoading) executeDelete(); }}
        title="Benutzergruppe löschen?"
        message={`Möchten Sie die Benutzergruppe "${groupToDelete?.name}" wirklich endgültig löschen? Zugehörige Benutzer werden nicht gelöscht.`}
        confirmText="Löschen"
        confirmButtonColor="error"
      />

      <ConfirmationDialog
        open={confirmRemoveUserDialogOpen}
        onClose={handleCloseConfirmRemoveUserDialog}
        onConfirm={() => { if (!loadingUsers) executeRemoveUserFromGroup(); }}
        title="Benutzer entfernen?"
        message={`Möchten Sie den Benutzer "${userToRemoveFromGroup?.first_name} ${userToRemoveFromGroup?.last_name}" (@${userToRemoveFromGroup?.username}) wirklich aus der Gruppe "${selectedGroup?.name}" entfernen?`}
        confirmText="Entfernen"
        confirmButtonColor="warning"
      />

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

export default UserGroupManagement;
