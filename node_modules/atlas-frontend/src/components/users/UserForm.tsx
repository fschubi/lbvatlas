import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Typography,
  Divider,
  Paper,
  SelectChangeEvent,
  Alert
} from '@mui/material';
import { User } from '../../types/user';
import { useApi } from '../../hooks/useApi';

interface UserFormProps {
  user: User | null;
  onSubmit: (userData: Partial<User>) => void;
  isLoading?: boolean;
}

interface Department {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  isLoading = false,
}) => {
  const api = useApi();
  const [formData, setFormData] = useState<Partial<User>>(user || {});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await api.get('/departments');
        setDepartments(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Abteilungen:', error);
        setError('Abteilungen konnten nicht geladen werden');
      }
    };

    const loadLocations = async () => {
      try {
        const response = await api.get('/locations');
        setLocations(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Standorte:', error);
        setError('Standorte konnten nicht geladen werden');
      }
    };

    loadDepartments();
    loadLocations();
  }, [api]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box component="form" onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          Benutzerdaten
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Benutzername"
              name="username"
              value={formData.username || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="E-Mail"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleInputChange}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vorname"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nachname"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Anzeigename"
              name="display_name"
              value={formData.display_name || ''}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                name="role"
                value={formData.role || ''}
                onChange={handleSelectChange}
                required
              >
                <MenuItem value="user">Benutzer</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="support">Support</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Abteilung</InputLabel>
              <Select
                name="department_id"
                value={formData.department_id || ''}
                onChange={handleSelectChange}
                label="Abteilung"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Standort</InputLabel>
              <Select
                name="location_id"
                value={formData.location_id || ''}
                onChange={handleSelectChange}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Telefon"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                  name="active"
                />
              }
              label="Aktiv"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.email_notifications_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email_notifications_enabled: e.target.checked,
                    }))
                  }
                  name="email_notifications_enabled"
                />
              }
              label="E-Mail-Benachrichtigungen aktiviert"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default UserForm;
