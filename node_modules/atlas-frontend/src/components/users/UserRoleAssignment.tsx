import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3500/api';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface UserRoleAssignmentProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onRolesUpdated: () => void;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({
  open,
  onClose,
  userId,
  username,
  onRolesUpdated
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadRolesAndUserRoles();
    }
  }, [open, userId]);

  const loadRolesAndUserRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesResponse, userRolesResponse] = await Promise.all([
        axios.get<ApiResponse<Role[]>>(`${API_BASE_URL}/roles`),
        axios.get<ApiResponse<Role[]>>(`${API_BASE_URL}/users/${userId}/roles`)
      ]);

      setRoles(rolesResponse.data.data);
      setUserRoles(userRolesResponse.data.data.map(role => role.id));
    } catch (err) {
      console.error('Fehler beim Laden der Rollen:', err);
      setError('Fehler beim Laden der Rollen');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (roleId: string) => {
    try {
      setError(null);
      const isAssigned = userRoles.includes(roleId);

      if (isAssigned) {
        await axios.delete(`${API_BASE_URL}/users/${userId}/roles/${roleId}`);
        setUserRoles(userRoles.filter(id => id !== roleId));
      } else {
        await axios.post(`${API_BASE_URL}/users/${userId}/roles/${roleId}`);
        setUserRoles([...userRoles, roleId]);
      }

      onRolesUpdated();
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Rollen:', err);
      setError('Fehler beim Aktualisieren der Rollen');
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rollen für {username}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress />
        ) : (
          <List>
            {roles.map((role) => (
              <ListItem
                key={role.id}
                button
                onClick={() => handleRoleToggle(role.id)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={userRoles.includes(role.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText
                  primary={role.name}
                  secondary={role.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserRoleAssignment;
