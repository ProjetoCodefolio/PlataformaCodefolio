import { Button } from '@mui/material';
import { CommentSharp } from '@mui/icons-material';
import { useIsMobileHook } from '../../../useIsMobileHook';

export default function ShowComments({ onShowComments }) {
    const isMobile = useIsMobileHook(700);

    return (
        <Button
            variant="outlined"
            startIcon={<CommentSharp style={{ height: '30px', width: '30px' }} />}
            onClick={onShowComments}
            className='comment-button'
            style={{
                display: 'flex',
                width: isMobile ? '100px' : '200px',
            }}
        >
            {isMobile ? '' : 'Comentários'}
        </Button>
    );
}