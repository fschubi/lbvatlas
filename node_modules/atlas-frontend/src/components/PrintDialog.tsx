import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Paper,
  Grid,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { useReactToPrint } from 'react-to-print';
import { LabelTemplate } from './LabelTemplates';
import * as QRCodeReact from 'qrcode.react';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  items: Array<{id: string, name: string, serialNumber?: string}>;
  templates: LabelTemplate[];
}

const PrintDialog: React.FC<PrintDialogProps> = ({ open, onClose, items, templates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleTemplateChange = (event: SelectChangeEvent) => {
    setSelectedTemplate(event.target.value);
  };

  const prepareForPrinting = () => {
    setIsPrinting(true);
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 500);
    });
  };

  const handlePrintComplete = () => {
    setIsPrinting(false);
    onClose();
  };

  const handlePrint = useReactToPrint({
    documentTitle: 'ATLAS Etikettendruck',
    onBeforePrint: prepareForPrinting,
    onAfterPrint: handlePrintComplete,
    content: () => printRef.current,
  });

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  const renderLabel = (item: {id: string, name: string, serialNumber?: string}) => {
    return (
      <Box key={item.id} sx={{ p: 1, border: '1px dashed grey', m: 0.5, textAlign: 'center', height: '100%' }}>
        <Typography variant="subtitle2" noWrap>{item.name}</Typography>
        {item.serialNumber && (
          <Typography variant="caption" display="block">{item.serialNumber}</Typography>
        )}
        <QRCodeReact.QRCodeSVG value={item.id} size={60} />
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Etiketten drucken</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel id="template-select-label">Etikettenvorlage</InputLabel>
          <Select
            labelId="template-select-label"
            value={selectedTemplate}
            label="Etikettenvorlage"
            onChange={handleTemplateChange}
          >
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name} ({template.description})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedTemplate && currentTemplate && (
          <>
            <Typography variant="h6" gutterBottom>Vorschau</Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Vorlage: {currentTemplate.name} ({currentTemplate.width}mm × {currentTemplate.height}mm)
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Etiketten pro Zeile: {currentTemplate.labelsPerRow}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Typ: {currentTemplate.type === 'roll' ? 'Rollenetiketten' : currentTemplate.type === 'sheet' ? 'Bogenetiketten' : 'Benutzerdefiniert'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Abstand zwischen Etiketten: {currentTemplate.labelGap}mm
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Rand: {currentTemplate.marginTop}mm, {currentTemplate.marginRight}mm, {currentTemplate.marginBottom}mm, {currentTemplate.marginLeft}mm
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box ref={printRef} sx={{
              display: 'flex',
              flexWrap: 'wrap',
              border: '1px solid #ccc',
              p: 1,
              maxHeight: '300px',
              overflowY: 'auto',
              width: '100%'
            }}>
              {Array.isArray(items) && items.map((item) => {
                const labelWidth = `calc(${100 / currentTemplate.labelsPerRow}% - ${currentTemplate.labelGap}mm)`;
                return (
                  <Box
                    key={item.id}
                    sx={{
                      width: labelWidth,
                      mb: currentTemplate.labelGap / 8,
                      minHeight: '100px'
                    }}
                  >
                    {renderLabel(item)}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          color="primary"
          disabled={!selectedTemplate || isPrinting}
        >
          {isPrinting ? <CircularProgress size={24} /> : 'Drucken'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintDialog;
