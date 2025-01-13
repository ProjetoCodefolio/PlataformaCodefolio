import React from 'react';
import { Box, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

const Pagination = ({ currentPage, lastPage, onNextPage, onPreviousPage, onPageSelect }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
      <button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        style={{ background: 'none', border: 'none' }}
      >
        <ChevronLeft
          style={{
            width: '70px',
            height: '70px',
            marginRight: '8px',
            color: currentPage === 1 ? 'gray' : "black"
          }}
        />
      </button>

      <Box>
        <Typography component="div" variant="h4">
          {Array.from({ length: lastPage }, (_, index) => (
            <button
              key={index}
              onClick={() => onPageSelect(index + 1)}
              style={{
                width: '70px',
                height: '70px',
                background: index + 1 === currentPage ? 'purple' : 'white',
                border: 'none',
                color: index + 1 === currentPage ? 'white' : 'black'
              }}
            >
              <Typography component="div" variant="h6">
                {index + 1}
              </Typography>
            </button>
          ))}
        </Typography>
      </Box>

      <button
        onClick={onNextPage}
        style={{ background: 'none', border: 'none' }}
        disabled={currentPage === lastPage}
      >
        <ChevronRight
          style={{
            width: '70px',
            height: '70px',
            marginLeft: '8px',
            color: currentPage === lastPage ? 'gray' : 'black'
          }}
        />
      </button>
    </Box>
  );
};

export default Pagination;