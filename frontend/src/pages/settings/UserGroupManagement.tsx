import React, { useState, useEffect, useCallback, MouseEvent } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { UserGroup, User } from '../../types/user';
import { userGroupApi, usersApi, ApiResponse } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AtlasTable, { AtlasColumn } from '../../components/AtlasTable';
import { MenuAction } from '../../components/TableContextMenu';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface MenuPosition {
  mouseX: number;
  mouseY: number;
  groupId: number;
}

const UserGroupManagement: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [dialogLoading, setDialogLoading] = useState<boolean>(false);
  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<'create' | 'edit'>('create');
  const [groupInDialog, setGroupInDialog] = useState<Partial<UserGroup>>({ name: '', description: '' });
  const [addUserDialogOpen, setAddUserDialogOpen] = useState<boolean>(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<number>(0);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [menuSelectedItem, setMenuSelectedItem] = useState<UserGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  const canRead = true;
  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;
  const canManageMembers = true;

  const loadGroups = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const response: ApiResponse<UserGroup[]> = await userGroupApi.getAll();
      if (response.success && Array.isArray(response.data)) {
        setGroups(response.data || []);
      } else {
         throw new Error(response.message || 'Fehler beim Laden der Gruppen.');
      }
    } catch (error) {
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
      const response: ApiResponse<User[]> = await usersApi.getAll();
       if (response.success && Array.isArray(response.data)) {
        setAllUsers(response.data || []);
      } else {
         throw new Error(response.message || 'Fehler beim Laden der Benutzer.');
      }
    } catch (error) {
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
      const response: ApiResponse<User[]> = await userGroupApi.getUsersInGroup(groupId);
      if (response.success && Array.isArray(response.data)) {
        setGroupUsers(response.data || []);
      } else {
         throw new Error(response.message || 'Fehler beim Laden der Gruppenmitglieder.');
      }
    } catch (error) {
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
      const groupData = { name: groupName, description: groupInDialog.description || '' };
      let response: ApiResponse<UserGroup>;

      if (dialogType === 'edit' && groupInDialog.id) {
        response = await userGroupApi.update(Number(groupInDialog.id), groupData);
      } else {
        response = await userGroupApi.create(groupData);
      }

      if (!response.success) throw new Error(response.message || `Fehler beim ${action} der Gruppe.`);

      setSnackbar({ open: true, message: `Gruppe erfolgreich ${action}t`, severity: 'success' });
      handleCloseEditDialog();
      await loadGroups();
    } catch (error) {
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
      const response = await userGroupApi.delete(groupIdToDelete);
      if (!response.success) throw new Error(response.message || 'Löschen fehlgeschlagen');

      setSnackbar({ open: true, message: `Gruppe "${groupName}" erfolgreich gelöscht`, severity: 'success' });
      await loadGroups();
      if (selectedGroup?.id === groupIdToDelete) {
        setSelectedGroup(null);
      }
    } catch (error) {
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
    if (!canManageMembers || !selectedGroup) return;
    const filteredNonMembers = allUsers.filter(user => !groupUsers.some(groupUser => groupUser.id === user.id));
    setSelectedUserIdToAdd(0);
    setAddUserDialogOpen(true);
  };

  const handleCloseAddUserDialog = () => {
    setAddUserDialogOpen(false);
    setSelectedUserIdToAdd(0);
  };

  const handleAddUserToGroup = async () => {
    if (!selectedGroup || !selectedUserIdToAdd || selectedUserIdToAdd === 0) {
      console.warn('[UserGroupManagement] Abbruch: Keine Gruppe oder kein gültiger Benutzer ausgewählt.', { selectedGroupId: selectedGroup?.id, selectedUserIdToAdd });
      return;
    }
    setDialogLoading(true);
    try {
      const response = await userGroupApi.addUserToGroup(Number(selectedGroup.id), selectedUserIdToAdd.toString());
      if (!response.success) throw new Error(response.message || 'Hinzufügen fehlgeschlagen');
      setSnackbar({ open: true, message: 'Benutzer erfolgreich zur Gruppe hinzugefügt', severity: 'success' });
      handleCloseAddUserDialog();
      await loadGroupUsers(Number(selectedGroup.id));
      await loadGroups();
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({ open: true, message: `Fehler beim Hinzufügen des Benutzers: ${errorMessage}`, severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleRemoveUserFromGroup = async (userId: string | number) => {
    if (!selectedGroup || !canManageMembers) return;
    const userIdStr = userId.toString();
    const userToRemove = groupUsers.find(u => u.id.toString() === userIdStr);
    if (!window.confirm(`Benutzer "${userToRemove?.first_name} ${userToRemove?.last_name}" (@${userToRemove?.username}) wirklich aus der Gruppe "${selectedGroup.name}" entfernen?`)) return;
    setLoadingUsers(true);
    try {
        const groupId = selectedGroup.id;
        const response = await userGroupApi.removeUserFromGroup(Number(groupId), userIdStr);
        if (response.success) {
            setSnackbar({ open: true, message: response.message || 'Benutzer erfolgreich aus Gruppe entfernt', severity: 'success' });
            await loadGroupUsers(Number(groupId));
            await loadGroups();
        } else {
            throw new Error(response.message || 'Fehler beim Entfernen des Benutzers.');
        }
    } catch (error) {
        const errorMessage = handleApiError(error);
        setSnackbar({ open: true, message: `Fehler beim Entfernen des Benutzers: ${errorMessage}`, severity: 'error' });
    } finally {
        setLoadingUsers(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleGroupMenuAction = (actionType: MenuAction | string, row: UserGroup) => {
    switch (actionType) {
      case 'view':
        setSelectedGroup(row);
        break;
      case 'edit':
        handleOpenEditDialog('edit', row);
        break;
      case 'delete':
        handleDeleteRequest(row);
        break;
      default:
        console.warn(`[UserGroupManagement] Unbekannte Aktion: ${actionType}`);
    }
  };

  const groupColumns: AtlasColumn<UserGroup>[] = [
    { label: 'Name', dataKey: 'name', width: 250 },
    { label: 'Beschreibung', dataKey: 'description', width: 400 },
    { label: 'Mitglieder', dataKey: 'userCount', numeric: true, width: 100, render: (value) => value ?? 0 }
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
           useContextMenu={true}
           onContextMenuAction={handleGroupMenuAction}
           contextMenuUsePosition={true}
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
            sx={{ mb: 2, mt: 1 }}
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
          <DialogContent dividers sx={{ pt: 1 }}>
              {loadingUsers && !allUsers.length ? (
                  <CircularProgress sx={{ display: 'block', margin: 'auto' }} />
              ) : (
                  <FormControl fullWidth margin="normal">
                      <InputLabel id="select-user-label">Benutzer auswählen</InputLabel>
                      <Select
                          labelId="select-user-label"
                          id="select-user"
                          value={selectedUserIdToAdd === 0 ? '' : selectedUserIdToAdd}
                          label="Benutzer auswählen"
                          onChange={(e: SelectChangeEvent<number>) => setSelectedUserIdToAdd(Number(e.target.value))}
                          disabled={nonMemberUsers.length === 0 || loadingUsers}
                      >
                          <MenuItem value={0} disabled><em>-- Benutzer wählen --</em></MenuItem>
                          {nonMemberUsers.map(user => (
                              <MenuItem key={user.id} value={user.id}>
                                  {user.first_name} {user.last_name} (@{user.username})
                              </MenuItem>
                          ))}
                          {nonMemberUsers.length === 0 && <MenuItem value={0} disabled><em>Keine weiteren Benutzer verfügbar</em></MenuItem>}
                      </Select>
                  </FormControl>
              )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseAddUserDialog} disabled={dialogLoading}>Abbrechen</Button>
              <Button
                  onClick={handleAddUserToGroup}
                  variant="contained"
                  color="secondary"
                  disabled={!selectedUserIdToAdd || selectedUserIdToAdd === 0 || dialogLoading || nonMemberUsers.length === 0}
              >
                  {dialogLoading ? <CircularProgress size={24} /> : 'Hinzufügen'}
              </Button>
          </DialogActions>
      </Dialog>

      <ConfirmationDialog
        open={confirmDeleteDialogOpen}
        onClose={handleCloseConfirmDeleteDialog}
        onConfirm={executeDelete}
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
