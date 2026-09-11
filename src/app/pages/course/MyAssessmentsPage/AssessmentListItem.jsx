import { Box, Typography, Chip } from "@mui/material";
import { MINIMUM_PASSING_GRADE, GRADE_COLORS } from "$api/constants/gradeConstants";

/** Uma avaliação cadastrada no curso: nome, percentual, nota do aluno, feedback do professor. */
export default function AssessmentListItem({ assessment: a }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        py: { xs: 1.2, sm: 1.5 },
        px: { xs: 1.5, sm: 2 },
        bgcolor: "#f5f8ff",
        borderRadius: 2,
        mb: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: a.description ? 1 : 0,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {a.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.813rem" },
            }}
          >
            Percentual: {Number(a?.percentage ?? a?.weight ?? 0)}%
          </Typography>
        </Box>
        <Box
          sx={{
            textAlign: { xs: "center", sm: "right" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <Chip
            label={a?.userGrade != null ? a.userGrade : "Sem nota"}
            color={
              a?.userGrade == null
                ? "default"
                : a.userGrade >= MINIMUM_PASSING_GRADE
                ? "success"
                : "error"
            }
            size="small"
            sx={{
              backgroundColor:
                a?.userGrade == null
                  ? undefined
                  : a.userGrade >= MINIMUM_PASSING_GRADE
                  ? "#e6f4ea"
                  : "#fdecea",
              color:
                a?.userGrade == null
                  ? undefined
                  : a.userGrade >= MINIMUM_PASSING_GRADE
                  ? GRADE_COLORS.APPROVED
                  : GRADE_COLORS.FAILED,
              fontWeight: 800,
              fontSize: { xs: "0.75rem", sm: "0.813rem" },
            }}
          />
        </Box>
      </Box>
      {a.description && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: "1px solid #e3eafc",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "#666",
              whiteSpace: "pre-wrap",
            }}
          >
            {a.description}
          </Typography>
        </Box>
      )}
      {a.userFeedback && (
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: "#F5F0FA",
            borderLeft: "3px solid #9041c1",
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: "#7d37a7" }}
          >
            Feedback do professor
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: "#5B5566",
              whiteSpace: "pre-wrap",
            }}
          >
            {a.userFeedback}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
