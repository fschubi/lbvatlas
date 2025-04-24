import React from 'react';
import { TableComponents as VirtuosoTableComponents } from 'react-virtuoso';
import { Table, TableHead, TableBody, TableRow } from '@mui/material';

export const TableComponents: VirtuosoTableComponents<any> = {
  Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
    <div
      {...props}
      ref={ref}
      style={{
        ...props.style,
        overflow: 'auto',
      }}
    />
  )),

  Table: (props) => (
    <Table
      {...props}
      sx={{
        borderCollapse: 'separate',
        borderSpacing: 0,
        '& th': {
          backgroundColor: 'background.paper',
          color: 'text.primary',
          fontWeight: 'bold',
          padding: '12px 16px',
          borderBottom: '2px solid',
          borderBottomColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        },
        '& td': {
          padding: '12px 16px',
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
        },
      }}
    />
  ),

  TableHead,
  TableRow,
  TableBody,
};

// Exportiere auch eine typisierte Version für bessere TypeScript-Unterstützung
export type TableComponentsType = typeof TableComponents;
