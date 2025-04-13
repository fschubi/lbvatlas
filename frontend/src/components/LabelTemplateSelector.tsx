import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Restore as RestoreIcon,
  ImportExport as ImportExportIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { settingsApi } from '../utils/api';

// Interface für die Eigenschaften der Komponente
interface LabelTemplateSelectorProps {
  onTemplateSelect: (template: any) => void;
  currentSettings: any;
}

// Interface für Template-Daten
interface LabelTemplate {
  id: number;
  name: string;
  description?: string;
  settings: any;
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// Interface für Template-Versionen
interface TemplateVersion {
  id: number;
  template_id: number;
  version: number;
  settings: any;
  created_at: string;
  updated_by?: number;
  change_description?: string;
}

// Hauptkomponente
const LabelTemplateSelector: React.FC<LabelTemplateSelectorProps> = ({
  onTemplateSelect,
  currentSettings
}) => {
  // State für Templates und UI
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dialoge
  const [newTemplateDialog, setNewTemplateDialog] = useState<boolean>(false);
  const [editTemplateDialog, setEditTemplateDialog] = useState<boolean>(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<boolean>(false);
  const [historyDialog, setHistoryDialog] = useState<boolean>(false);
  const [importExportDialog, setImportExportDialog] = useState<boolean>(false);

  // Formulardaten
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    description: string;
  }>({
    name: '',
    description: ''
  });

  // Versionsverlauf
  const [templateVersions, setTemplateVersions] = useState<TemplateVersion[]>([]);

  // Import/Export
  const [importFile, setImportFile] = useState<File | null>(null);

  // Lade Templates beim Initialisieren
  useEffect(() => {
    loadTemplates();
  }, []);

  // Alle Templates vom Server laden
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.getLabelTemplates();

      if (response && response.success && response.data) {
        setTemplates(response.data);

        // Setze das Standard-Template, falls vorhanden
        const defaultTemplate = response.data.find((t: LabelTemplate) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (response.data.length > 0) {
          setSelectedTemplateId(response.data[0].id);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden der Vorlagen');
      console.error('Fehler beim Laden der Vorlagen:', error);
    } finally {
      setLoading(false);
    }
  };

  // Template nach Auswahl laden
  const handleTemplateChange = async (event: SelectChangeEvent<number | ''>) => {
    const value = event.target.value;
    setSelectedTemplateId(value as number | '');

    if (value !== '') {
      try {
        setLoading(true);
        const response = await settingsApi.getLabelTemplateById(value as number);

        if (response && response.success && response.data) {
          onTemplateSelect(response.data.settings);
        }
      } catch (error: any) {
        setError(error.message || 'Fehler beim Laden der Vorlage');
        console.error('Fehler beim Laden der Vorlage:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Aktuelles Label als neue Vorlage speichern
  const handleSaveAsTemplate = () => {
    setTemplateForm({
      name: '',
      description: ''
    });
    setNewTemplateDialog(true);
  };

  // Neue Vorlage erstellen
  const handleCreateTemplate = async () => {
    if (!templateForm.name) {
      setError('Bitte geben Sie einen Namen für die Vorlage ein');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const templateData = {
        name: templateForm.name,
        description: templateForm.description,
        settings: currentSettings,
        isDefault: false
      };

      const response = await settingsApi.createLabelTemplate(templateData);

      if (response && response.success) {
        await loadTemplates();
        setNewTemplateDialog(false);
        setSelectedTemplateId(response.data.id);
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Erstellen der Vorlage');
      console.error('Fehler beim Erstellen der Vorlage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vorlage aktualisieren
  const handleUpdateTemplate = async () => {
    if (selectedTemplateId === '') return;

    try {
      setLoading(true);
      setError(null);

      const templateData = {
        settings: currentSettings
      };

      await settingsApi.updateLabelTemplate(selectedTemplateId, templateData);

      await loadTemplates();
      setEditTemplateDialog(false);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Aktualisieren der Vorlage');
      console.error('Fehler beim Aktualisieren der Vorlage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vorlage löschen
  const handleDeleteTemplate = async () => {
    if (selectedTemplateId === '') return;

    try {
      setLoading(true);
      setError(null);

      await settingsApi.deleteLabelTemplate(selectedTemplateId);

      await loadTemplates();
      setDeleteConfirmDialog(false);
      setSelectedTemplateId('');
    } catch (error: any) {
      setError(error.message || 'Fehler beim Löschen der Vorlage');
      console.error('Fehler beim Löschen der Vorlage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Versionsverlauf anzeigen
  const handleShowHistory = async () => {
    if (selectedTemplateId === '') return;

    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.getLabelTemplateVersions(selectedTemplateId);

      if (response && response.success) {
        setTemplateVersions(response.data);
        setHistoryDialog(true);
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Laden des Versionsverlaufs');
      console.error('Fehler beim Laden des Versionsverlaufs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Zur Version zurückkehren
  const handleRevertToVersion = async (versionId: number) => {
    if (selectedTemplateId === '') return;

    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.revertToLabelTemplateVersion(selectedTemplateId, versionId);

      if (response && response.success) {
        onTemplateSelect(response.data.settings);
        setHistoryDialog(false);
        await loadTemplates();
      }
    } catch (error: any) {
      setError(error.message || 'Fehler beim Zurückkehren zur Version');
      console.error('Fehler beim Zurückkehren zur Version:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vorlage exportieren
  const handleExportTemplate = async () => {
    if (selectedTemplateId === '') return;

    try {
      setLoading(true);
      setError(null);

      await settingsApi.exportLabelTemplate(selectedTemplateId);

      setImportExportDialog(false);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Exportieren der Vorlage');
      console.error('Fehler beim Exportieren der Vorlage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Vorlage importieren
  const handleImportTemplate = async () => {
    if (!importFile) {
      setError('Bitte wählen Sie eine Datei aus');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const templateData = JSON.parse(e.target?.result as string);
          const response = await settingsApi.importLabelTemplate(templateData);

          if (response && response.success) {
            await loadTemplates();
            setImportExportDialog(false);
            setSelectedTemplateId(response.data.id);
          }
        } catch (error: any) {
          setError('Fehler beim Parsen der Datei: ' + error.message);
          console.error('Fehler beim Parsen der Datei:', error);
        } finally {
          setLoading(false);
        }
      };
      fileReader.onerror = () => {
        setError('Fehler beim Lesen der Datei');
        setLoading(false);
      };
      fileReader.readAsText(importFile);
    } catch (error: any) {
      setError(error.message || 'Fehler beim Importieren der Vorlage');
      console.error('Fehler beim Importieren der Vorlage:', error);
      setLoading(false);
    }
  };

  // Einstellungen migrieren
  const handleMigrateSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.migrateLabelSettings();

      if (response && response.success) {
        await loadTemplates();
        setSelectedTemplateId(response.data.id);
      }
    } catch (error: any) {
      setError(error.message || 'Fehler bei der Migration der Einstellungen');
      console.error('Fehler bei der Migration der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Etiketten-Vorlagen
      </Typography>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Vorlage auswählen</InputLabel>
          <Select
            value={selectedTemplateId}
            label="Vorlage auswählen"
            onChange={handleTemplateChange}
            disabled={loading}
          >
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}{template.is_default ? ' (Standard)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Tooltip title="Versionsverlauf anzeigen">
          <span>
            <IconButton
              onClick={handleShowHistory}
              disabled={loading || selectedTemplateId === ''}
              size="small"
            >
              <HistoryIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Aktuelle Einstellungen in Vorlage speichern">
          <span>
            <IconButton
              onClick={handleUpdateTemplate}
              disabled={loading || selectedTemplateId === ''}
              size="small"
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Vorlage löschen">
          <span>
            <IconButton
              onClick={() => setDeleteConfirmDialog(true)}
              disabled={loading || selectedTemplateId === ''}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Import/Export">
          <IconButton
            onClick={() => setImportExportDialog(true)}
            disabled={loading}
            size="small"
          >
            <ImportExportIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleSaveAsTemplate}
          disabled={loading}
        >
          Als neue Vorlage speichern
        </Button>

        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={handleMigrateSettings}
          disabled={loading}
        >
          Einstellungen migrieren
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Dialog: Neue Vorlage erstellen */}
      <Dialog open={newTemplateDialog} onClose={() => setNewTemplateDialog(false)}>
        <DialogTitle>Neue Vorlage erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={templateForm.description}
            onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTemplateDialog(false)}>Abbrechen</Button>
          <Button
            onClick={handleCreateTemplate}
            variant="contained"
            disabled={loading || !templateForm.name}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Versionsverlauf */}
      <Dialog
        open={historyDialog}
        onClose={() => setHistoryDialog(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Versionsverlauf</DialogTitle>
        <DialogContent>
          {templateVersions.length === 0 ? (
            <Typography>Keine Versionen gefunden.</Typography>
          ) : (
            <List>
              {templateVersions.map((version, index) => (
                <React.Fragment key={version.id}>
                  <ListItem>
                    <ListItemIcon>
                      <RestoreIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Version ${version.version}`}
                      secondary={`Erstellt am: ${new Date(version.created_at).toLocaleString()}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        onClick={() => handleRevertToVersion(version.id)}
                        disabled={loading}
                      >
                        Wiederherstellen
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < templateVersions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Import/Export */}
      <Dialog
        open={importExportDialog}
        onClose={() => setImportExportDialog(false)}
        fullWidth
      >
        <DialogTitle>Vorlagen importieren/exportieren</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Vorlage exportieren
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportTemplate}
              disabled={loading || selectedTemplateId === ''}
            >
              Aktuelle Vorlage exportieren
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Vorlage importieren
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="file"
              inputProps={{ accept: '.json' }}
              onChange={(e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                  setImportFile(files[0]);
                }
              }}
            />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleImportTemplate}
              disabled={loading || !importFile}
            >
              Vorlage importieren
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportExportDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Vorlage löschen */}
      <Dialog open={deleteConfirmDialog} onClose={() => setDeleteConfirmDialog(false)}>
        <DialogTitle>Vorlage löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie diese Vorlage löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)}>Abbrechen</Button>
          <Button
            onClick={handleDeleteTemplate}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LabelTemplateSelector;
