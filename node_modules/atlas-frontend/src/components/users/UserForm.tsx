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
  SelectChangeEvent
} from '@mui/material';

interface UserFormProps {
  userData: any;
  onSave: (userData: any) => void;
  mode: 'create' | 'edit' | 'view';
  isLoading: boolean;
}

interface UserFormData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  location_id: string;
  room_id: string;
  phone: string;
  is_active: boolean;
  receive_emails: boolean;
  password: string;
  confirmPassword: string;
  [key: string]: string | boolean; // Index-Signatur für dynamischen Zugriff
}

const UserForm: React.FC<UserFormProps> = ({
  userData,
  onSave,
  mode,
  isLoading
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'user',
    department: '',
    location_id: '',
    room_id: '',
    phone: '',
    is_active: true,
    receive_emails: true,
    password: '',
    confirmPassword: ''
  });

  const [passwordError, setPasswordError] = useState<string>('');
  const [roles] = useState([
    { id: 1, name: 'admin', label: 'Administrator' },
    { id: 2, name: 'manager', label: 'Manager' },
    { id: 3, name: 'user', label: 'Benutzer' },
    { id: 4, name: 'guest', label: 'Gast' }
  ]);

  // Dummy-Daten für Standorte und Räume
  const [locations] = useState([
    { id: 1, name: 'Hauptsitz' },
    { id: 2, name: 'Niederlassung Nord' },
    { id: 3, name: 'Niederlassung Süd' }
  ]);

  const [rooms] = useState([
    { id: 1, location_id: 1, name: 'Büro 101', room_number: '101' },
    { id: 2, location_id: 1, name: 'Büro 102', room_number: '102' },
    { id: 3, location_id: 2, name: 'Konferenzraum 1', room_number: 'K1' },
    { id: 4, location_id: 3, name: 'Büro 201', room_number: '201' }
  ]);

  // Bei Änderungen der userData oder des Modus die Formulardaten aktualisieren
  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        role: userData.role || 'user',
        department: userData.department || '',
        location_id: userData.location_id || '',
        room_id: userData.room_id || '',
        phone: userData.phone || '',
        is_active: userData.is_active ?? true,
        receive_emails: userData.receive_emails ?? true,
        password: '',
        confirmPassword: ''
      });
    }
  }, [userData]);

  // Nur die relevanten Räume basierend auf dem ausgewählten Standort anzeigen
  const filteredRooms = rooms.filter(room =>
    formData.location_id && room.location_id.toString() === formData.location_id.toString()
  );

  // Handler für Änderungen in Formularfeldern
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      } as UserFormData);

      // Zurücksetzen des Passwortfehlers, wenn eines der Passwortfelder geändert wird
      if (name === 'password' || name === 'confirmPassword') {
        setPasswordError('');
      }
    }
  };

  // Handler für Checkbox/Switch-Änderungen
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  // Formular absenden
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Wenn wir einen neuen Benutzer erstellen oder das Passwort ändern, überprüfe die Passwörter
    if ((mode === 'create' || formData.password) && formData.password !== formData.confirmPassword) {
      setPasswordError('Die Passwörter stimmen nicht überein');
      return;
    }

    // Validierung bestanden, an die übergeordnete Komponente übergeben
    const userDataToSave = { ...formData };

    // Entferne confirmPassword, da wir es nicht an den Server senden möchten
    const { confirmPassword, ...dataToSave } = userDataToSave;

    // Wenn kein Passwort gesetzt wurde und wir im Bearbeitungsmodus sind, Passwort entfernen
    if (mode === 'edit' && !dataToSave.password) {
      const { password, ...dataWithoutPassword } = dataToSave;
      onSave(dataWithoutPassword);
    } else {
      onSave(dataToSave);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Benutzerdaten
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          {/* Benutzername */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Benutzername"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
              required
            />
          </Grid>

          {/* Vorname */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vorname"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
              required
            />
          </Grid>

          {/* Nachname */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nachname"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
              required
            />
          </Grid>

          {/* E-Mail */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="E-Mail"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
              required
            />
          </Grid>

          {/* Rolle */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isLoading || mode === 'view'}>
              <InputLabel id="role-label">Rolle</InputLabel>
              <Select
                labelId="role-label"
                name="role"
                value={formData.role}
                label="Rolle"
                onChange={handleChange}
                required
              >
                {roles.map(role => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Abteilung */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Abteilung"
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
            />
          </Grid>

          {/* Standort */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={isLoading || mode === 'view'}>
              <InputLabel id="location-label">Standort</InputLabel>
              <Select
                labelId="location-label"
                name="location_id"
                value={formData.location_id}
                label="Standort"
                onChange={handleChange}
              >
                <MenuItem value="">
                  <em>Kein Standort</em>
                </MenuItem>
                {locations.map(location => (
                  <MenuItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Raum */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={!formData.location_id || isLoading || mode === 'view'}>
              <InputLabel id="room-label">Raum</InputLabel>
              <Select
                labelId="room-label"
                name="room_id"
                value={formData.room_id}
                label="Raum"
                onChange={handleChange}
              >
                <MenuItem value="">
                  <em>Kein Raum</em>
                </MenuItem>
                {filteredRooms.map(room => (
                  <MenuItem key={room.id} value={room.id.toString()}>
                    {room.name} ({room.room_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Telefon */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Telefonnummer"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading || mode === 'view'}
            />
          </Grid>

          {/* Status und E-Mail-Empfang */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={handleSwitchChange}
                    name="is_active"
                    disabled={isLoading || mode === 'view'}
                  />
                }
                label="Aktiv"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.receive_emails}
                    onChange={handleSwitchChange}
                    name="receive_emails"
                    disabled={isLoading || mode === 'view'}
                  />
                }
                label="E-Mails empfangen"
              />
            </Box>
          </Grid>

          {/* Passwort-Felder (nur bei Erstellung oder Bearbeitung anzeigen) */}
          {mode !== 'view' && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  {mode === 'create' ? 'Passwort festlegen' : 'Passwort ändern (optional)'}
                </Typography>
                <Divider />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Passwort"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  required={mode === 'create'}
                  error={Boolean(passwordError)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Passwort bestätigen"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  required={mode === 'create'}
                  error={Boolean(passwordError)}
                  helperText={passwordError}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Formular-Buttons (nur zeigen, wenn nicht im View-Modus) */}
        {mode !== 'view' && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                mode === 'create' ? 'Erstellen' : 'Speichern'
              )}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default UserForm;
