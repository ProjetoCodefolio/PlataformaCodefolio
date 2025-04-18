import React, { useRef, useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Avatar,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  LinearProgress,
  Popper,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const StudentSelector = ({
  loading,
  selectedStudent,
  onSortStudent,
  onOpenMenu,
  menuOpen,
  anchorEl,
  onCloseMenu,
  searchTerm,
  onSearchChange,
  filteredStudents,
  onSelectStudent,
  onAbleStudent,
  enrolledStudents,
  waitingForNextStudent,
  onEyeToggle,
  eyeOpen,
  isCustomMode = false, 
}) => {
  const chooseButtonRef = useRef(null);
  const popperRef = useRef(null);

  const handleSortStudent = () => {
    onSortStudent(isCustomMode);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (menuOpen) return;
      if (event.key === " ") {
        if (document.activeElement) {
          document.activeElement.blur();
        }
        document.body.focus();
        if (enrolledStudents && enrolledStudents.length > 0) {
          handleSortStudent();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSortStudent, enrolledStudents]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuOpen &&
        popperRef.current &&
        !popperRef.current.contains(event.target) &&
        chooseButtonRef.current &&
        !chooseButtonRef.current.contains(event.target)
      ) {
        onCloseMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: 2,
        opacity: 0.9,
        transform: "scale(0.95)",
        width: "100%",
        mt: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          justifyContent: "center",
        }}
      >
        {loading ? (
          <Box sx={{ width: "75%", maxWidth: "500px" }}>
            <Typography
              variant="body2"
              sx={{ mb: 1, textAlign: "center", fontSize: "0.9rem" }}
            >
              Carregando alunos...
            </Typography>
            <LinearProgress color="inherit" sx={{ opacity: 0.7 }} />
          </Box>
        ) : selectedStudent ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              maxWidth: "600px",
            }}
          >
            <Paper
              elevation={2}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 2,
                width: "100%",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={selectedStudent.photoURL}
                  alt={selectedStudent.name}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                    color: "#fff",
                    width: 45,
                    height: 45,
                    mr: 2,
                    fontSize: 18,
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {selectedStudent.initials}
                </Avatar>
                <Typography
                  sx={{
                    color: "#fff",
                    fontSize: "1.15rem",
                    fontWeight: 500,
                    textShadow: "0px 1px 2px rgba(0,0,0,0.2)",
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedStudent.name}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={handleSortStudent}
                  sx={{ color: "#fff" }}
                  title="Sortear outro aluno"
                  size="small"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => onEyeToggle(!eyeOpen)}
                  sx={{ color: "#fff" }}
                  title={eyeOpen ? "Ocultar respostas" : "Mostrar respostas"}
                  size="small"
                >
                  {eyeOpen ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
                </IconButton>
                <IconButton
                  ref={chooseButtonRef}
                  onClick={onOpenMenu}
                  sx={{ color: "#fff", opacity: 0.8 }}
                  title="Escolher outro aluno"
                  size="small"
                >
                  <ArrowDropDownIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          </Box>
        ) : waitingForNextStudent ? (
          <Box sx={{ width: "75%", maxWidth: "500px" }}>
            <Typography
              variant="body2"
              sx={{ mb: 1, textAlign: "center", fontSize: "0.9rem" }}
            >
              Próximo aluno...
            </Typography>
            <LinearProgress color="inherit" sx={{ opacity: 0.7 }} />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Button
              ref={chooseButtonRef}
              onClick={handleSortStudent} 
              variant="outlined"
              disabled={enrolledStudents.length === 0}
              sx={{
                color: "#fff",
                borderColor: "rgba(255, 255, 255, 0.4)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderColor: "#fff",
                },
                py: 1,
                px: 2,
                fontSize: "0.9rem",
              }}
              endIcon={<ArrowDropDownIcon />}
            >
              Escolher aluno
            </Button>

            <IconButton
              onClick={() => onEyeToggle(!eyeOpen)}
              sx={{
                color: "#fff",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
              title={eyeOpen ? "Ocultar respostas" : "Mostrar respostas"}
            >
              {eyeOpen ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Box>
        )}
      </Box>

      <Popper
        open={menuOpen}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1500 }}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 5],
            },
          },
        ]}
      >
        <Paper
          ref={popperRef}
          sx={{
            width: "300px",
            maxHeight: "400px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Box>
            <Box
              sx={{
                p: 1.5,
                position: "sticky",
                top: 0,
                backgroundColor: "white",
                zIndex: 2,
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <TextField
                placeholder="Buscar aluno..."
                fullWidth
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={onSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onCloseMenu();
                }}
              />
            </Box>

            <Box
              sx={{
                maxHeight: "300px",
                overflow: "auto",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#9041c1",
                  borderRadius: "3px",
                },
              }}
            >
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <Box
                    key={student.userId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      "&:last-child": {
                        borderBottom: "none",
                      },
                    }}
                  >
                    <Button
                      sx={{
                        py: 1.5,
                        px: 2,
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        textAlign: "left",
                        color: "text.primary",
                        borderRadius: 0,
                        "&:hover": {
                          backgroundColor: "rgba(144, 65, 193, 0.1)",
                        },
                      }}
                      onClick={() => onSelectStudent(student, isCustomMode)} 
                      disabled={student.disabled}
                    >
                      <Avatar
                        src={student.photoURL}
                        sx={{
                          mr: 2,
                          bgcolor: "#9041c1",
                          width: 35,
                          height: 35,
                          fontSize: 14,
                        }}
                      >
                        {student.initials}
                      </Avatar>
                      <Typography
                        sx={{
                          flex: 1,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {student.name}
                      </Typography>
                    </Button>
                    <IconButton
                      sx={{ mr: 1 }}
                      onClick={() => onAbleStudent(student)}
                    >
                      {student.disabled ? (
                        <AddCircleOutlineIcon
                          fontSize="small"
                          sx={{ color: "green" }}
                        />
                      ) : (
                        <RemoveCircleOutlineIcon
                          fontSize="small"
                          sx={{ color: "red" }}
                        />
                      )}
                    </IconButton>
                  </Box>
                ))
              ) : (
                <Box sx={{ py: 2, px: 2, color: "text.secondary" }}>
                  {searchTerm
                    ? "Nenhum aluno encontrado"
                    : loading
                    ? "Carregando alunos..."
                    : "Nenhum aluno disponível"}
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Popper>
    </Box>
  );
};

export default StudentSelector;
