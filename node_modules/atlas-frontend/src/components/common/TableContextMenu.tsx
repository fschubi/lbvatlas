import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Archive as ArchiveIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Group as GroupIcon
} from '@mui/icons-material';

export type MenuAction =
  | 'view'
  | 'edit'
  | 'delete'
  | 'duplicate'
  | 'print'
  | 'download'
  | 'archive'
  | 'lock'
  | 'unlock'
  | 'groups';

interface MenuActionItem {
  type: MenuAction;
  label: string;
  icon: React.ReactNode;
  color?: string;
  dividerBefore?: boolean;
}

interface TableContextMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onAction: (action: MenuAction) => void;
  actions?: MenuAction[];
  isLocked?: boolean;
}

const defaultActions: MenuActionItem[] = [
  { type: 'view', label: 'Anzeigen', icon: <ViewIcon fontSize="small" /> },
  { type: 'edit', label: 'Bearbeiten', icon: <EditIcon fontSize="small" /> },
  { type: 'duplicate', label: 'Duplizieren', icon: <DuplicateIcon fontSize="small" /> },
  { type: 'print', label: 'Drucken', icon: <PrintIcon fontSize="small" /> },
  { type: 'download', label: 'Herunterladen', icon: <DownloadIcon fontSize="small" /> },
  { type: 'archive', label: 'Archivieren', icon: <ArchiveIcon fontSize="small" />, dividerBefore: true },
  { type: 'groups', label: 'Gruppen zuweisen', icon: <GroupIcon fontSize="small" /> },
  { type: 'delete', label: 'Löschen', icon: <DeleteIcon fontSize="small" color="error" />, color: 'error.main', dividerBefore: true }
];

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  anchorEl,
  onClose,
  onAction,
  actions = ['view', 'edit', 'delete'],
  isLocked
}) => {
  const theme = useTheme();

  const handleClick = (action: MenuAction) => {
    onAction(action);
    onClose();
  };

  const filteredActions = defaultActions.filter(action => actions.includes(action.type));

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      onClick={onClose}
      PaperProps={{
        elevation: 3,
        sx: {
          minWidth: 200,
          '& .MuiMenuItem-root': {
            py: 1,
          },
        },
      }}
    >
      {filteredActions.map((action, index) => (
        <React.Fragment key={action.type}>
          {action.dividerBefore && <Divider />}
          <MenuItem
            onClick={() => handleClick(action.type)}
            sx={{
              color: action.color ? theme.palette[action.color.split('.')[0]].main : 'inherit',
            }}
          >
            <ListItemIcon
              sx={{
                color: action.color ? theme.palette[action.color.split('.')[0]].main : 'inherit',
              }}
            >
              {action.icon}
            </ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        </React.Fragment>
      ))}
    </Menu>
  );
};
