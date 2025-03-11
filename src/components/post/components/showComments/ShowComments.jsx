import { Button } from '@mui/material';
import { CommentSharp } from '@mui/icons-material';
import { useIsMobileHook } from '../../../useIsMobileHook';

export default function ShowComments({ onShowComments }) {
    const isMobile = useIsMobileHook(700);

    return (
        <div 
            onClick={onShowComments}
            style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '8px 12px',
                gap: '4px',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
                width: 'fit-content'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(144, 65, 193, 0.04)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            <CommentSharp 
                sx={{
                    fontFamily: 'Arial, sans-serif',
                    width: '24px',
                    height: '24px',
                    color: '#666'
                }}
            />
            {!isMobile && (
                <span style={{ 
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#666'
                }}>
                    Comentários
                </span>
            )}
        </div>
    );
}