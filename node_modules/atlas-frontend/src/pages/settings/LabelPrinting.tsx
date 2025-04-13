import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs
} from '@mui/material';
import {
  Print as PrintIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  QrCode2 as QrCodeIcon,
  ViewWeek as BarcodeIcon,
  Add as AddIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import BarcodeComponent from '../../components/BarcodeComponent';
import LabelTemplates, { labelTemplates, LabelTemplate } from '../../components/LabelTemplates';
import { useReactToPrint } from 'react-to-print';
import SavedLabelTemplate from '../../components/SavedLabelTemplate';
import LabelLogoUpload, { LogoSettings } from '../../components/LabelLogoUpload';
import LabelTemplateSelector from '../../components/LabelTemplateSelector';
import { settingsApi } from '../../utils/api';

// Interface für die Label-Einstellungen
interface LabelSettings {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  includeAssetTag: boolean;
  includeCompanyName: boolean;
  includeDate: boolean;
  includeAdditionalText: boolean;
  additionalText: string;
  companyName: string;
  labelsPerRow: number;
  labelGap: number;
  logo: string | null;
  logoSettings: {
    scale: number;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    rotation: number;
    opacity: number;
    showBehindCode: boolean;
  }
}

// Interface für die Etiketten-Parameter
interface LabelParams {
  startNumber: number;
  endNumber: number;
  codeType: 'qr' | 'barcode';
  usePrefix: boolean;
  customPrefix: string;
}

interface AssetTagSettings {
  id: number;
  prefix: string;
  currentNumber: number;
  digitCount: number;
}

const LabelPrinting: React.FC = () => {
  // State für die Asset Tag-Einstellungen aus der Datenbank
  const [assetTagSettings, setAssetTagSettings] = useState<AssetTagSettings | null>({
    id: 1,
    prefix: 'LBV',
    currentNumber: 1000,
    digitCount: 6
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('citizen-small');

  // State für die Etiketten-Parameter
  const [labelParams, setLabelParams] = useState<LabelParams>({
    startNumber: 2000,
    endNumber: 2020,
    codeType: 'qr',
    usePrefix: true,
    customPrefix: 'LBV'
  });

  // State für die Etiketten-Einstellungen
  const [labelSettings, setLabelSettings] = useState<LabelSettings>({
    width: 50,
    height: 30,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 2,
    marginRight: 2,
    fontSize: 8,
    includeAssetTag: true,
    includeCompanyName: true,
    includeDate: false,
    includeAdditionalText: false,
    additionalText: 'Inventar',
    companyName: 'LBV ATLAS',
    labelsPerRow: 1,
    labelGap: 5,
    logo: null,
    logoSettings: {
      scale: 1,
      position: 'center',
      rotation: 0,
      opacity: 1,
      showBehindCode: false
    }
  });

  // UI State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [generatedLabels, setGeneratedLabels] = useState<string[]>([]);
  const [showQRGenerator, setShowQRGenerator] = useState<boolean>(false);
  const [currentQRValue, setCurrentQRValue] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Ref für den Druckbereich
  const printComponentRef = useRef<HTMLDivElement>(null);

  // State zum Verfolgen, ob gespeichert wird
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Laden der gespeicherten Einstellungen beim Initialisieren
  useEffect(() => {
    loadLabelSettings();
  }, []);

  // Gespeicherte Einstellungen laden
  const loadLabelSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsApi.getLabelSettings();

      if (response && response.data) {
        // Setze die geladenen Einstellungen
        setLabelSettings(response.data);

        setSnackbar({
          open: true,
          message: 'Etiketten-Einstellungen erfolgreich geladen',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      // Hier keine Fehlermeldung anzeigen, da es beim ersten Laden normal ist,
      // dass noch keine Einstellungen vorhanden sind
    } finally {
      setLoading(false);
    }
  };

  // Einstellungen speichern
  const saveSettings = async () => {
    try {
      setSavingSettings(true);

      const response = await settingsApi.saveLabelSettings(labelSettings);

      if (response && response.success) {
        setSnackbar({
          open: true,
          message: 'Etiketten-Einstellungen wurden gespeichert',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Einstellungen',
        severity: 'error'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Effekt für Template-Änderungen
  useEffect(() => {
    const template = labelTemplates.find(t => t.id === selectedTemplate);
    if (template) {
      setLabelSettings(prev => ({
        ...prev,
        width: template.width,
        height: template.height,
        marginTop: template.marginTop,
        marginRight: template.marginRight,
        marginBottom: template.marginBottom,
        marginLeft: template.marginLeft,
        labelsPerRow: template.labelsPerRow,
        labelGap: template.labelGap
      }));
    }
  }, [selectedTemplate]);

  // Etiketten generieren
  const generateLabels = () => {
    const { startNumber, endNumber, codeType, usePrefix, customPrefix } = labelParams;

    if (endNumber < startNumber) {
      setSnackbar({
        open: true,
        message: 'Die Endnummer muss größer oder gleich der Startnummer sein!',
        severity: 'error'
      });
      return;
    }

    if (!usePrefix && !customPrefix) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie ein benutzerdefiniertes Präfix ein oder verwenden Sie das Asset Tag-Präfix!',
        severity: 'error'
      });
      return;
    }

    // Verwende entweder das benutzerdefinierte Präfix oder das Asset Tag-Präfix
    const prefix = usePrefix && assetTagSettings
      ? assetTagSettings.prefix
      : customPrefix;

    // Generiere Etiketten basierend auf dem Nummernbereich
    const labels: string[] = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const paddedNumber = assetTagSettings
        ? i.toString().padStart(assetTagSettings.digitCount, '0')
        : i.toString().padStart(6, '0');

      labels.push(`${prefix}${paddedNumber}`);
    }

    setGeneratedLabels(labels);
  };

  // Print-Handler mit useReactToPrint
  const handlePrint = useReactToPrint({
    documentTitle: `ATLAS-Etiketten-${new Date().toLocaleDateString()}`,
    content: () => printComponentRef.current,
    onPrintError: (error: unknown) => {
      console.error('Druckfehler:', error);
      setSnackbar({
        open: true,
        message: 'Druckfehler aufgetreten',
        severity: 'error'
      });
    },
    onAfterPrint: () => {
      setSnackbar({
        open: true,
        message: 'Druckvorgang abgeschlossen',
        severity: 'success'
      });
    },
    // Print-CSS direkt im Styling
    pageStyle: `
      @media print {
        @page {
          size: auto;
          margin: 0mm;
        }
        body * {
          visibility: hidden;
        }
        #printComponentRef, #printComponentRef * {
          visibility: visible;
        }
        #printComponentRef {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .qrcode-actions {
          display: none !important;
        }
      }
    `
  } as any);

  // Vorschau generieren
  const handlePreview = () => {
    generateLabels();
  };

  // Zurücksetzen
  const handleReset = () => {
    setGeneratedLabels([]);
  };

  // Öffne QR-Code Generator für einzelnes Etikett
  const handleOpenQRGenerator = (value: string) => {
    setCurrentQRValue(value);
    setShowQRGenerator(true);
  };

  // Schließe QR-Code Generator
  const handleCloseQRGenerator = () => {
    setShowQRGenerator(false);
  };

  // Handler für Template-Änderungen
  const handleTemplateChange = (template: LabelTemplate) => {
    setSelectedTemplate(template.id);
  };

  // Tab-Wechsel-Handler
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Snackbar schließen
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Berechne die Anzahl der Zeilen basierend auf der Anzahl der Etiketten pro Zeile
  const calculateRows = () => {
    return Math.ceil(generatedLabels.length / labelSettings.labelsPerRow);
  };

  // Logo-Einstellungen ändern
  const handleLogoChange = (logoUrl: string | null) => {
    setLabelSettings({
      ...labelSettings,
      logo: logoUrl
    });
  };

  // Logo-Einstellungen aktualisieren
  const handleLogoSettingsChange = (settings: LogoSettings) => {
    setLabelSettings({
      ...labelSettings,
      logoSettings: settings
    });
  };

  // Benutzerdefinierte Vorlage laden
  const handleLoadTemplate = (template: LabelTemplate) => {
    setLabelSettings({
      ...labelSettings,
      ...template
    });
    setSnackbar({
      open: true,
      message: `Vorlage "${template.name}" geladen`,
      severity: 'success'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          p: 2,
          borderRadius: '4px 4px 0 0',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PrintIcon sx={{ fontSize: 28, mr: 2 }} />
          <Typography variant="h5" component="h1">
            Etikettendruck
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SettingsIcon />}
            onClick={() => setShowSettings(!showSettings)}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', mr: 1 }}
          >
            {showSettings ? 'Einstellungen ausblenden' : 'Einstellungen anzeigen'}
          </Button>

          {/* Speichern-Button hinzufügen */}
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={savingSettings}
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            {savingSettings ? 'Wird gespeichert...' : 'Einstellungen speichern'}
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Einstellungsbereich */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Etikettengenerator" />
              <Tab label="Druckvorlagen" />
              <Tab label="Gespeicherte Vorlagen" />
              <Tab label="Logo/Grafik" />
            </Tabs>

            {selectedTab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Startnummer"
                    value={labelParams.startNumber}
                    onChange={(e) => setLabelParams({
                      ...labelParams,
                      startNumber: parseInt(e.target.value)
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Endnummer"
                    value={labelParams.endNumber}
                    onChange={(e) => setLabelParams({
                      ...labelParams,
                      endNumber: parseInt(e.target.value)
                    })}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Code-Typ</InputLabel>
                    <Select
                      value={labelParams.codeType}
                      label="Code-Typ"
                      onChange={(e) => setLabelParams({
                        ...labelParams,
                        codeType: e.target.value as 'qr' | 'barcode'
                      })}
                    >
                      <MenuItem value="qr">QR-Code</MenuItem>
                      <MenuItem value="barcode">Barcode (Code 39)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={labelParams.usePrefix}
                        onChange={(e) => setLabelParams({
                          ...labelParams,
                          usePrefix: e.target.checked
                        })}
                      />
                    }
                    label={`Asset Tag-Präfix verwenden (${assetTagSettings?.prefix || 'LBV'})`}
                  />
                </Grid>

                {!labelParams.usePrefix && (
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Benutzerdefiniertes Präfix"
                      value={labelParams.customPrefix}
                      onChange={(e) => setLabelParams({
                        ...labelParams,
                        customPrefix: e.target.value
                      })}
                    />
                  </Grid>
                )}
              </Grid>
            )}

            {selectedTab === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <LabelTemplateSelector
                    onTemplateSelect={(templateSettings) => setLabelSettings(templateSettings)}
                    currentSettings={labelSettings}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                    <Typography variant="h6" gutterBottom>
                      Benutzerdefinierte Einstellungen
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Breite (mm)"
                          type="number"
                          value={labelSettings.width}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            width: parseFloat(e.target.value)
                          })}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Höhe (mm)"
                          type="number"
                          value={labelSettings.height}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            height: parseFloat(e.target.value)
                          })}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Schriftgröße (pt)"
                          type="number"
                          value={labelSettings.fontSize}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            fontSize: parseFloat(e.target.value)
                          })}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Etiketten pro Zeile"
                          type="number"
                          value={labelSettings.labelsPerRow}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            labelsPerRow: parseInt(e.target.value)
                          })}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {selectedTab === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <SavedLabelTemplate
                    currentSettings={labelSettings as unknown as LabelTemplate}
                    onLoadTemplate={handleLoadTemplate}
                  />
                </Grid>
              </Grid>
            )}

            {selectedTab === 3 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <LabelLogoUpload
                    logoUrl={labelSettings.logo}
                    logoSettings={labelSettings.logoSettings}
                    onLogoChange={handleLogoChange}
                    onLogoSettingsChange={handleLogoSettingsChange}
                  />
                </Grid>
              </Grid>
            )}

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
              >
                Vorschau
              </Button>

              <Button
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => handlePrint()}
                disabled={generatedLabels.length === 0}
              >
                Drucken
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleReset}
                disabled={generatedLabels.length === 0}
              >
                Zurücksetzen
              </Button>
            </Box>
          </Paper>

          {generatedLabels.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vorschau ({generatedLabels.length} Etiketten)
              </Typography>

              <Box
                id="printComponentRef"
                ref={printComponentRef}
                sx={{
                  mt: 2,
                  p: 2,
                  border: '1px dashed #ccc',
                  bgcolor: 'white'
                }}
              >
                <Grid container spacing={labelSettings.labelGap / 4}>
                  {Array.from({ length: calculateRows() }).map((_, rowIndex) => (
                    <Grid item xs={12} key={`row-${rowIndex}`} sx={{ display: 'flex', gap: `${labelSettings.labelGap}mm` }}>
                      {Array.from({ length: labelSettings.labelsPerRow }).map((_, colIndex) => {
                        const labelIndex = rowIndex * labelSettings.labelsPerRow + colIndex;
                        if (labelIndex >= generatedLabels.length) return null;

                        const label = generatedLabels[labelIndex];

                        return (
                          <Box
                            key={`label-${labelIndex}`}
                            sx={{
                              width: `${labelSettings.width}mm`,
                              height: `${labelSettings.height}mm`,
                              border: '1px dotted #aaa',
                              p: `${labelSettings.marginTop}mm ${labelSettings.marginRight}mm ${labelSettings.marginBottom}mm ${labelSettings.marginLeft}mm`,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1,
                              flexGrow: 1,
                              maxWidth: `${labelSettings.width}mm`,
                              pageBreakInside: 'avoid',
                              position: 'relative',
                              cursor: 'pointer',
                              '&:hover': {
                                boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                                '& .qrcode-actions': {
                                  opacity: 1
                                }
                              }
                            }}
                            onClick={() => labelParams.codeType === 'qr' && handleOpenQRGenerator(label)}
                          >
                            {/* Logo im Hintergrund, wenn aktiviert */}
                            {labelSettings.logo && labelSettings.logoSettings.showBehindCode && (
                              <Box
                                component="img"
                                src={labelSettings.logo}
                                alt="Logo"
                                sx={{
                                  position: 'absolute',
                                  maxWidth: `${labelSettings.logoSettings.scale * 70}%`,
                                  maxHeight: `${labelSettings.logoSettings.scale * 70}%`,
                                  opacity: labelSettings.logoSettings.opacity,
                                  transform: `rotate(${labelSettings.logoSettings.rotation}deg)`,
                                  zIndex: 1
                                }}
                              />
                            )}

                            {/* QR-Code Aktionsmenü */}
                            {labelParams.codeType === 'qr' && (
                              <Box
                                className="qrcode-actions"
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  display: 'flex',
                                  gap: 0.5,
                                  zIndex: 10
                                }}
                              >
                                <Tooltip title="QR-Code Generator öffnen">
                                  <IconButton
                                    size="small"
                                    sx={{
                                      fontSize: '0.7rem',
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '&:hover': { bgcolor: 'primary.dark' }
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenQRGenerator(label);
                                    }}
                                  >
                                    <QrCodeIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}

                            {/* Firmenname */}
                            {labelSettings.includeCompanyName && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: `${labelSettings.fontSize}pt`,
                                  fontWeight: 'bold',
                                  mb: 0.5,
                                  zIndex: 2
                                }}
                              >
                                {labelSettings.companyName}
                              </Typography>
                            )}

                            {/* Code (QR oder Barcode) */}
                            <Box sx={{ zIndex: 2 }}>
                              {labelParams.codeType === 'qr' ? (
                                <QRCodeSVG
                                  value={label}
                                  size={Math.min(labelSettings.width * 1.5, labelSettings.height * 1.5)}
                                  level="M"
                                />
                              ) : (
                                <BarcodeComponent
                                  value={label}
                                  width={1.5}
                                  height={Math.min(30, labelSettings.height * 0.6)}
                                  displayValue={false}
                                />
                              )}
                            </Box>

                            {/* Asset Tag Text */}
                            {labelSettings.includeAssetTag && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: `${labelSettings.fontSize}pt`,
                                  fontFamily: 'monospace',
                                  mt: 0.5,
                                  zIndex: 2
                                }}
                              >
                                {label}
                              </Typography>
                            )}

                            {/* Datum */}
                            {labelSettings.includeDate && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: `${labelSettings.fontSize - 2}pt`,
                                  color: 'text.secondary',
                                  mt: 0.5,
                                  zIndex: 2
                                }}
                              >
                                {new Date().toLocaleDateString()}
                              </Typography>
                            )}

                            {/* Zusätzlicher Text */}
                            {labelSettings.includeAdditionalText && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: `${labelSettings.fontSize - 1}pt`,
                                  fontStyle: 'italic',
                                  mt: 0.5,
                                  zIndex: 2
                                }}
                              >
                                {labelSettings.additionalText}
                              </Typography>
                            )}

                            {/* Logo im Vordergrund, wenn nicht hinter Code */}
                            {labelSettings.logo && !labelSettings.logoSettings.showBehindCode && (
                              <Box
                                component="img"
                                src={labelSettings.logo}
                                alt="Logo"
                                sx={{
                                  mt: 1,
                                  maxWidth: `${labelSettings.logoSettings.scale * 70}%`,
                                  maxHeight: `${labelSettings.logoSettings.scale * 70}%`,
                                  opacity: labelSettings.logoSettings.opacity,
                                  transform: `rotate(${labelSettings.logoSettings.rotation}deg)`,
                                  zIndex: 2
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Paper>
          )}
        </Grid>

        {/* Settings Bereich wenn erweitert angezeigt */}
        {showSettings && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Erweiterte Einstellungen
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Inhaltseinstellungen
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={labelSettings.includeCompanyName}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            includeCompanyName: e.target.checked
                          })}
                        />
                      }
                      label="Firmenname anzeigen"
                    />

                    {labelSettings.includeCompanyName && (
                      <TextField
                        fullWidth
                        size="small"
                        label="Firmenname"
                        value={labelSettings.companyName}
                        onChange={(e) => setLabelSettings({
                          ...labelSettings,
                          companyName: e.target.value
                        })}
                        sx={{ ml: 3, mt: 1, width: 'calc(100% - 32px)' }}
                      />
                    )}

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={labelSettings.includeAssetTag}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            includeAssetTag: e.target.checked
                          })}
                        />
                      }
                      label="Asset Tag anzeigen"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={labelSettings.includeDate}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            includeDate: e.target.checked
                          })}
                        />
                      }
                      label="Datum anzeigen"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={labelSettings.includeAdditionalText}
                          onChange={(e) => setLabelSettings({
                            ...labelSettings,
                            includeAdditionalText: e.target.checked
                          })}
                        />
                      }
                      label="Zusätzlichen Text anzeigen"
                    />

                    {labelSettings.includeAdditionalText && (
                      <TextField
                        fullWidth
                        size="small"
                        label="Zusätzlicher Text"
                        value={labelSettings.additionalText}
                        onChange={(e) => setLabelSettings({
                          ...labelSettings,
                          additionalText: e.target.value
                        })}
                        sx={{ ml: 3, mt: 1, width: 'calc(100% - 32px)' }}
                      />
                    )}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handlePreview}
                  >
                    Vorschau aktualisieren
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* QR Code Generator Dialog */}
      <QRCodeGenerator
        open={showQRGenerator}
        onClose={handleCloseQRGenerator}
        initialValue={currentQRValue}
        title="QR-Code Generator"
      />

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

export default LabelPrinting;
