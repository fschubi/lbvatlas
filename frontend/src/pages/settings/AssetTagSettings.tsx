import React from 'react';
import { Box, Typography, Paper, Alert, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { QrCode2 as AssetTagIcon, Save as SaveIcon } from '@mui/icons-material';

const AssetTagSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <AssetTagIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">Asset Tags konfigurieren</Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Hier können Sie das Format und die Nummerierung der Gerätekennzeichnung für Asset-Tags konfigurieren.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Präfix und Nummerierungseinstellungen
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Asset-Tag-Präfix"
              placeholder="ATLAS-"
              variant="outlined"
              disabled
              helperText="Präfix für alle generierten Asset-Tags"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Startnummer"
              placeholder="1000"
              variant="outlined"
              type="number"
              disabled
              helperText="Beginnen der Nummerierung ab dieser Zahl"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled>
              <InputLabel>Nummerierungsformat</InputLabel>
              <Select
                label="Nummerierungsformat"
                value="6"
              >
                <MenuItem value="4">4-stellig (0001)</MenuItem>
                <MenuItem value="5">5-stellig (00001)</MenuItem>
                <MenuItem value="6">6-stellig (000001)</MenuItem>
                <MenuItem value="7">7-stellig (0000001)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled>
              <InputLabel>Kategoriebezeichner</InputLabel>
              <Select
                label="Kategoriebezeichner"
                value="true"
              >
                <MenuItem value="true">Mit Kategoriebezeichner (ATLAS-LT-000001)</MenuItem>
                <MenuItem value="false">Ohne Kategoriebezeichner (ATLAS-000001)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Beispiel-Asset-Tag: ATLAS-LT-000001
            </Alert>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              Diese Seite wird derzeit entwickelt und wird in einer zukünftigen Version verfügbar sein.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
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

export default AssetTagSettings;
