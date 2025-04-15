import React from 'react';
import { Box, Typography, Paper, Alert, TextField, FormControlLabel, Switch, Button, Grid } from '@mui/material';
import { Email as EmailIcon, Send as SendIcon, Save as SaveIcon } from '@mui/icons-material';

const EmailSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <EmailIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">E-Mail-Benachrichtigungen</Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Hier können Sie die E-Mail-Server-Einstellungen und Benachrichtigungsregeln konfigurieren.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              SMTP-Server-Einstellungen
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP-Server"
              placeholder="smtp.example.com"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP-Port"
              placeholder="587"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Benutzername"
              placeholder="username@example.com"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Passwort"
              type="password"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Absender-E-Mail"
              placeholder="atlas@example.com"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Absender-Name"
              placeholder="ATLAS System"
              variant="outlined"
              disabled
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={<Switch disabled />}
              label="SSL/TLS verwenden"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={<Switch disabled />}
              label="E-Mail-Benachrichtigungen aktivieren"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              Diese Seite wird derzeit entwickelt und wird in einer zukünftigen Version verfügbar sein.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled
              >
                Test-E-Mail senden
              </Button>

              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled
              >
                Einstellungen speichern
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default EmailSettings;
