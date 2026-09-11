import { Box, Tabs, Tab } from "@mui/material";

const TAB_LABELS = [
  "Conteúdo",
  "Materiais Extras",
  "Quiz",
  "Alunos",
  "Avaliações",
  "Trabalhos",
  "Dúvidas",
];

/** Navegação por abas do curso: barra centrada no desktop, rolável no celular. */
export default function CourseTabsNav({ selectedTab, onChange }) {
  return (
    <>
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Tabs
          value={selectedTab}
          onChange={onChange}
          indicatorColor="primary"
          textColor="primary"
          centered
          sx={{
            mb: 4,
            "& .MuiTab-root": {
              color: "#666",
              "&.Mui-selected": { color: "#9041c1" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
          }}
        >
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <Tabs
          value={selectedTab}
          onChange={onChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            mb: 4,
            "& .MuiTab-root": {
              color: "#666",
              "&.Mui-selected": { color: "#9041c1" },
              fontSize: { xs: "0.8rem", sm: "0.875rem" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "#9041c1" },
            "& .MuiTabs-scrollButtons": { color: "#9041c1" },
          }}
        >
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Box>
    </>
  );
}
