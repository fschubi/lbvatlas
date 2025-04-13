import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Stack,
  FormControlLabel,
  Switch,
  SelectChangeEvent
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Colorize as ColorizeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';

interface QRCodeGeneratorProps {
  initialValue?: string;
  onClose?: () => void;
  open?: boolean;
  title?: string;
  showControls?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  initialValue = '',
  onClose,
  open = false,
  title = 'QR-Code Generator',
  showControls = true,
  maxWidth = 'sm'
}) => {
  // QR Code Einstellungen
  const [value, setValue] = useState<string>(initialValue);
  const [size, setSize] = useState<number>(256);
  const [fgColor, setFgColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [includeMargin, setIncludeMargin] = useState<boolean>(true);
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [showCustomLogo, setShowCustomLogo] = useState<boolean>(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Referenz für den Druckbereich
  const printRef = useRef<HTMLDivElement>(null);

  // QR-Code Fehlerkorrekturstufen
  const errorCorrectionLevels = [
    { value: 'L', label: 'Niedrig (7%)' },
    { value: 'M', label: 'Standard (15%)' },
    { value: 'Q', label: 'Mittel (25%)' },
    { value: 'H', label: 'Hoch (30%)' }
  ];

  // Handle QR-Code Größe
  const handleSizeChange = (_event: Event, newValue: number | number[]) => {
    setSize(newValue as number);
  };

  // Handle Fehlerkorrekturlevel
  const handleLevelChange = (event: SelectChangeEvent<string>) => {
    setLevel(event.target.value as 'L' | 'M' | 'Q' | 'H');
  };

  // QR-Code als SVG herunterladen
  const downloadQRCode = () => {
    const svg = document.getElementById('qrcode-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `qrcode-${value.substring(0, 20).replace(/\s+/g, '-')}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  };

  // QR-Code als PNG herunterladen
  const downloadQRAsPNG = () => {
    const svg = document.getElementById('qrcode-svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    // Konvertiere SVG zu einer Daten-URL
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgURL = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      context.drawImage(img, 0, 0, size, size);

      const pngURL = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngURL;
      downloadLink.download = `qrcode-${value.substring(0, 20).replace(/\s+/g, '-')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgURL);
    };

    img.src = svgURL;
  };

  // QR-Code in die Zwischenablage kopieren
  const copyQRCodeToClipboard = async () => {
    const svg = document.getElementById('qrcode-svg');
    if (!svg) return;

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgURL = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = size;
          canvas.height = size;
          context.drawImage(img, 0, 0, size, size);
          resolve();
        };
        img.src = svgURL;
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const clipboardItem = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([clipboardItem]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });

      URL.revokeObjectURL(svgURL);
    } catch (error) {
      console.error('Fehler beim Kopieren des QR-Codes:', error);
    }
  };

  // QR-Code drucken
  const handlePrint = useReactToPrint({
    documentTitle: `QR-Code-${value.substring(0, 20).replace(/\s+/g, '-')}`,
    onBeforePrint: () => {
      setIsPrinting(true);
      console.log('Druckvorbereitung...');
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      console.log('Druck abgeschlossen!');
    },
    content: () => printRef.current,
    pageStyle: `
      @media print {
        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }
        @page {
          size: auto;
          margin: 10mm;
        }
        .MuiPaper-root {
          box-shadow: none !important;
        }
      }
    `
  } as any);

  // QR-Code teilen (wenn Web Share API verfügbar)
  const shareQRCode = async () => {
    const canShare = 'share' in navigator;
    if (!canShare) return;

    try {
      const svg = document.getElementById('qrcode-svg');
      if (!svg) return;

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgURL = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          canvas.width = size;
          canvas.height = size;
          context.drawImage(img, 0, 0, size, size);
          resolve();
        };
        img.src = svgURL;
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `qrcode-${value.substring(0, 20).replace(/\s+/g, '-')}.png`, { type: 'image/png' });

          await navigator.share({
            title: 'QR-Code',
            text: `QR-Code für: ${value}`,
            files: [file]
          });
        }
      });

      URL.revokeObjectURL(svgURL);
    } catch (error) {
      console.error('Fehler beim Teilen des QR-Codes:', error);
    }
  };

  // Logo-Bild hochladen
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setLogoImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  // Dialogfenster schließen
  const handleDialogClose = () => {
    if (onClose) onClose();
  };

  // Prüfen, ob der Browser das Teilen unterstützt
  const hasShareAPI = 'share' in navigator;

  // Render der QR-Code-Komponente
  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth={maxWidth}
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QrCodeIcon sx={{ mr: 1 }} />
          <Typography variant="h6">{title}</Typography>
        </Box>
        {onClose && (
          <IconButton onClick={handleDialogClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* QR-Code Anzeige */}
          <Box
            ref={printRef}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
              minWidth: { xs: '100%', md: '300px' }
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                bgcolor: bgColor,
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <QRCodeSVG
                  id="qrcode-svg"
                  value={value || 'https://atlas.example.com'}
                  size={size}
                  bgColor={bgColor}
                  fgColor={fgColor}
                  level={level}
                  includeMargin={includeMargin}
                  imageSettings={
                    showCustomLogo && logoImage
                      ? {
                          src: logoImage,
                          x: undefined,
                          y: undefined,
                          height: size * 0.2,
                          width: size * 0.2,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </Box>
              <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary', textAlign: 'center', wordBreak: 'break-all' }}>
                {value || 'https://atlas.example.com'}
              </Typography>
            </Paper>
          </Box>

          {/* Einstellungen und Optionen */}
          {showControls && (
            <Box sx={{ width: '100%' }}>
              <Stack spacing={2}>
                <TextField
                  label="QR-Code Inhalt"
                  variant="outlined"
                  fullWidth
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="URL, Text oder Kontaktdaten eingeben"
                  multiline
                  rows={2}
                />

                <FormControl fullWidth>
                  <InputLabel id="error-correction-level-label">Fehlerkorrekturlevel</InputLabel>
                  <Select
                    labelId="error-correction-level-label"
                    value={level}
                    label="Fehlerkorrekturlevel"
                    onChange={handleLevelChange}
                  >
                    {errorCorrectionLevels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography id="size-slider-label" gutterBottom>
                    Größe: {size}px
                  </Typography>
                  <Slider
                    value={size}
                    onChange={handleSizeChange}
                    min={128}
                    max={512}
                    step={8}
                    aria-labelledby="size-slider-label"
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel htmlFor="fg-color">Vordergrundfarbe</InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: 3 }}>
                      <TextField
                        id="fg-color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        style={{ marginLeft: 8, width: 40, height: 40, padding: 0, border: 'none' }}
                      />
                    </Box>
                  </FormControl>

                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel htmlFor="bg-color">Hintergrundfarbe</InputLabel>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', mt: 3 }}>
                      <TextField
                        id="bg-color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        style={{ marginLeft: 8, width: 40, height: 40, padding: 0, border: 'none' }}
                      />
                    </Box>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeMargin}
                        onChange={(e) => setIncludeMargin(e.target.checked)}
                      />
                    }
                    label="Rand hinzufügen"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showCustomLogo}
                        onChange={(e) => setShowCustomLogo(e.target.checked)}
                      />
                    }
                    label="Logo hinzufügen"
                  />
                </Box>

                {showCustomLogo && (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ColorizeIcon />}
                  >
                    Logo hochladen
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1, p: 2 }}>
        <Tooltip title="Als SVG herunterladen">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadQRCode}
          >
            SVG
          </Button>
        </Tooltip>

        <Tooltip title="Als PNG herunterladen">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadQRAsPNG}
          >
            PNG
          </Button>
        </Tooltip>

        <Tooltip title="In die Zwischenablage kopieren">
          <Button
            variant="contained"
            startIcon={copied ? <QrCodeIcon /> : <CopyIcon />}
            onClick={copyQRCodeToClipboard}
            color={copied ? "success" : "primary"}
          >
            {copied ? "Kopiert!" : "Kopieren"}
          </Button>
        </Tooltip>

        <Tooltip title="Drucken">
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => handlePrint()}
          >
            Drucken
          </Button>
        </Tooltip>

        {hasShareAPI && (
          <Tooltip title="Teilen">
            <Button
              variant="contained"
              startIcon={<ShareIcon />}
              onClick={shareQRCode}
            >
              Teilen
            </Button>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeGenerator;
