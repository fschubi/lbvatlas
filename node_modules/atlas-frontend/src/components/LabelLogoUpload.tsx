import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Slider,
  FormControl,
  FormControlLabel,
  Checkbox,
  Divider,
  Collapse,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Rotate90DegreesCcw as RotateIcon,
  ImageSearch as ImageSearchIcon
} from '@mui/icons-material';

interface LabelLogoUploadProps {
  logoUrl: string | null;
  onLogoChange: (logoUrl: string | null) => void;
  onLogoSettingsChange: (settings: LogoSettings) => void;
  logoSettings: LogoSettings;
}

export interface LogoSettings {
  scale: number;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  rotation: number;
  opacity: number;
  showBehindCode: boolean;
}

const LabelLogoUpload: React.FC<LabelLogoUploadProps> = ({
  logoUrl,
  onLogoChange,
  logoSettings,
  onLogoSettingsChange
}) => {
  const [error, setError] = useState<string | null>(null);

  // Logo-Datei auswählen
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      // Prüfen der Dateigröße (max 1MB)
      if (file.size > 1024 * 1024) {
        setError('Die Datei ist zu groß. Maximale Größe: 1MB');
        return;
      }

      // Prüfen des Dateityps
      if (!file.type.match('image/jpeg|image/png|image/svg+xml')) {
        setError('Nur JPG, PNG und SVG Dateien sind erlaubt');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onLogoChange(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Logo entfernen
  const handleRemoveLogo = () => {
    onLogoChange(null);
  };

  // Logo-Einstellungen ändern
  const handleSettingsChange = (key: keyof LogoSettings, value: any) => {
    onLogoSettingsChange({
      ...logoSettings,
      [key]: value
    });
  };

  // Position ändern
  const handlePositionChange = (event: SelectChangeEvent<string>) => {
    handleSettingsChange('position', event.target.value as 'top' | 'bottom' | 'left' | 'right' | 'center');
  };

  // Logo-Rotation um 90 Grad
  const handleRotate = () => {
    const newRotation = (logoSettings.rotation + 90) % 360;
    handleSettingsChange('rotation', newRotation);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Logo/Grafik hinzufügen
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
        <Paper
          sx={{
            width: { xs: '100%', sm: 150 },
            height: 150,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: 'background.default',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {logoUrl ? (
            <>
              <Box
                component="img"
                src={logoUrl}
                alt="Logo"
                sx={{
                  maxWidth: `${logoSettings.scale * 100}%`,
                  maxHeight: `${logoSettings.scale * 100}%`,
                  opacity: logoSettings.opacity,
                  transform: `rotate(${logoSettings.rotation}deg)`,
                  objectFit: 'contain'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  display: 'flex',
                  gap: 0.5
                }}
              >
                <Tooltip title="Logo entfernen">
                  <IconButton size="small" color="error" onClick={handleRemoveLogo}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          ) : (
            <Tooltip title="Logo hochladen">
              <IconButton
                component="label"
                sx={{ width: '100%', height: '100%', borderRadius: 0 }}
              >
                <ImageSearchIcon color="action" sx={{ fontSize: 40, opacity: 0.5 }} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/svg+xml"
                  hidden
                  onChange={handleLogoUpload}
                />
              </IconButton>
            </Tooltip>
          )}
        </Paper>

        <Box sx={{ flexGrow: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="label"
            fullWidth
            sx={{ mb: 1 }}
          >
            Logo hochladen
            <input
              type="file"
              accept="image/jpeg,image/png,image/svg+xml"
              hidden
              onChange={handleLogoUpload}
            />
          </Button>

          {logoUrl && (
            <>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Tooltip title="Um 90° drehen">
                  <IconButton size="small" onClick={handleRotate}>
                    <RotateIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Vergrößern">
                  <IconButton
                    size="small"
                    onClick={() => handleSettingsChange('scale', Math.min(logoSettings.scale + 0.1, 1))}
                  >
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Verkleinern">
                  <IconButton
                    size="small"
                    onClick={() => handleSettingsChange('scale', Math.max(logoSettings.scale - 0.1, 0.1))}
                  >
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography id="logo-scale-slider" gutterBottom variant="caption">
                    Größe: {Math.round(logoSettings.scale * 100)}%
                  </Typography>
                  <Slider
                    value={logoSettings.scale}
                    onChange={(_e, newValue) => handleSettingsChange('scale', newValue)}
                    min={0.1}
                    max={1}
                    step={0.05}
                    aria-labelledby="logo-scale-slider"
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography id="logo-opacity-slider" gutterBottom variant="caption">
                    Transparenz: {Math.round((1 - logoSettings.opacity) * 100)}%
                  </Typography>
                  <Slider
                    value={logoSettings.opacity}
                    onChange={(_e, newValue) => handleSettingsChange('opacity', newValue)}
                    min={0.1}
                    max={1}
                    step={0.05}
                    aria-labelledby="logo-opacity-slider"
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="logo-position-label">Position</InputLabel>
                    <Select
                      labelId="logo-position-label"
                      id="logo-position"
                      value={logoSettings.position}
                      label="Position"
                      onChange={handlePositionChange}
                    >
                      <MenuItem value="center">Zentriert</MenuItem>
                      <MenuItem value="top">Oben</MenuItem>
                      <MenuItem value="bottom">Unten</MenuItem>
                      <MenuItem value="left">Links</MenuItem>
                      <MenuItem value="right">Rechts</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={logoSettings.showBehindCode}
                    onChange={(e) => handleSettingsChange('showBehindCode', e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption">
                    Logo hinter QR-/Barcode anzeigen
                  </Typography>
                }
              />
            </>
          )}
        </Box>
      </Box>

      {logoUrl && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Vorschau des Layouts
          </Typography>
          <Paper
            sx={{
              width: '100%',
              height: 200,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'background.paper',
              position: 'relative',
              overflow: 'hidden',
              border: '1px dashed #aaa'
            }}
          >
            {/* Logo-Positionierung in der Vorschau */}
            <Box
              sx={{
                position: 'absolute',
                top: logoSettings.position === 'top' ? '10%' :
                     logoSettings.position === 'center' ? '50%' :
                     logoSettings.position === 'bottom' ? '90%' : '50%',
                left: logoSettings.position === 'left' ? '10%' :
                      logoSettings.position === 'center' ? '50%' :
                      logoSettings.position === 'right' ? '90%' : '50%',
                transform: `translate(-50%, -50%) rotate(${logoSettings.rotation}deg)`,
                opacity: logoSettings.opacity
              }}
            >
              <Box
                component="img"
                src={logoUrl}
                alt="Logo"
                sx={{
                  maxWidth: `${logoSettings.scale * 80}px`,
                  maxHeight: `${logoSettings.scale * 80}px`,
                  objectFit: 'contain'
                }}
              />
            </Box>

            {/* Repräsentation des QR-Codes */}
            {!logoSettings.showBehindCode && (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#ccc',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#666',
                  fontSize: '0.7rem'
                }}
              >
                QR-Code
              </Box>
            )}

            {/* QR-Code über Logo falls showBehindCode aktiviert */}
            {logoSettings.showBehindCode && (
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'rgba(204, 204, 204, 0.7)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#666',
                  fontSize: '0.7rem',
                  zIndex: 10
                }}
              >
                QR-Code
              </Box>
            )}
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Das Logo wird in der oben ausgewählten Position auf dem Etikett platziert.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LabelLogoUpload;
