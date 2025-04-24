import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
<<<<<<< HEAD
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
=======
  Switch
} from '@mui/material';
import { User, Role } from '../../types/user';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: Partial<User>) => void;
  user?: User;
  roles: Role[];
  loading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  onSubmit,
  user,
  roles,
  loading = false
}) => {
  const [formData, setFormData] = React.useState<Partial<User>>({
    username: '',
    name: '',
    email: '',
    role_id: 0,
    is_active: true,
    password: '',
    confirmPassword: ''
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        role_id: 0,
        is_active: true,
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = (field: keyof User | 'confirmPassword') => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const { confirmPassword, ...submitData } = formData;
    onSubmit(submitData);
  };

  const isFormValid = () => {
    const { username, name, email, role_id, password, confirmPassword } = formData;
    const isCreateMode = !user;

    return Boolean(
      username?.trim() &&
      name?.trim() &&
      email?.trim() &&
      role_id &&
      (!isCreateMode || (password && password === confirmPassword))
    );
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
<<<<<<< HEAD
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
=======
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {user ? 'Benutzer bearbeiten' : 'Neuen Benutzer erstellen'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                label="Benutzername"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.username}
                onChange={handleChange('username')}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleChange('name')}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="E-Mail"
                type="email"
                fullWidth
                variant="outlined"
                value={formData.email}
                onChange={handleChange('email')}
                required
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="role-label">Rolle</InputLabel>
                <Select
                  labelId="role-label"
                  value={formData.role_id}
                  onChange={handleChange('role_id')}
                  label="Rolle"
                  required
                  disabled={loading}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label={user ? 'Neues Passwort (optional)' : 'Passwort'}
                type="password"
                fullWidth
                variant="outlined"
                value={formData.password}
                onChange={handleChange('password')}
                required={!user}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Passwort bestätigen"
                type="password"
                fullWidth
                variant="outlined"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required={!user || Boolean(formData.password)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleChange('is_active')}
                    color="primary"
                    disabled={loading}
                  />
                }
                label="Benutzer ist aktiv"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
          <Button
            type="submit"
            variant="contained"
            color="primary"
<<<<<<< HEAD
            disabled={isLoading}
            sx={{ minWidth: 120 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Speichern'}
          </Button>
        </Box>
      </Box>
    </Paper>
=======
            disabled={!isFormValid() || loading}
          >
            {user ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
  );
};
