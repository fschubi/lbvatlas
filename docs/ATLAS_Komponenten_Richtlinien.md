# ATLAS Komponenten-Richtlinien

## Einheitliches 3-Punkte-Menü für Tabellen

Alle Tabellen im ATLAS-System sollen das einheitliche TableContextMenu für Aktionen verwenden. Dies sorgt für ein konsistentes Nutzererlebnis und erleichtert die Wartbarkeit.

### 1. Komponenten

#### TableContextMenu

Die Komponente `TableContextMenu` befindet sich unter `frontend/src/components/TableContextMenu.tsx` und bietet eine standardisierte Implementierung von Aktionsmenüs für Tabelleneinträge.

**Eigenschaften:**
- Öffnet sich direkt an der Mausposition (optional auch am Ankerelement)
- Unterstützt Standard-Aktionen: view, edit, delete, duplicate, print, download, archive
- Unterstützt benutzerdefinierte Aktionen
- Vollständig anpassbar bezüglich Icons, Labels und Farben

### 2. Integration in AtlasTable

Die `AtlasTable`-Komponente enthält bereits integrierte Unterstützung für das TableContextMenu über die folgenden Props:

```tsx
<AtlasTable
  columns={columns}
  rows={data}
  // ... weitere Standardprops ...

  // Für TableContextMenu
  useContextMenu={true}
  onContextMenuAction={handleContextMenuAction}
  contextMenuUsePosition={true}  // Öffnet Menü an Mausposition
  contextMenuActions={customActions}  // Optional: Eigene Aktionen definieren
/>
```

### 3. Implementierung in Seiten

Für die Integration des TableContextMenu in einer neuen Seite:

#### Schritt 1: Import

```tsx
import { MenuAction } from '../../components/TableContextMenu';
```

#### Schritt 2: Definieren eines Handlers für Menüaktionen

```tsx
// Handler für Kontextmenü-Aktionen
const handleContextMenuAction = (actionType: MenuAction | string, item: YourItemType) => {
  switch (actionType) {
    case 'view':
      handleViewItem(item);
      break;
    case 'edit':
      handleEditItem(item);
      break;
    case 'delete':
      handleDeleteRequest(item);
      break;
    // Weitere Aktionen hier hinzufügen
    default:
      console.warn(`Unbekannte Aktion: ${actionType}`);
  }
};
```

#### Schritt 3: Tabellenkonfiguration

Entferne jegliche manuelle Implementierung von Aktionsspalten aus deinen Spalten-Definitionen. Die AtlasTable-Komponente fügt automatisch eine Aktionsspalte hinzu, wenn `useContextMenu={true}` gesetzt ist.

```tsx
const columns: AtlasColumn<YourItemType>[] = [
  // Deine normalen Spalten ohne Aktionsspalte
  { dataKey: 'id', label: 'ID', width: 70, numeric: true },
  { dataKey: 'name', label: 'Name', width: 200 },
  // ...weitere Spalten
];
```

#### Schritt 4: AtlasTable mit TableContextMenu konfigurieren

```tsx
<AtlasTable
  columns={columns}
  rows={items}
  heightPx={600}
  emptyMessage="Keine Daten vorhanden"
  initialSortColumn="name"
  initialSortDirection="asc"
  useContextMenu={true}
  onContextMenuAction={handleContextMenuAction}
  contextMenuUsePosition={true}
/>
```

#### Schritt 5 (Optional): Benutzerdefinierte Aktionen

Wenn Du benutzerdefinierte Aktionen benötigst, kannst Du diese definieren:

```tsx
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon
} from '@mui/icons-material';

const customActions = [
  { type: 'view', label: 'Anzeigen', icon: <ViewIcon fontSize="small" /> },
  { type: 'edit', label: 'Bearbeiten', icon: <EditIcon fontSize="small" /> },
  {
    type: 'duplicate',
    label: 'Duplizieren',
    icon: <DuplicateIcon fontSize="small" />
  },
  {
    type: 'delete',
    label: 'Löschen',
    icon: <DeleteIcon fontSize="small" color="error" />,
    dividerBefore: true,
    color: 'error.main'
  }
];

// Dann in AtlasTable verwenden
<AtlasTable
  // ...andere Props...
  useContextMenu={true}
  onContextMenuAction={handleContextMenuAction}
  contextMenuActions={customActions}
  contextMenuUsePosition={true}
/>
```

### 4. Referenzbeispiele

Es gibt bereits mehrere Beispielimplementierungen im Projekt:

- `frontend/src/pages/settings/UserGroupManagement.tsx`
- `frontend/src/pages/settings/Departments.tsx`
- `frontend/src/pages/settings/Suppliers.tsx`

### 5. Best Practices

1. **Konsistenz**: Verwende immer dieselben Labels für dieselben Aktionen
   - "Anzeigen" statt "Details"
   - "Bearbeiten" statt "Ändern"
   - "Löschen" statt "Entfernen"

2. **Farben**: Verwende Standardfarben für Aktionen
   - Anzeigen: Standard oder Blau
   - Bearbeiten: Grün
   - Löschen: Rot (error.main)

3. **Divider**: Trenne gefährliche Aktionen durch einen Divider
   ```tsx
   {
     type: 'delete',
     label: 'Löschen',
     dividerBefore: true,
     color: 'error.main'
   }
   ```

4. **Position**: Verwende immer `contextMenuUsePosition={true}` für bessere Benutzerfreundlichkeit

### 6. Fehlerbehebung

**Problem**: Menü öffnet sich an falscher Position
**Lösung**: Stelle sicher, dass `contextMenuUsePosition={true}` gesetzt ist

**Problem**: Aktionen werden nicht ausgeführt
**Lösung**: Überprüfe, ob der `onContextMenuAction`-Handler alle Aktionstypen korrekt behandelt

**Problem**: Menü wird beim Klick auf eine Zeile geschlossen
**Lösung**: Stelle sicher, dass `onClick`-Events mit `event.stopPropagation()` bearbeitet werden

**Schutzebene 1: Setze state-Variablen für View-Modus
const handleView = (item) => {
  setEditMode(false);
  setViewMode(true);  // Hauptflag für View-Modus
  setReadOnly(true);  // Zusätzliches Flag für Lesezugriff

  <TextField
  // ...andere Eigenschaften
  disabled={viewMode}  // Deaktiviert das Feld visuell
  InputProps={{
    // ...andere Eigenschaften
    readOnly: viewMode,  // Verhindert Bearbeitung selbst wenn disabled umgangen wird
  }}
/>

const handleCloseDialog = () => {
  setDialogOpen(false);

  // Alle Formulardaten zurücksetzen
  // ...

  // Wichtig: Alle Modus-Flags zurücksetzen
  setViewMode(false);
  setEditMode(false);
  setReadOnly(false);
  setCurrentItem(null);
};

<DialogTitle
  sx={{
    bgcolor: viewMode ? '#2a2a2a' : (editMode ? 'primary.dark' : 'primary.main'),
    color: 'white',
    // ...andere Styles
  }}
>
  {viewMode ? 'Details anzeigen' : (editMode ? 'Bearbeiten' : 'Neu erstellen')}
</DialogTitle>
