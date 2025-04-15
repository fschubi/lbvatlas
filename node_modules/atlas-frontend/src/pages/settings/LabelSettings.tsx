import React from 'react';
import { Box, Typography, Paper, Alert, Button, Grid, Card, CardMedia, CardContent, CardActionArea } from '@mui/material';
import { LocalPrintshop as PrintIcon, QrCode as QrCodeIcon, Print as PrintActionIcon } from '@mui/icons-material';

const LabelSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center' }}>
        <PrintIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4">Etikettendruck</Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Hier können Sie QR-Codes und Geräteetiketten erstellen und drucken.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Etikettenvorlagen
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardActionArea disabled>
                <CardMedia
                  component="div"
                  sx={{
                    height: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'action.hover'
                  }}
                >
                  <QrCodeIcon sx={{ fontSize: 64 }} />
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Standard QR-Etikett
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    QR-Code mit Asset-Tag für Standardgeräte (38x25mm)
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardActionArea disabled>
                <CardMedia
                  component="div"
                  sx={{
                    height: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'action.hover'
                  }}
                >
                  <QrCodeIcon sx={{ fontSize: 64 }} />
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Mini QR-Etikett
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Kleiner QR-Code für kleine Geräte (25x15mm)
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardActionArea disabled>
                <CardMedia
                  component="div"
                  sx={{
                    height: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'action.hover'
                  }}
                >
                  <QrCodeIcon sx={{ fontSize: 64 }} />
                </CardMedia>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Detailliertes Etikett
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    QR-Code mit Gerätedaten für Inventuraufkleber (62x40mm)
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
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
                startIcon={<PrintActionIcon />}
                disabled
              >
                Etiketten drucken
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LabelSettings;
