import React from 'react';
import { Box, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

const Pagination = ({ currentPage, lastPage, onNextPage, onPreviousPage, onPageSelect }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
      <button
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ChevronLeft
          style={{
            width: '40px',
            height: '40px',
            marginRight: '8px',
            color: currentPage === 1 ? 'gray' : "gray"
          }}
        />
      </button>

      <Box>
        <Typography component="div" variant="h6">
          {Array.from({ length: lastPage }, (_, index) => (
            <button
              key={index}
              onClick={() => onPageSelect(index + 1)}
              style={{
                width: '40px',
                height: '40px',
                background: index + 1 === currentPage ? '#9041c1 ' : 'white',
                border: index + 1 === currentPage ? '1px solid #9041c1' : 'none',
                borderRadius: '50%',
                color: index + 1 === currentPage ? 'white' : 'black',
                margin: '0 4px'
              }}
            >
              {index + 1}
            </button>
          ))}
        </Typography>
      </Box>

      <button
        onClick={onNextPage}
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        disabled={currentPage === lastPage}
      >
        <ChevronRight
          style={{
            width: '40px',
            height: '40px',
            marginLeft: '8px',
            color: currentPage === lastPage ? 'gray' : 'black'
          }}
        />
      </button>
    </Box>
  );
};

export default Pagination;