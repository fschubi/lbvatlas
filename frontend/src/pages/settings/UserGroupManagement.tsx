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
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import { UserGroup, User } from '../../types/user'; // Echte Typen verwenden
import { userGroupApi } from '../../utils/api'; // API importieren
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';

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

  const canRead = true;
  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;
  const canManageMembers = true;

  const loadGroups = useCallback(async () => {
    if (!canRead) {
      return;
    }
    setLoading(true);
    try {
      console.log('[UserGroupManagement] Lade Benutzergruppen...');
      const fetchedGroups = await userGroupApi.getAll();
      setGroups(fetchedGroups || []);
      console.log('[UserGroupManagement] Benutzergruppen geladen:', fetchedGroups);
    } catch (error) {
      console.error('[UserGroupManagement] Fehler beim Laden der Gruppen:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Benutzergruppen: ${errorMessage}`, severity: 'error' });
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  const loadAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      console.log('[UserGroupManagement] Lade alle Benutzer...');
      await new Promise(resolve => setTimeout(resolve, 150));
      setAllUsers([
        { id: 'auth0|663bfa8e59f91a237d0d1111', username: 'test.user', first_name: 'Test', last_name: 'User', email: 'test@example.com', role: 'Admin' },
        { id: 'google-oauth2|112233445566778899000', username: 'anna.dev', first_name: 'Anna', last_name: 'Developer', email: 'anna.dev@example.com', role: 'User' },
        { id: 'auth0|unique-id-peter-support-123', username: 'peter.support', first_name: 'Peter', last_name: 'Support', email: 'peter.s@example.org', role: 'Support' },
      ]);
      console.log('[UserGroupManagement] Alle Benutzer geladen (Mock).');
    } catch (error) {
      console.error('[UserGroupManagement] Fehler beim Laden aller Benutzer:', error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Benutzerliste: ${errorMessage}`, severity: 'error' });
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadGroupUsers = useCallback(async (groupId: number | null) => {
    if (!groupId || !canRead) {
        setGroupUsers([]);
        return;
    }
    setLoadingUsers(true);
    try {
      console.log(`[UserGroupManagement] Lade Benutzer für Gruppe ${groupId}...`);
      const fetchedGroupUsers = await userGroupApi.getUsersInGroup(groupId);
      setGroupUsers(fetchedGroupUsers || []);
      console.log(`[UserGroupManagement] Benutzer für Gruppe ${groupId} geladen:`, fetchedGroupUsers);
    } catch (error) {
      console.error(`[UserGroupManagement] Fehler beim Laden der Benutzer für Gruppe ${groupId}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Laden der Gruppenmitglieder: ${errorMessage}`, severity: 'error' });
      setGroupUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadGroups();
    loadAllUsers();
  }, [loadGroups, loadAllUsers]);

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
    const requiredPermission = dialogType === 'create' ? canCreate : canUpdate;
    if (!requiredPermission) { return; }

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
      const groupData = { name: groupName, description: groupInDialog.description || '' };

      if (dialogType === 'edit' && groupInDialog.id) {
        await userGroupApi.update(Number(groupInDialog.id), groupData);
        setSnackbar({ open: true, message: 'Gruppe erfolgreich aktualisiert', severity: 'success' });
      } else {
        await userGroupApi.create(groupData);
        setSnackbar({ open: true, message: 'Gruppe erfolgreich erstellt', severity: 'success' });
      }
      handleCloseEditDialog();
      await loadGroups();
    } catch (error) {
      console.error(`[UserGroupManagement] Fehler beim ${action} der Gruppe:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim ${action} der Gruppe: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteRequest = (group: UserGroup) => {
    if (!canDelete) { return; }
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
      await userGroupApi.delete(groupIdToDelete);
      setSnackbar({ open: true, message: `Gruppe "${groupName}" erfolgreich gelöscht`, severity: 'success' });
      await loadGroups();
      if (selectedGroup?.id === groupIdToDelete) {
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error(`[UserGroupManagement] Fehler beim Löschen der Gruppe ${groupIdToDelete}:`, error);
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
    if (!canManageMembers) { return; }
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
    if (!canManageMembers) { return; }
    setDialogLoading(true);
    try {
      console.log(`[UserGroupManagement] Füge Benutzer ${selectedUserIdToAdd} zu Gruppe ${selectedGroup.id} hinzu...`);
      await userGroupApi.addUserToGroup(Number(selectedGroup.id), selectedUserIdToAdd);
      setSnackbar({ open: true, message: 'Benutzer erfolgreich zur Gruppe hinzugefügt', severity: 'success' });
      handleCloseAddUserDialog();
      await loadGroupUsers(Number(selectedGroup.id));
      await loadGroups();
    } catch (error) {
      console.error(`[UserGroupManagement] Fehler beim Hinzufügen von Benutzer ${selectedUserIdToAdd} zu Gruppe ${selectedGroup.id}:`, error);
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Hinzufügen des Benutzers: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleRemoveUserFromGroup = async (userId: string) => {
    if (!selectedGroup) return;
    if (!canManageMembers) { return; }

    const userToRemove = groupUsers.find(u => u.id === userId);
    if (!window.confirm(`Benutzer "${userToRemove?.first_name} ${userToRemove?.last_name}" (@${userToRemove?.username}) wirklich aus der Gruppe "${selectedGroup.name}" entfernen?`)) return;

    setLoadingUsers(true);
    try {
      console.log(`[UserGroupManagement] Entferne Benutzer ${userId} aus Gruppe ${selectedGroup.id}...`);
      await userGroupApi.removeUserFromGroup(Number(selectedGroup.id), userId);
      setSnackbar({ open: true, message: 'Benutzer erfolgreich aus Gruppe entfernt', severity: 'success' });
      await loadGroupUsers(Number(selectedGroup.id));
      await loadGroups();
    } catch (error) {
        console.error(`[UserGroupManagement] Fehler beim Entfernen von Benutzer ${userId} aus Gruppe ${selectedGroup.id}:`, error);
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
    { label: 'Hinzugefügt am', dataKey: 'added_at', width: 180, render: (value: string | undefined) => value ? new Date(value).toLocaleString('de-DE') : '-' },
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
              <IconButton size="small" onClick={() => handleRemoveUserFromGroup(row.id)} disabled={!canManageMembers || loadingUsers}>
                  <PersonRemoveIcon fontSize="small" color="warning" />
              </IconButton>
            </span>
        </Tooltip>
    )}
  ];

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Benutzergruppen</Typography>
        <Button
          variant="contained"
          color="primary"
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
           emptyMessage="Keine Benutzergruppen gefunden."
           height={400}
           stickyHeader
        />
      </Paper>

      {selectedGroup && (
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
                      disabled={nonMemberUsers.length === 0 || loadingUsers}
                      SelectProps={{ displayEmpty: true }}
                  >
                      <MenuItem value=""><em>-- Benutzer wählen --</em></MenuItem>
                      {nonMemberUsers.map(user => (
                          <MenuItem key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} (@{user.username})
                          </MenuItem>
                      ))}
                      {nonMemberUsers.length === 0 && <MenuItem value="" disabled><em>Keine weiteren Benutzer verfügbar</em></MenuItem>}
                  </TextField>
              )}
          </DialogContent>
          <DialogActions>
              <Button onClick={handleCloseAddUserDialog} disabled={dialogLoading}>Abbrechen</Button>
              <Button
                  onClick={handleAddUserToGroup}
                  variant="contained"
                  color="secondary"
                  disabled={!selectedUserIdToAdd || dialogLoading || nonMemberUsers.length === 0}
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
