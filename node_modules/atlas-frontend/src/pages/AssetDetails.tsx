import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Link,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  History as HistoryIcon,
  Description as DocumentIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  AccountCircle as UserIcon,
  Business as LocationIcon,
  MeetingRoom as RoomIcon,
  Category as CategoryIcon,
  Build as ManufacturerIcon,
  Store as SupplierIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon,
  Dns as DnsIcon, // Für Netzwerkdetails
  Power as PowerIcon, // Für Netzwerkdetails
  SettingsEthernet as SettingsEthernetIcon, // Für Netzwerkdetails
  NetworkCheck as NetworkCheckIcon, // Für Netzwerkdetails
  CalendarToday as CalendarTodayIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import AtlasTable, { AtlasColumn } from '../components/AtlasTable';
import {
  locationApi,
  roomApi,
  categoryApi,
  manufacturerApi,
  supplierApi,
  usersApi
} from '../utils/api';
import DocumentUploader, { UploadedFile } from '../components/DocumentUploader';
import ConfirmationDialog from '../components/ConfirmationDialog';

// --- Mock-Daten für die Entwicklung ---
// ... (Mock-Daten bleiben unverändert) ...
// --- Ende Mock-Daten ---

// TabPanel Komponente (bleibt unverändert)
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`asset-tabpanel-${index}`}
      aria-labelledby={`asset-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// --- Mock Typen als Platzhalter, bis die echten Imports funktionieren ---
type Asset = any;
type AssetHistory = any;
type AssetDocument = any;
type AssetNetworkDetails = any;
const getStatusChipColor = (status: string | undefined) => status === 'In Betrieb' ? '#4caf50' : '#f44336'; // Placeholder
const getStatusChipLabel = (status: string | undefined) => status || 'Unbekannt'; // Placeholder
// --- Ende Mock Typen ---

const AssetDetails: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  // const { userPermissions } = usePermissions(); // TODO: Aktivieren, wenn Hook gefunden wurde
  const userPermissions = ['assets.update', 'assets.delete', 'documents.create', 'assets.history', 'documents.read']; // Placeholder Berechtigungen

  const canEdit = userPermissions.includes('assets.update');
  const canDelete = userPermissions.includes('assets.delete');
  const canUpload = userPermissions.includes('documents.create'); // Annahme für Upload-Berechtigung
  const canViewHistory = userPermissions.includes('assets.history'); // Annahme für Verlaufs-Berechtigung
  const canViewDocs = userPermissions.includes('documents.read'); // Annahme für Dokumenten-Berechtigung

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<any>(null); // Wird für Bearbeitungsformular verwendet
  const [history, setHistory] = useState<AssetHistory[]>([]);
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [networkDetails, setNetworkDetails] = useState<AssetNetworkDetails | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false); // State für Bestätigungsdialog
  const [itemToDelete, setItemToDelete] = useState<Asset | null>(null); // State für das zu löschende Asset

  // --- Optionen für Dropdowns (sollten aus API geladen werden) ---
  const [statusOptions, setStatusOptions] = useState<string[]>(['In Betrieb', 'Lager', 'Reparatur', 'Defekt', 'Entsorgt', 'Ausgemustert', 'Verloren']); // Hardcoded Fallback
  const [locationOptions, setLocationOptions] = useState<{ id: number; name: string }[]>([]);
  const [roomOptions, setRoomOptions] = useState<{ id: number; name: string; locationId: number }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string }[]>([]);
  const [manufacturerOptions, setManufacturerOptions] = useState<{ id: number; name: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ id: number; name: string }[]>([]);
  const [userOptions, setUserOptions] = useState<{ id: string; username: string }[]>([]); // Annahme: Benutzer-ID ist string
  // --- Ende Dropdown-Optionen ---

  const loadAssetData = useCallback(async () => {
    if (!assetId) return;
    try {
      setLoading(true);
      // TODO: assetsApi in api.ts implementieren und diesen Call aktivieren
      /*
      const response = await assetsApi.getById(assetId);
      const assetData = response.data;
      setAsset(assetData);
      setFormData({
        ...assetData,
        purchase_date: assetData.purchase_date ? new Date(assetData.purchase_date).toISOString().split('T')[0] : '',
        warranty_expiration_date: assetData.warranty_expiration_date ? new Date(assetData.warranty_expiration_date).toISOString().split('T')[0] : '',
        location_id: assetData.location_id ?? '',
        room_id: assetData.room_id ?? '',
        category_id: assetData.category_id ?? '',
        manufacturer_id: assetData.manufacturer_id ?? '',
        supplier_id: assetData.supplier_id ?? '',
        assigned_to_user_id: assetData.assigned_to_user_id ?? ''
      });
      */
      // Placeholder Daten, bis API funktioniert
      const mockAsset = generateMockAsset(assetId);
      setAsset(mockAsset);
      setFormData({
        ...mockAsset,
        purchase_date: mockAsset.purchase_date ? new Date(mockAsset.purchase_date).toISOString().split('T')[0] : '',
        warranty_expiration_date: mockAsset.warranty_expiration_date ? new Date(mockAsset.warranty_expiration_date).toISOString().split('T')[0] : '',
        location_id: mockAsset.location_id ?? '',
        room_id: mockAsset.room_id ?? '',
        category_id: mockAsset.category_id ?? '',
        manufacturer_id: mockAsset.manufacturer_id ?? '',
        supplier_id: mockAsset.supplier_id ?? '',
        assigned_to_user_id: mockAsset.assigned_to_user_id ?? ''
      });

      // Lade verwandte Daten (optional, je nach API)
      if (canViewHistory) {
         // Mock History
         setHistory(generateMockHistory(15, assetId));
      }
      if (canViewDocs) {
        // Mock Documents
        setDocuments(generateMockDocuments(5, assetId));
      }
      // Mock Network Details
      setNetworkDetails(generateMockNetworkDetails(assetId));

    } catch (error) {
      console.error('Fehler beim Laden der Asset-Daten:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der Asset-Daten',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [assetId, canViewHistory, canViewDocs]);

  const loadDropdownOptions = useCallback(async () => {
    try {
        // Lade alle Optionen parallel mit korrigierten API-Aufrufen
        const [
            locationsRes,
            roomsRes,
            categoriesRes,
            manufacturersRes,
            suppliersRes,
            usersRes
        ] = await Promise.all([
            locationApi.getAll(),
            roomApi.getAll(),
            categoryApi.getAll(),
            manufacturerApi.getAll(),
            supplierApi.getAll(),
            usersApi.getAll()
        ]);

        // Korrigierte Zuweisung: Direkte Verwendung des Arrays
        setLocationOptions(locationsRes || []);
        // Annahme: roomsRes ist Room[] mit `locationId`
        setRoomOptions(roomsRes || []);
        setCategoryOptions(categoriesRes || []);
        setManufacturerOptions(manufacturersRes || []);
        setSupplierOptions(suppliersRes || []);
        setUserOptions(usersRes || []);

    } catch (error) {
        console.error('Fehler beim Laden der Dropdown-Optionen:', error);
        // Fallback bleibt bestehen
         setSnackbar({
             open: true,
             message: 'Fehler beim Laden einiger Dropdown-Optionen.',
             severity: 'error',
         });
    }
}, []);

  useEffect(() => {
    loadAssetData();
    loadDropdownOptions();
  }, [loadAssetData, loadDropdownOptions]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const target = e.target as HTMLInputElement; // Type assertion
    const { name, value, type, checked } = target;

    setFormData((prevData: any) => ({
      ...prevData,
      [name as string]: type === 'checkbox' ? checked : value
    }));
  };

 const handleSelectChange = (name: string, value: string | number | null) => {
     setFormData((prevData: any) => ({
         ...prevData,
         [name]: value === '' ? null : value // Setze auf null, wenn leer ausgewählt
     }));
     // Spezielle Logik für Standort -> Raum Filterung
     if (name === 'location_id') {
         setFormData((prevData: any) => ({
             ...prevData,
             room_id: '' // Raum zurücksetzen, wenn Standort geändert wird
         }));
     }
 };

  const handleEditMode = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      ...asset,
      // Konvertiere ggf. Daten zurück, falls im State anders gespeichert
       purchase_date: asset?.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : '',
       warranty_expiration_date: asset?.warranty_expiration_date ? new Date(asset.warranty_expiration_date).toISOString().split('T')[0] : '',
       location_id: asset?.location_id ?? '',
       room_id: asset?.room_id ?? '',
       category_id: asset?.category_id ?? '',
       manufacturer_id: asset?.manufacturer_id ?? '',
       supplier_id: asset?.supplier_id ?? '',
       assigned_to_user_id: asset?.assigned_to_user_id ?? ''
    });
    setEditMode(false);
  };

  const handleSaveChanges = async () => {
    if (!assetId || !canEdit) return;
    try {
      setLoading(true);
      const dataToSend = { ...formData };
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] === '') {
          dataToSend[key] = null;
        }
        if ((key === 'purchase_date' || key === 'warranty_expiration_date') && dataToSend[key]) {
           dataToSend[key] = new Date(dataToSend[key]).toISOString();
        }
      });

      // TODO: assetsApi in api.ts implementieren und diesen Call aktivieren
      // await assetsApi.update(assetId, dataToSend);
      console.log('Speichern (simuliert): ', dataToSend);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simuliere API-Aufruf

      setEditMode(false);
      setSnackbar({
        open: true,
        message: 'Asset erfolgreich aktualisiert (simuliert)',
        severity: 'success'
      });
      loadAssetData(); // Daten neu laden nach dem Speichern
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren des Assets:', error);
       const errorMsg = error.response?.data?.message || 'Fehler beim Aktualisieren des Assets';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Delete Handling mit ConfirmationDialog ---
  const handleDeleteAsset = () => {
    if (asset && canDelete) {
      setItemToDelete(asset); // Asset zum Löschen vormerken
      setConfirmDialogOpen(true); // Dialog öffnen
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete || !canDelete) return;

    try {
      setLoading(true);
      // TODO: assetsApi in api.ts implementieren und diesen Call aktivieren
      // await assetsApi.delete(itemToDelete.id);
      console.log('Löschen (simuliert): ', itemToDelete.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simuliere API-Aufruf

      setSnackbar({
        open: true,
        message: `Asset "${itemToDelete.name}" erfolgreich gelöscht (simuliert)`,
        severity: 'success'
      });
      navigate('/assets'); // Zurück zur Asset-Liste
    } catch (error: any) {
      console.error('Fehler beim Löschen des Assets:', error);
      const errorMsg = error.response?.data?.message || 'Fehler beim Löschen des Assets';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error'
      });
    } finally {
      setConfirmDialogOpen(false); // Dialog schließen
      setItemToDelete(null); // Vorgemerktes Item zurücksetzen
      setLoading(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false); // Dialog schließen
    setItemToDelete(null); // Vorgemerktes Item zurücksetzen
  };
  // --- Ende Delete Handling ---


  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const handleGoBack = () => {
    navigate('/assets');
  };

  // --- Dokumenten-Handling ---
  const handleViewDocument = (id: string) => {
     // TODO: Echte Implementierung zum Anzeigen/Herunterladen von Dokumenten
    alert(`Dokument ${id} anzeigen/herunterladen`);
  };

  const handleDeleteDocument = (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Dokument löschen möchten?')) {
      // TODO: API-Aufruf zum Löschen des Dokuments
      setDocuments(prev => prev.filter(doc => doc.id !== id));
       setSnackbar({ open: true, message: 'Dokument (mock) gelöscht.', severity: 'success' });
    }
  };

  const handleUploadDialogOpen = () => {
     if (canUpload) {
        setUploadDialogOpen(true);
     } else {
         setSnackbar({ open: true, message: 'Keine Berechtigung zum Hochladen.', severity: 'error' });
     }
  };

  const handleUploadComplete = (files: UploadedFile[]) => {
    // TODO: API-Aufruf zum Speichern der neuen Dokumente und Verknüpfen mit Asset
    const newDocuments: AssetDocument[] = files.map(file => ({
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file_name: file.file.name,
        file_type: file.type, // Verwende den übergebenen Typ
        file_size: file.file.size,
        upload_date: new Date().toISOString(),
        uploaded_by_user: { id: 'user-mock-id', username: 'Aktueller User' }, // Annahme: aktueller Benutzer
        asset_id: assetId!,
        description: file.description || null // Optional Beschreibung
    }));

    setDocuments(prev => [...newDocuments, ...prev]);
    setSnackbar({ open: true, message: `${files.length} Dokument(e) (mock) hochgeladen.`, severity: 'success' });
  };
  // --- Ende Dokumenten-Handling ---

  // Spalten für die Verlaufsübersicht
  const historyColumns: AtlasColumn<AssetHistory>[] = [
    { label: 'ID', dataKey: 'id', width: 100 },
    { label: 'Aktion', dataKey: 'action', width: 150 },
    { label: 'Datum', dataKey: 'change_date', width: 170, render: (value) => new Date(value).toLocaleString('de-DE') },
    { label: 'Benutzer', dataKey: 'changed_by_user', width: 150, render: (_value, row) => row.changed_by_user?.username || 'System' },
    { label: 'Feld', dataKey: 'field_changed', width: 120 },
    { label: 'Alter Wert', dataKey: 'old_value', width: 180 },
    { label: 'Neuer Wert', dataKey: 'new_value', width: 180 },
  ];

  // Spalten für die Dokumentenübersicht
  const documentColumns: AtlasColumn<AssetDocument>[] = [
    { label: 'ID', dataKey: 'id', width: 100 },
    { label: 'Name', dataKey: 'file_name', width: 200 },
    { label: 'Typ', dataKey: 'file_type', width: 150 },
    { label: 'Größe', dataKey: 'file_size', width: 100, render: (value) => `${Math.round(value / 1024)} KB` },
    { label: 'Datum', dataKey: 'upload_date', width: 170, render: (value) => new Date(value).toLocaleString('de-DE') },
    { label: 'Hochgeladen von', dataKey: 'uploaded_by_user', width: 150, render: (_value, row) => row.uploaded_by_user?.username || 'Unbekannt' },
    { label: 'Aktionen', dataKey: 'actions', width: 150, render: (_value, row) => (
        <Box>
             <Tooltip title="Anzeigen / Herunterladen">
                <IconButton size="small" onClick={() => handleViewDocument(row.id)}>
                    <VisibilityIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Löschen">
                 <IconButton size="small" color="error" onClick={() => handleDeleteDocument(row.id)} disabled={!canDelete}> {/* Berechtigungsprüfung */}
                    <DeleteIcon />
                 </IconButton>
            </Tooltip>
        </Box>
    )},
  ];

   // Filtered Room Options based on selected Location
   const filteredRoomOptions = formData?.location_id
       ? roomOptions.filter(room => room.locationId === formData.location_id)
       : roomOptions;


  if (loading && !asset) { // Zeige Ladeanzeige nur initial
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!asset && !loading) {
    return (
      <Box sx={{ p: 3 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleGoBack} sx={{ mb: 2 }}>Zurück</Button>
          <Alert severity="error">Asset nicht gefunden oder Fehler beim Laden.</Alert>
      </Box>
    );
  }

  // Verwende formData im Edit-Modus, sonst asset
  const displayData = editMode ? formData : asset;
  const chipColor = getStatusChipColor(displayData?.status);
  const chipLabel = getStatusChipLabel(displayData?.status);

  return (
    <Box sx={{ p: 3 }}>
      {/* --- Header mit Zurück, Titel, Aktionen --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleGoBack}
        >
          Zurück zur Übersicht
        </Button>
        <Box>
          {canDelete && (
            <IconButton
              color="error"
              onClick={handleDeleteAsset} // Geändert: Öffnet Dialog
              disabled={editMode || loading} // Deaktiviert während Bearbeitung oder Laden
              sx={{ ml: 2 }}
            >
              <DeleteIcon />
            </IconButton>
          )}
          {canEdit && (
            <>
              {editMode ? (
                <>
                  <IconButton
                    color="primary"
                    onClick={handleSaveChanges}
                    disabled={loading} // Deaktiviert während Laden
                    sx={{ ml: 1 }}
                  >
                    <SaveIcon />
                  </IconButton>
                  <IconButton
                    color="default"
                    onClick={handleCancelEdit}
                    disabled={loading} // Deaktiviert während Laden
                    sx={{ ml: 1 }}
                  >
                    <CancelIcon />
                  </IconButton>
                </>
              ) : (
                <IconButton
                  color="primary"
                  onClick={handleEditMode}
                  disabled={loading} // Deaktiviert während Laden
                  sx={{ ml: 1 }}
                >
                  <EditIcon />
                </IconButton>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* --- Titelbereich --- */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ wordBreak: 'break-word' }}>
              {displayData?.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Asset-Tag: {displayData?.asset_tag}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={chipLabel}
                sx={{ bgcolor: chipColor, color: 'white', fontWeight: 'bold' }}
                size="small"
              />
              {displayData?.category?.name && (
                  <Chip icon={<CategoryIcon />} label={displayData.category.name} size="small" variant="outlined" />
              )}
              {displayData?.manufacturer?.name && (
                   <Chip icon={<ManufacturerIcon />} label={displayData.manufacturer.name} size="small" variant="outlined" />
              )}
              {displayData?.location?.name && (
                   <Chip icon={<LocationIcon />} label={displayData.location.name} size="small" variant="outlined" />
              )}
               {displayData?.room?.name && (
                   <Chip icon={<RoomIcon />} label={displayData.room.name} size="small" variant="outlined" />
              )}
               {displayData?.assigned_to_user?.username && (
                    <Chip
                        avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.8rem' }}>{displayData.assigned_to_user.username.charAt(0).toUpperCase()}</Avatar>}
                        label={displayData.assigned_to_user.username}
                        size="small"
                        variant="outlined"
                    />
                )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' }, alignItems: 'center', mt: { xs: 2, md: 0 } }}>
            {/* QR-Code (optional, wenn benötigt) */}
            <Tooltip title="QR-Code anzeigen">
               <IconButton
                color="primary"
                onClick={() => setTabValue(5)} // Index auf 5 angepasst, da QR-Code jetzt der 6. Tab ist
                sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', p: 1.5 }}
                >
                 <QrCodeIcon sx={{ fontSize: 30 }} />
               </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* --- Tabs-Bereich --- */}
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Details" id="asset-tab-0" aria-controls="asset-tabpanel-0" />
          <Tab label="Netzwerk" id="asset-tab-1" aria-controls="asset-tabpanel-1" />
          <Tab label="Finanzen" id="asset-tab-2" aria-controls="asset-tabpanel-2" />
          {canViewDocs && <Tab label="Dokumente" id="asset-tab-3" aria-controls="asset-tabpanel-3" />}
          {canViewHistory && <Tab label="Verlauf" id="asset-tab-4" aria-controls="asset-tabpanel-4" />}
          <Tab label="QR-Code" id="asset-tab-5" aria-controls="asset-tabpanel-5" />
        </Tabs>

        {/* --- Details-Tab --- */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
             {/* Linke Spalte: Hauptinformationen */}
            <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Hauptinformationen</Typography>
                <TextField fullWidth label="Name" name="name" value={displayData?.name || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required error={editMode && !formData?.name} helperText={editMode && !formData?.name ? 'Name ist erforderlich' : ''} />
                <TextField fullWidth label="Asset Tag" name="asset_tag" value={displayData?.asset_tag || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" required error={editMode && !formData?.asset_tag} helperText={editMode && !formData?.asset_tag ? 'Asset Tag ist erforderlich' : ''} />
                <TextField fullWidth label="Seriennummer" name="serial_number" value={displayData?.serial_number || ''} onChange={handleInputChange} disabled={!editMode} margin="dense" />
                <TextField
                    fullWidth select
                    label="Status" name="status"
                    value={displayData?.status || ''}
                    onChange={(e) => handleSelectChange('status', e.target.value)}
                    disabled={!editMode} margin="dense" required
                    error={editMode && !formData?.status} helperText={editMode && !formData?.status ? 'Status ist erforderlich' : ''}
                >
                    {statusOptions.map((option) => <MenuItem key={option} value={option}>{getStatusChipLabel(option)}</MenuItem>)}
                </TextField>
                 <TextField
                    fullWidth select
                    label="Kategorie" name="category_id"
                    value={displayData?.category_id ?? ''}
                    onChange={(e) => handleSelectChange('category_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {categoryOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}
                </TextField>
                <TextField
                    fullWidth select
                    label="Hersteller" name="manufacturer_id"
                    value={displayData?.manufacturer_id ?? ''}
                     onChange={(e) => handleSelectChange('manufacturer_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {manufacturerOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}
                </TextField>
                <TextField
                    fullWidth label="Modell" name="model"
                    value={displayData?.model || ''}
                    onChange={handleInputChange}
                    disabled={!editMode} margin="dense"
                />
                <TextField
                    fullWidth label="Modellnummer" name="model_number"
                    value={displayData?.model_number || ''}
                    onChange={handleInputChange}
                    disabled={!editMode} margin="dense"
                />
            </Grid>

            {/* Rechte Spalte: Standort & Zuweisung */}
            <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2 }}>Standort & Zuweisung</Typography>
                <TextField
                    fullWidth select
                    label="Standort" name="location_id"
                    value={displayData?.location_id ?? ''}
                    onChange={(e) => handleSelectChange('location_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                >
                    <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {locationOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}
                </TextField>
                 <TextField
                    fullWidth select
                    label="Raum" name="room_id"
                    value={displayData?.room_id ?? ''}
                    onChange={(e) => handleSelectChange('room_id', e.target.value)}
                    disabled={!editMode || !formData?.location_id} // Disable if no location selected
                    margin="dense"
                >
                     <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {filteredRoomOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}
                </TextField>
                 <TextField
                    fullWidth select
                    label="Zugewiesen an Benutzer" name="assigned_to_user_id"
                    value={displayData?.assigned_to_user_id ?? ''}
                     onChange={(e) => handleSelectChange('assigned_to_user_id', e.target.value)}
                    disabled={!editMode} margin="dense"
                >
                    <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                    {userOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.username}</MenuItem>)}
                </TextField>
                <TextField
                    fullWidth label="Notizen" name="notes"
                    value={displayData?.notes || ''}
                    onChange={handleInputChange}
                    disabled={!editMode} margin="dense"
                    multiline rows={4}
                />
            </Grid>
          </Grid>
        </TabPanel>

         {/* --- Netzwerk-Tab --- */}
        <TabPanel value={tabValue} index={1}>
             <Typography variant="h6" sx={{ mb: 3 }}>Netzwerkdetails</Typography>
             {networkDetails ? (
                 <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                         <DetailItem icon={<DnsIcon />} label="Hostname" value={networkDetails.hostname} />
                         <DetailItem icon={<NetworkCheckIcon />} label="IP-Adresse" value={networkDetails.ip_address} />
                         <DetailItem icon={<SettingsEthernetIcon />} label="MAC-Adresse" value={networkDetails.mac_address} />
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <DetailItem icon={<PowerIcon />} label="Netzwerkdose" value={networkDetails.network_port?.outlet_number ? `Dose ${networkDetails.network_port.outlet_number}` : 'Nicht verbunden'} />
                         {networkDetails.network_port?.location && <DetailItem icon={<LocationIcon />} label="Dosen-Standort" value={networkDetails.network_port.location.name} />}
                         {networkDetails.network_port?.room && <DetailItem icon={<RoomIcon />} label="Dosen-Raum" value={networkDetails.network_port.room.name} />}
                     </Grid>
                 </Grid>
             ) : (
                 <Typography>Keine Netzwerkdetails verfügbar.</Typography>
             )}
        </TabPanel>

        {/* --- Finanzen-Tab --- */}
        <TabPanel value={tabValue} index={2}>
             <Typography variant="h6" sx={{ mb: 3 }}>Finanzinformationen</Typography>
             <Grid container spacing={3}>
                 <Grid item xs={12} md={6}>
                     <TextField
                        fullWidth select
                        label="Lieferant" name="supplier_id"
                        value={displayData?.supplier_id ?? ''}
                        onChange={(e) => handleSelectChange('supplier_id', e.target.value)}
                        disabled={!editMode} margin="dense"
                    >
                        <MenuItem value=""><em>Keine Auswahl</em></MenuItem>
                        {supplierOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.name}</MenuItem>)}
                    </TextField>
                    <TextField
                        fullWidth label="Kaufdatum" name="purchase_date" type="date"
                        value={displayData?.purchase_date || ''}
                        onChange={handleInputChange} disabled={!editMode} margin="dense"
                        InputLabelProps={{ shrink: true }}
                    />
                     <TextField
                        fullWidth label="Kaufpreis" name="purchase_cost" type="number"
                        value={displayData?.purchase_cost || ''}
                        onChange={handleInputChange} disabled={!editMode} margin="dense"
                        InputProps={{ startAdornment: <AttachMoneyIcon fontSize="small" sx={{ mr: 1 }} /> }}
                    />
                 </Grid>
                 <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth label="Garantieablaufdatum" name="warranty_expiration_date" type="date"
                        value={displayData?.warranty_expiration_date || ''}
                        onChange={handleInputChange} disabled={!editMode} margin="dense"
                        InputLabelProps={{ shrink: true }}
                    />
                     <TextField
                        fullWidth label="Bestellnummer" name="order_number"
                        value={displayData?.order_number || ''}
                        onChange={handleInputChange} disabled={!editMode} margin="dense"
                    />
                 </Grid>
             </Grid>
        </TabPanel>

        {/* --- Dokumente-Tab --- */}
        {canViewDocs && (
            <TabPanel value={tabValue} index={3}>
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Zugehörige Dokumente</Typography>
                     {canUpload && (
                        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleUploadDialogOpen} disabled={!canUpload}>
                            Dokument hochladen
                        </Button>
                     )}
                </Box>
                <Box sx={{ position: 'relative', height: 400 }}>
                    <AtlasTable
                    columns={documentColumns}
                    rows={documents}
                    heightPx={400}
                    />
                </Box>
            </TabPanel>
        )}

        {/* --- Verlauf-Tab --- */}
        {canViewHistory && (
            <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" sx={{ mb: 3 }}>Änderungsverlauf</Typography>
            <Box sx={{ position: 'relative', height: 400 }}>
                <AtlasTable
                columns={historyColumns}
                rows={history}
                heightPx={400}
                />
            </Box>
            </TabPanel>
        )}

        {/* --- QR-Code-Tab --- */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: 'white', width: 'fit-content' }}>
              <QRCodeSVG
                value={`ATLAS-ASSET-${asset?.asset_tag || asset?.id || ''}`} // Verwende Asset-Tag oder ID
                size={200}
                level="H" // Hohe Fehlerkorrektur
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </Paper>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Dieser QR-Code enthält den Asset-Tag ({asset?.asset_tag}) für schnellen Zugriff.
            </Typography>
             {/* Download Button (optional) */}
             {/* <Button variant="contained" color="primary">QR-Code herunterladen</Button> */}
          </Box>
        </TabPanel>
      </Paper>

      {/* --- Upload-Dialog --- */}
      <DocumentUploader
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUploadComplete={handleUploadComplete}
        relatedEntityId={assetId}
        isModal={true}
      />

       {/* --- Confirmation Dialog für Löschen --- */}
       <ConfirmationDialog
         open={confirmDialogOpen}
         onClose={handleCloseConfirmDialog}
         onConfirm={executeDelete}
         title="Asset löschen"
         message={`Möchten Sie das Asset "${itemToDelete?.name}" (Tag: ${itemToDelete?.asset_tag}) wirklich unwiderruflich löschen?`}
         confirmText="Löschen"
         cancelText="Abbrechen"
       />

      {/* --- Snackbar für Benachrichtigungen --- */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Helper Komponente für Detail-Items in Tabs
interface DetailItemProps {
    icon: React.ReactElement;
    label: string;
    value: string | number | null | undefined;
}
const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value }) => (
     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        {React.cloneElement(icon, { sx: { mr: 1.5, color: 'text.secondary' } })}
        <Box>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{value || '-'}</Typography>
        </Box>
    </Box>
);

// --- Mock Data Generators (Beispielhaft) ---
// Annahme: Die Mock-Funktionen sind korrekt definiert
// declare function generateMockHistory(count: number, assetId: string): AssetHistory[]; // Auskommentiert, da Typ fehlt
// declare function generateMockDocuments(count: number, assetId: string): AssetDocument[]; // Auskommentiert, da Typ fehlt
// declare function generateMockNetworkDetails(assetId: string): AssetNetworkDetails; // Auskommentiert, da Typ fehlt

// Placeholder Mock Generators
const generateMockAsset = (id: string): Asset => ({ id: id, name: `Mock Asset ${id}`, asset_tag: `MOCK-${id}`, status: 'In Betrieb', purchase_date: '2023-01-15', warranty_expiration_date: '2025-01-14' });
declare function generateMockHistory(count: number, assetId: string): AssetHistory[];
declare function generateMockDocuments(count: number, assetId: string): AssetDocument[];
declare function generateMockNetworkDetails(assetId: string): AssetNetworkDetails;
// --- Ende Mock Data Generators ---


export default AssetDetails;
