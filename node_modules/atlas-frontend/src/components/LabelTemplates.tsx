import React from 'react';
import { Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  labelsPerRow: number;
  labelGap: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  type: 'roll' | 'sheet' | 'custom';
  description: string;
  printerModel?: string;
}

interface LabelTemplatesProps {
  selectedTemplate: string;
  onChange: (template: LabelTemplate) => void;
}

// Vordefinierte Etikettenvorlagen
export const labelTemplates: LabelTemplate[] = [
  {
    id: 'custom',
    name: 'Benutzerdefiniert',
    width: 50,
    height: 30,
    labelsPerRow: 1,
    labelGap: 5,
    marginTop: 2,
    marginRight: 2,
    marginBottom: 2,
    marginLeft: 2,
    type: 'sheet',
    description: 'Benutzerdefinierte Größe'
  },
  {
    id: 'citizen-small',
    name: 'Citizen CLP-521 (50x25mm)',
    width: 50,
    height: 25,
    labelsPerRow: 1,
    labelGap: 2,
    marginTop: 1,
    marginRight: 2,
    marginBottom: 1,
    marginLeft: 2,
    type: 'roll',
    description: 'Kleine Rollenetiketten für Citizen CLP-521',
    printerModel: 'Citizen CLP-521'
  },
  {
    id: 'citizen-medium',
    name: 'Citizen CLP-621 (70x30mm)',
    width: 70,
    height: 30,
    labelsPerRow: 1,
    labelGap: 3,
    marginTop: 2,
    marginRight: 3,
    marginBottom: 2,
    marginLeft: 3,
    type: 'roll',
    description: 'Mittlere Rollenetiketten für Citizen CLP-621',
    printerModel: 'Citizen CLP-621'
  },
  {
    id: 'citizen-large',
    name: 'Citizen CLP-631 (100x50mm)',
    width: 100,
    height: 50,
    labelsPerRow: 1,
    labelGap: 3,
    marginTop: 3,
    marginRight: 5,
    marginBottom: 3,
    marginLeft: 5,
    type: 'roll',
    description: 'Große Rollenetiketten für Citizen CLP-631',
    printerModel: 'Citizen CLP-631'
  },
  {
    id: 'zebra-small',
    name: 'Zebra GK420t (60x30mm)',
    width: 60,
    height: 30,
    labelsPerRow: 1,
    labelGap: 3,
    marginTop: 2,
    marginRight: 2,
    marginBottom: 2,
    marginLeft: 2,
    type: 'roll',
    description: 'Kleine Rollenetiketten für Zebra GK420t',
    printerModel: 'Zebra GK420t'
  },
  {
    id: 'a4-sheet-small',
    name: 'A4 Bogen (70x37mm, 3x8)',
    width: 70,
    height: 37,
    labelsPerRow: 3,
    labelGap: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    type: 'sheet',
    description: 'A4-Bogen mit 24 Etiketten (3 Spalten, 8 Zeilen)'
  },
  {
    id: 'a4-sheet-medium',
    name: 'A4 Bogen (105x57mm, 2x5)',
    width: 105,
    height: 57,
    labelsPerRow: 2,
    labelGap: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    type: 'sheet',
    description: 'A4-Bogen mit 10 Etiketten (2 Spalten, 5 Zeilen)'
  }
];

const LabelTemplates: React.FC<LabelTemplatesProps> = ({ selectedTemplate, onChange }) => {
  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    const selectedId = event.target.value;
    const template = labelTemplates.find(t => t.id === selectedId);
    if (template) {
      onChange(template);
    }
  };

  // Aktuell ausgewählte Vorlage
  const currentTemplate = labelTemplates.find(t => t.id === selectedTemplate) || labelTemplates[0];

  return (
    <Box>
      <FormControl fullWidth variant="outlined" size="small">
        <InputLabel>Etikettenvorlage</InputLabel>
        <Select
          label="Etikettenvorlage"
          value={selectedTemplate}
          onChange={handleTemplateChange}
        >
          {labelTemplates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Paper sx={{ mt: 2, p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" gutterBottom>
          Vorlagendetails: {currentTemplate.name}
        </Typography>

        <Grid container spacing={1} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Größe: {currentTemplate.width}mm × {currentTemplate.height}mm
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Typ: {currentTemplate.type === 'roll' ? 'Rollenetiketten' : currentTemplate.type === 'sheet' ? 'Bogenetiketten' : 'Benutzerdefiniert'}
            </Typography>
          </Grid>
          {currentTemplate.printerModel && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Empfohlener Drucker: {currentTemplate.printerModel}
              </Typography>
            </Grid>
          )}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              {currentTemplate.description}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default LabelTemplates;
