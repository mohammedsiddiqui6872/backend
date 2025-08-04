import React from 'react';
import { CircularProgress, Box } from '@mui/material';

export const PageLoader: React.FC = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      width="100%"
    >
      <CircularProgress />
    </Box>
  );
};