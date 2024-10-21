import { Button } from '@mui/material';
import { CommentSharp } from '@mui/icons-material';

export default function ShowComments({ onShowComments }) {
    return (
        <Button
            variant="outlined"
            startIcon={<CommentSharp style={{ height: '30px', width: '30px' }} />}
            onClick={onShowComments}
            className='comment-button'
        >
            Comentários
        </Button>
    );
}