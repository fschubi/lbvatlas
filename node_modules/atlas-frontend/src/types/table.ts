export interface AtlasColumn {
  label: string;
  dataKey: string;
  width?: number;
  numeric?: boolean;
  render?: (value: any, row?: any) => React.ReactNode;
}
