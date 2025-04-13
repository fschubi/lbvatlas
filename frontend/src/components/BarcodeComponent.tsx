import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Box } from '@mui/material';

interface BarcodeComponentProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  format?: string;
  margin?: number;
}

const BarcodeComponent: React.FC<BarcodeComponentProps> = ({
  value,
  width = 2,
  height = 40,
  displayValue = true,
  fontSize = 12,
  format = 'CODE39',
  margin = 5
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          margin,
          marginTop: margin,
          marginBottom: margin,
          marginLeft: margin,
          marginRight: margin,
          valid: () => true
        });
      } catch (error) {
        console.error('Fehler beim Generieren des Barcodes:', error);
      }
    }
  }, [value, width, height, displayValue, fontSize, format, margin]);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg ref={barcodeRef} />
    </Box>
  );
};

export default BarcodeComponent;
