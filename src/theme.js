import { createTheme } from "@mui/material/styles";

/**
 * Tema único do Codefólio.
 *
 * Fonte de verdade da identidade visual: cor, tipografia, raio de canto e
 * sombra saem daqui, e não de `sx` espalhado pelas telas. Antes de escrever
 * `backgroundColor: "#9041c1"` num componente, use `primary.main` — assim uma
 * mudança de marca acontece neste arquivo, e não em 500 lugares.
 */

// Roxo Codefólio. `dark` é o tom já usado como hover em todo o app (#7d37a7),
// mantido igual de propósito para que os `sx` legados não destoem do tema.
const BRAND = {
  main: "#9041C1",
  dark: "#7D37A7",
  light: "#B478D8",
  surface: "#F5F0FA",
};

// Neutros levemente puxados para o roxo, para conversarem com a marca.
const INK = {
  primary: "#1A1523",
  secondary: "#5B5566",
  disabled: "#9A93A6",
  divider: "#E7E4EC",
};

// Sombras difusas e escuras datam a interface. Estas são curtas e discretas;
// a separação de superfície vem principalmente da borda de 1px.
const softShadows = [
  "none",
  "0 1px 2px rgba(26,21,35,0.06)",
  "0 2px 6px rgba(26,21,35,0.06)",
  "0 4px 12px rgba(26,21,35,0.08)",
  "0 8px 20px rgba(26,21,35,0.08)",
  "0 12px 28px rgba(26,21,35,0.10)",
  "0 16px 36px rgba(26,21,35,0.10)",
];

const base = createTheme();

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: BRAND.main,
      dark: BRAND.dark,
      light: BRAND.light,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#0E9F6E",
      dark: "#087F5B",
      light: "#4ADE9C",
      contrastText: "#FFFFFF",
    },
    success: { main: "#12855A", light: "#E6F4EA", dark: "#0B5F3F" },
    warning: { main: "#B26A00", light: "#FFF3E0", dark: "#8A5200" },
    error: { main: "#C7362F", light: "#FDECEA", dark: "#9B2820" },
    info: { main: BRAND.main, light: BRAND.surface, dark: BRAND.dark },
    text: {
      primary: INK.primary,
      secondary: INK.secondary,
      disabled: INK.disabled,
    },
    divider: INK.divider,
    background: {
      default: "#F5F5FA",
      paper: "#FFFFFF",
    },
  },

  shape: { borderRadius: 12 },

  shadows: [...softShadows, ...base.shadows.slice(softShadows.length)],

  typography: {
    fontFamily:
      "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    // Títulos grandes com tracking negativo — sem isso a fonte "abre" demais
    // e volta a parecer texto de documento.
    h1: { fontWeight: 700, letterSpacing: "-0.025em" },
    h2: { fontWeight: 700, letterSpacing: "-0.022em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.018em" },
    h5: { fontWeight: 650, letterSpacing: "-0.014em" },
    h6: { fontWeight: 650, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { letterSpacing: "-0.005em" },
    body2: { letterSpacing: "-0.003em" },
    button: { fontWeight: 600, letterSpacing: 0, textTransform: "none" },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: "smooth", WebkitFontSmoothing: "antialiased" },
        body: {
          backgroundColor: "#F5F5FA",
          color: INK.primary,
          overflowX: "hidden",
        },
        // Anel de foco visível e na cor da marca, para navegação por teclado.
        ":focus-visible": {
          outline: `2px solid ${BRAND.main}`,
          outlineOffset: "2px",
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 16 },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        outlined: { borderColor: INK.divider },
      },
    },

    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 16 },
        // O MUI clareia o fundo do Paper por elevação via gradiente; some com ele.
        root: { backgroundImage: "none" },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${INK.divider}`,
          boxShadow: softShadows[1],
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, minHeight: 48 },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
        notchedOutline: { borderColor: INK.divider },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 999, backgroundColor: INK.divider },
        bar: { borderRadius: 999 },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: INK.primary,
          fontSize: "0.75rem",
          borderRadius: 8,
          paddingBlock: 6,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: INK.divider },
        head: { fontWeight: 600, color: INK.secondary },
      },
    },
  },
});

export default theme;
