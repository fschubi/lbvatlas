import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper,
  Grid,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { LabelTemplate } from './LabelTemplates';

interface SavedLabelTemplateProps {
  currentSettings: LabelTemplate;
  onLoadTemplate: (template: LabelTemplate) => void;
}

// Interface für die benutzerdefinierten Vorlagen mit Speicherdatum
interface CustomLabelTemplate extends LabelTemplate {
  savedAt: string;  // ISO date string
  userId?: number;  // Optional, falls Benutzer-ID gespeichert wird
}

const SavedLabelTemplate: React.FC<SavedLabelTemplateProps> = ({ currentSettings, onLoadTemplate }) => {
  const [savedTemplates, setSavedTemplates] = useState<CustomLabelTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<CustomLabelTemplate | null>(null);

  // Lade gespeicherte Vorlagen beim Laden der Komponente
  useEffect(() => {
    loadTemplatesFromStorage();
  }, []);

  // Lade Vorlagen aus dem localStorage
  const loadTemplatesFromStorage = () => {
    try {
      const savedData = localStorage.getItem('atlasLabelTemplates');
      if (savedData) {
        const templates = JSON.parse(savedData) as CustomLabelTemplate[];
        setSavedTemplates(templates);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Vorlagen:', err);
    }
  };

  // Speichere Vorlagen im localStorage
  const saveTemplatesToStorage = (templates: CustomLabelTemplate[]) => {
    try {
      localStorage.setItem('atlasLabelTemplates', JSON.stringify(templates));
    } catch (err) {
      console.error('Fehler beim Speichern der Vorlagen:', err);
      setError('Die Vorlagen konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    }
  };

  // Aktuelle Einstellungen als Vorlage speichern
  const saveCurrentTemplate = () => {
    if (!templateName.trim()) {
      setError('Bitte geben Sie einen Namen für die Vorlage ein.');
      return;
    }

    // Erstelle ein neues Template-Objekt
    const newTemplate: CustomLabelTemplate = {
      ...currentSettings,
      id: editingTemplate ? editingTemplate.id : `custom-${Date.now()}`,
      name: templateName,
      description: templateDescription || 'Benutzerdefinierte Vorlage',
      savedAt: new Date().toISOString(),
      type: 'custom'
    };

    // Entweder Update oder Neues Template
    if (editingTemplate) {
      // Update eines bestehenden Templates
      const updatedTemplates = savedTemplates.map(t =>
        t.id === editingTemplate.id ? newTemplate : t
      );
      setSavedTemplates(updatedTemplates);
      saveTemplatesToStorage(updatedTemplates);
    } else {
      // Neues Template hinzufügen
      const updatedTemplates = [...savedTemplates, newTemplate];
      setSavedTemplates(updatedTemplates);
      saveTemplatesToStorage(updatedTemplates);
    }

    // Dialog schließen und Formular zurücksetzen
    setShowSaveDialog(false);
    setTemplateName('');
    setTemplateDescription('');
    setEditingTemplate(null);
    setError('');
  };

  // Öffne den Speichern-Dialog
  const openSaveDialog = (template?: CustomLabelTemplate) => {
    if (template) {
      // Editieren eines vorhandenen Templates
      setEditingTemplate(template);
      setTemplateName(template.name);
      setTemplateDescription(template.description);
    } else {
      // Neues Template
      setEditingTemplate(null);
      setTemplateName('');
      setTemplateDescription('');
    }
    setShowSaveDialog(true);
    setError('');
  };

  // Template laden
  const loadTemplate = (template: CustomLabelTemplate) => {
    onLoadTemplate(template);
  };

  // Template löschen
  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    saveTemplatesToStorage(updatedTemplates);
  };

  // Template duplizieren
  const duplicateTemplate = (template: CustomLabelTemplate) => {
    const duplicateTemplate: CustomLabelTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (Kopie)`,
      savedAt: new Date().toISOString()
    };

    const updatedTemplates = [...savedTemplates, duplicateTemplate];
    setSavedTemplates(updatedTemplates);
    saveTemplatesToStorage(updatedTemplates);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Gespeicherte Vorlagen</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => openSaveDialog()}
        >
          Aktuelle Vorlage speichern
        </Button>
      </Box>

      {savedTemplates.length === 0 ? (
        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary">
            Keine benutzerdefinierten Vorlagen gespeichert.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {savedTemplates.map((template, index) => (
              <React.Fragment key={template.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemText
                    primary={template.name}
                    secondary={
                      <>
                        <Typography variant="body2" component="span" color="text.secondary">
                          {template.width}mm × {template.height}mm
                        </Typography>
                        {" - "}
                        <Typography variant="body2" component="span" color="text.secondary">
                          {new Date(template.savedAt).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Vorlage laden">
                      <IconButton edge="end" onClick={() => loadTemplate(template)} size="small">
                        <FileCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Vorlage bearbeiten">
                      <IconButton edge="end" onClick={() => openSaveDialog(template)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Vorlage duplizieren">
                      <IconButton edge="end" onClick={() => duplicateTemplate(template)} size="small">
                        <FileCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Vorlage löschen">
                      <IconButton edge="end" onClick={() => deleteTemplate(template.id)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Dialog zum Speichern einer Vorlage */}
      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Vorlage bearbeiten' : 'Vorlage speichern'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vorlagenname"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Aktuelle Einstellungen:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Größe: {currentSettings.width}mm × {currentSettings.height}mm
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Ränder: O {currentSettings.marginTop}mm, R {currentSettings.marginRight}mm,
                      U {currentSettings.marginBottom}mm, L {currentSettings.marginLeft}mm
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Etiketten pro Zeile: {currentSettings.labelsPerRow},
                      Abstand: {currentSettings.labelGap}mm
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Abbrechen</Button>
          <Button
            onClick={saveCurrentTemplate}
            startIcon={<SaveIcon />}
            variant="contained"
            color="primary"
          >
            {editingTemplate ? 'Aktualisieren' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedLabelTemplate;
