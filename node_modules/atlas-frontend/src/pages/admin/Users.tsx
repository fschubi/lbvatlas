import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { UsersTable } from '../../components/users/UsersTable';
import UserDetailDialog from '../../components/users/UserDetailDialog';
import { useSnackbar } from 'notistack';
import { User } from '../../types/user';
import { useConfirm } from 'material-ui-confirm';
import { useApi } from '../../hooks/useApi';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view');
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const api = useApi();

  // Benutzer laden
  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
    }
  }, [api]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Dialog-Handler
  const handleOpenDialog = (user: User | null = null, mode: 'create' | 'edit' | 'view' = 'view') => {
    console.log('Opening dialog with mode:', mode, 'and user:', user);
    setSelectedUser(user);
    setDialogMode(mode);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedUser(null);
    setDialogMode('view');
    setIsDialogOpen(false);
  };

  const handleSave = async (userData: User) => {
    try {
      if (dialogMode === 'create') {
        await api.post('/users', userData);
      } else {
        await api.put(`/users/${userData.id}`, userData);
      }
      await loadUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    }
  };

  // Aktions-Handler
  const handleView = (user: User) => {
    handleOpenDialog(user, 'view');
  };

  const handleEdit = (user: User) => {
    handleOpenDialog(user, 'edit');
  };

  const handleDelete = async (user: User) => {
    try {
      await confirm({
        title: 'Benutzer löschen',
        description: `Möchten Sie den Benutzer "${user.display_name || user.username}" wirklich löschen?`,
        confirmationText: 'Löschen',
        cancellationText: 'Abbrechen',
      });

      await api.delete(`/users/${user.id}`);
      enqueueSnackbar('Benutzer erfolgreich gelöscht', { variant: 'success' });
      loadUsers();
    } catch (error) {
      if (error !== 'CANCELLED') {
        enqueueSnackbar('Fehler beim Löschen des Benutzers', { variant: 'error' });
      }
    }
  };

  const handleLockToggle = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, {
        active: !user.active
      });
      enqueueSnackbar(
        `Benutzer erfolgreich ${user.active ? 'gesperrt' : 'entsperrt'}`,
        { variant: 'success' }
      );
      loadUsers();
    } catch (error) {
      enqueueSnackbar('Fehler beim Ändern des Benutzerstatus', { variant: 'error' });
    }
  };

  const handleGroupAssign = (user: User) => {
    // Implementierung der Gruppenzuweisung
    console.log('Gruppenzuweisung für:', user);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Benutzerverwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null, 'create')}
        >
          Neuer Benutzer
        </Button>
      </Box>

      <UsersTable
        users={users}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLockToggle={handleLockToggle}
        onGroupAssign={handleGroupAssign}
      />

      <UserDetailDialog
        open={isDialogOpen}
        user={selectedUser}
        mode={dialogMode}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
    </Box>
  );
};
