import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

export type MenuAction = 'view' | 'edit' | 'delete' | 'duplicate' | 'print' | 'download' | 'archive' | 'custom';

export interface MenuActionConfig {
  type: MenuAction;
  label: string;
  icon?: React.ReactNode;
  dividerBefore?: boolean;
  dividerAfter?: boolean;
  color?: string;
  disabled?: boolean;
  visible?: boolean;
}

export interface CustomMenuAction extends MenuActionConfig {
  type: 'custom';
  id: string;
}

export interface TableContextMenuProps<T = any> {
  // Die Zeile, für die das Menü angezeigt wird
  row: T;
  // Verfügbare Aktionen
  actions?: (MenuActionConfig | CustomMenuAction)[];
  // Event-Handler für Aktionen
  onAction: (actionType: MenuAction | string, row: T) => void;
  // Position des Menüs
  position?: 'left' | 'right' | 'center';
  // Tooltip für das Menü-Icon
  tooltip?: string;
  // Icon-Größe
  iconSize?: 'small' | 'medium' | 'large';
  // Deaktivieren des Menüs
  disabled?: boolean;
  // Icon-Farbe
  iconColor?: string;
  // Verwendung von Positionen anstelle von Ankerelementen für das Menü
  usePosition?: boolean;
}

const defaultActions: MenuActionConfig[] = [
  { type: 'view', label: 'Anzeigen', icon: <ViewIcon fontSize="small" /> },
  { type: 'edit', label: 'Bearbeiten', icon: <EditIcon fontSize="small" /> },
  {
    type: 'delete',
    label: 'Löschen',
    icon: <DeleteIcon fontSize="small" color="error" />,
    dividerBefore: true,
    color: 'error.main'
  }
];

const TableContextMenu = <T extends object>({
  row,
  actions = defaultActions,
  onAction,
  position = 'right',
  tooltip = 'Aktionen',
  iconSize = 'small',
  disabled = false,
  iconColor,
  usePosition = false
}: TableContextMenuProps<T>) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (usePosition) {
      // Positionieren des Menüs an der Mausposition
      setMenuPosition({
        mouseX: event.clientX,
        mouseY: event.clientY
      });
    } else {
      // Verwenden des Button-Elements als Anker
      setMenuAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuPosition(null);
  };

  const handleActionClick = (actionType: MenuAction | string) => {
    handleMenuClose();
    onAction(actionType, row);
  };

  // Filtere Aktionen, die sichtbar sein sollen
  const visibleActions = actions.filter(action => action.visible !== false);

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          size={iconSize}
          onClick={handleMenuOpen}
          disabled={disabled}
          aria-label={tooltip}
          sx={{ color: iconColor }}
        >
          <MoreVertIcon fontSize={iconSize} />
        </IconButton>
      </Tooltip>

      <Menu
        open={Boolean(menuAnchorEl) || Boolean(menuPosition)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        // Wenn usePosition true ist, verwende anchorReference="anchorPosition"
        {...(usePosition
          ? {
              anchorReference: 'anchorPosition',
              anchorPosition: menuPosition
                ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
                : undefined
            }
          : { anchorEl: menuAnchorEl })}
        PaperProps={{
          sx: {
            minWidth: 180,
            boxShadow: 4,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
            }
          }
        }}
        MenuListProps={{ dense: true }}
      >
        {visibleActions.map((action, index) => (
          <React.Fragment key={action.type === 'custom' ? (action as CustomMenuAction).id : action.type}>
            {action.dividerBefore && <Divider />}
            <MenuItem
              onClick={() => handleActionClick(action.type === 'custom' ? (action as CustomMenuAction).id : action.type)}
              disabled={action.disabled}
              sx={{ color: action.color }}
            >
              {action.icon && <ListItemIcon sx={{ color: action.color }}>{action.icon}</ListItemIcon>}
              <ListItemText primary={action.label} />
            </MenuItem>
            {action.dividerAfter && <Divider />}
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
};

export default TableContextMenu;
