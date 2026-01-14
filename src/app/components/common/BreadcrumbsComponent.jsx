import React from "react";
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

/**
 * Componente de Breadcrumbs reutilizável para toda a aplicação
 * @param {Array} items - Array de objetos com {label, path, onClick}
 * @param {Function} onBack - Função executada ao clicar no botão voltar
 * @param {boolean} showBackButton - Mostrar ou não o botão voltar
 * @param {ReactNode} actionButtons - Componentes de ação adicionais (ex: export)
 */
export default function BreadcrumbsComponent({
  items = [],
  onBack,
  showBackButton = true,
  actionButtons = null,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (items.length > 0 && items[0].path) {
      navigate(items[0].path);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        mb: 3,
        mt: 5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {showBackButton && (
          <Tooltip title="Voltar">
            <IconButton
              onClick={handleBack}
              sx={{
                color: "#9041c1",
                "&:hover": { backgroundColor: "rgba(144, 65, 193, 0.1)" },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
        )}

        <Breadcrumbs
          aria-label="breadcrumb"
          sx={{
            "& .MuiBreadcrumbs-separator": {
              mx: 1,
              color: "#9041c1",
            },
          }}
        >
          {items.map((item, index) => (
            <div key={index}>
              {index === items.length - 1 ? (
                <Typography
                  color="text.primary"
                  sx={{
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {item.label}
                </Typography>
              ) : (
                <Link
                  underline="hover"
                  color="inherit"
                  onClick={item.onClick || (() => navigate(item.path))}
                  sx={{
                    cursor: "pointer",
                    color: "#9041c1",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </Breadcrumbs>
      </Stack>

      {actionButtons && <Box>{actionButtons}</Box>}
    </Box>
  );
}