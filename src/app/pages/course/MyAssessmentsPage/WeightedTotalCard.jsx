import { Box, Card, CircularProgress, Tooltip, Typography } from "@mui/material";

/** Nota total ponderada do curso (soma de nota × percentual/100, até 10), com o anel de progresso. */
export default function WeightedTotalCard({ totalWeightedCapped, progressValue, fmt }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: { xs: "center", sm: "flex-end" },
        alignItems: "center",
      }}
    >
      <Card
        variant="outlined"
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: "#f5f8ff",
          borderColor: "#b362c7ff",
          minWidth: { xs: "100%", sm: 180 },
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ textAlign: { xs: "left", sm: "right" }, flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                fontSize: { xs: "0.75rem", sm: "0.813rem" },
              }}
            >
              Nota total
            </Typography>
            <Tooltip title="Soma das notas ponderadas: nota × (percentual/100)">
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "1.5rem", sm: "1.75rem" },
                }}
              >
                {fmt(totalWeightedCapped)}
              </Typography>
            </Tooltip>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.813rem" },
              }}
            >
              de 10,00
            </Typography>
          </Box>
          <CircularProgress
            variant="determinate"
            value={progressValue}
            size={window.innerWidth < 600 ? 44 : 54}
            thickness={5}
            sx={{
              color: "#a84fd4ff",
              bgcolor: "#e3eafc",
              borderRadius: "50%",
            }}
          />
        </Box>
      </Card>
    </Box>
  );
}
