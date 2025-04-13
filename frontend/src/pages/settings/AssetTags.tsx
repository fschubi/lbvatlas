import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  QrCode2 as QrCodeIcon,
  ViewAgenda as BarcodeIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { AssetTagSettings } from '../../types/settings';
import { settingsApi } from '../../utils/api';
import handleApiError from '../../utils/errorHandler';
import { QRCodeSVG } from 'qrcode.react';

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

const AssetTags: React.FC = () => {
  // State für die Daten
  const [settings, setSettings] = useState<AssetTagSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form State
  const [prefix, setPrefix] = useState<string>('LBV');
  const [digitCount, setDigitCount] = useState<number>(6);
  const [currentNumber, setCurrentNumber] = useState<number>(1);
  const [previewNumber, setPreviewNumber] = useState<number>(1);

  // UI State
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Daten laden
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getAssetTagSettings() as ApiResponse<AssetTagSettings>;
      const settingsData = response.data;

      if (settingsData) {
        setSettings(settingsData);
        setPrefix(settingsData.prefix);
        setDigitCount(settingsData.digitCount);
        setCurrentNumber(settingsData.currentNumber);
        setPreviewNumber(settingsData.currentNumber);
      } else {
        // Default-Werte, wenn noch keine Einstellungen vorhanden sind
        setPrefix('LBV');
        setDigitCount(6);
        setCurrentNumber(1);
        setPreviewNumber(1);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Laden der Einstellungen: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Speichern der Einstellungen
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        prefix,
        digitCount,
        currentNumber
      };

      let response;
      if (settings?.id) {
        // Update bestehender Einstellungen
        response = await settingsApi.updateAssetTagSettings(settings.id, updateData) as ApiResponse<AssetTagSettings>;
      } else {
        // Neue Einstellungen erstellen
        response = await settingsApi.createAssetTagSettings(updateData) as ApiResponse<AssetTagSettings>;
      }

      setSettings(response.data);
      setSnackbar({
        open: true,
        message: 'Asset Tag-Einstellungen erfolgreich gespeichert!',
        severity: 'success'
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      setSnackbar({
        open: true,
        message: `Fehler beim Speichern der Einstellungen: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Formular validieren
  const validateForm = (): boolean => {
    if (!prefix) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie ein Präfix ein!',
        severity: 'error'
      });
      return false;
    }

    if (prefix.length > 10) {
      setSnackbar({
        open: true,
        message: 'Das Präfix darf maximal 10 Zeichen lang sein!',
        severity: 'error'
      });
      return false;
    }

    if (digitCount < 1 || digitCount > 10) {
      setSnackbar({
        open: true,
        message: 'Die Anzahl der Stellen muss zwischen 1 und 10 liegen!',
        severity: 'error'
      });
      return false;
    }

    if (currentNumber < 1) {
      setSnackbar({
        open: true,
        message: 'Die aktuelle Nummer muss mindestens 1 sein!',
        severity: 'error'
      });
      return false;
    }

    return true;
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Asset Tag-Format erzeugen
  const generateAssetTag = (number: number) => {
    const paddedNumber = number.toString().padStart(digitCount, '0');
    return `${prefix}${paddedNumber}`;
  };

  // Vorschau-Tags erzeugen
  const previewTags = [
    generateAssetTag(previewNumber),
    generateAssetTag(previewNumber + 1),
    generateAssetTag(previewNumber + 2)
  ];

  // Einfacher Barcode-Renderer
  const renderSimpleBarcode = (value: string) => {
    return (
      <Box sx={{
        border: '1px solid #555',
        p: 2,
        textAlign: 'center',
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        <Typography variant="h6" fontFamily="monospace" letterSpacing={2} sx={{ mb: 1 }}>
          {value}
        </Typography>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          height: 50,
          mb: 1
        }}>
          {value.split('').map((char, i) => (
            <Box key={i} sx={{
              width: 3,
              mx: 0.5,
              height: `${70 + Math.random() * 30}%`,
              backgroundColor: '#fff'
            }} />
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Asset Tag-Einstellungen</Typography>
        <Box>
          <Tooltip title="Aktualisieren">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Asset Tag-Konfiguration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Konfigurieren Sie hier das Format für Asset Tags, die automatisch beim Anlegen neuer Geräte generiert werden.
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Präfix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    helperText="Präfix für alle Asset Tags (z.B. LBV, HW)"
                    inputProps={{ maxLength: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Anzahl der Stellen"
                    type="number"
                    value={digitCount}
                    onChange={(e) => setDigitCount(parseInt(e.target.value))}
                    helperText="Anzahl der Stellen für die fortlaufende Nummer"
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Aktuelle Nummer"
                    type="number"
                    value={currentNumber}
                    onChange={(e) => setCurrentNumber(parseInt(e.target.value))}
                    helperText="Nächste zu vergebende Nummer"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vorschau-Nummer"
                    type="number"
                    value={previewNumber}
                    onChange={(e) => setPreviewNumber(parseInt(e.target.value))}
                    helperText="Nummer für die Vorschau (nur zur Anzeige)"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={24} /> : 'Speichern'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vorschau
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                So werden Ihre Asset Tags aussehen:
              </Typography>

              <Grid container spacing={2}>
                {previewTags.map((tag, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {tag}
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                QR-Code
                              </Typography>
                              <QRCodeSVG value={tag} size={120} />
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Barcode
                              </Typography>
                              {renderSimpleBarcode(tag)}
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AssetTags;
