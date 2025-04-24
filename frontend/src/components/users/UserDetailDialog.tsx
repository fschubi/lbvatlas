import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import UserForm from './UserForm';
import { User } from '../../types/user';

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  mode: 'create' | 'edit' | 'view';
  onSave: (userData: Partial<User>) => void;
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  open,
  onClose,
  user,
  mode,
  onSave
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User> | null>(null);

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        setFormData({
          username: '',
          email: '',
          first_name: '',
          last_name: '',
          display_name: '',
          role: 'user',
          active: true,
          email_notifications_enabled: true
        });
      } else if (user) {
        setFormData(user);
      }
    }
  }, [open, user, mode]);

  const handleSave = async (data: Partial<User>) => {
    setIsLoading(true);
    try {
      await onSave(data as Partial<User>);
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dialogTitle = mode === 'create'
    ? 'Neuen Benutzer erstellen'
    : mode === 'edit'
      ? 'Benutzer bearbeiten'
      : 'Benutzerdetails';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{dialogTitle}</Typography>
          <IconButton edge="end" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : mode === 'view' && formData ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Persönliche Informationen
            </Typography>
            <Typography>
              <strong>Benutzername:</strong> {formData.username}
            </Typography>
            <Typography>
              <strong>Name:</strong> {formData.first_name} {formData.last_name}
            </Typography>
            <Typography>
              <strong>E-Mail:</strong> {formData.email}
            </Typography>
            <Typography>
              <strong>Rolle:</strong> {formData.role}
            </Typography>
            <Typography>
              <strong>Status:</strong>{' '}
              {formData.active ? 'Aktiv' : 'Inaktiv'}
            </Typography>
          </Box>
        ) : (
          <UserForm
            user={formData}
            onSubmit={handleSave}
            isLoading={isLoading}
          />
        )}
      </DialogContent>

      <DialogActions>
        {(mode === 'create' || mode === 'edit') && (
          <Button
            onClick={() => formData && handleSave(formData)}
            color="primary"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog;
