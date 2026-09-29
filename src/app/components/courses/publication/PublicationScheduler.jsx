import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { buildPublicationSchedule, isScheduled } from "$api/services/courses/publication";
import PublishAtField from "./PublishAtField";

const ROXO = "#9041c1";

const mesmoConjunto = (a, b) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Estado da programação em série de uma importação: os parâmetros do intervalo
 * e a data de cada item. As datas geradas são só um PREENCHIMENTO: o professor
 * pode mudar qualquer uma depois, ou nem usar o intervalo e digitar na mão.
 */
export function usePublicationSchedule() {
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState("");
  const [intervalDays, setIntervalDays] = useState(7);
  const [perSlot, setPerSlot] = useState(1);
  const [datesById, setDatesById] = useState({});
  // Itens cuja data o professor digitou depois de aplicar: aplicar de novo
  // sobrescreveria trabalho dele, então pede confirmação.
  const [editadosAMao, setEditadosAMao] = useState([]);
  const [aplicadoPara, setAplicadoPara] = useState(null);
  const [confirmandoSobrescrita, setConfirmandoSobrescrita] = useState(false);

  const reset = () => {
    setEnabled(false);
    setStart("");
    setIntervalDays(7);
    setPerSlot(1);
    setDatesById({});
    setEditadosAMao([]);
    setAplicadoPara(null);
    setConfirmandoSobrescrita(false);
  };

  /**
   * Preenche as datas dos ids, na ordem recebida (a ordem de publicação).
   * Com datas editadas à mão no caminho, o primeiro clique só pede confirmação.
   */
  const apply = (orderedIds, { force = false } = {}) => {
    const sobrescreveria = editadosAMao.filter((id) => orderedIds.includes(id));
    if (sobrescreveria.length > 0 && !force) {
      setConfirmandoSobrescrita(true);
      return;
    }
    const geradas = buildPublicationSchedule(orderedIds, { start, intervalDays, perSlot });
    setDatesById((anterior) => ({ ...anterior, ...geradas }));
    setEditadosAMao((anterior) => anterior.filter((id) => !orderedIds.includes(id)));
    setAplicadoPara(orderedIds);
    setConfirmandoSobrescrita(false);
  };

  const setDateFor = (id, iso) => {
    setDatesById((anterior) => ({ ...anterior, [id]: iso }));
    setEditadosAMao((anterior) => (anterior.includes(id) ? anterior : [...anterior, id]));
  };

  /** Data a gravar para o item: `undefined` quando a programação está desligada. */
  const publishAtFor = (id) => (enabled ? datesById[id] || "" : undefined);

  const selecaoMudou = (orderedIds) =>
    enabled && aplicadoPara !== null && !mesmoConjunto(aplicadoPara, orderedIds);

  return {
    enabled,
    setEnabled,
    start,
    setStart,
    intervalDays,
    setIntervalDays,
    perSlot,
    setPerSlot,
    datesById,
    setDateFor,
    publishAtFor,
    apply,
    selecaoMudou,
    confirmandoSobrescrita,
    cancelarSobrescrita: () => setConfirmandoSobrescrita(false),
    reset,
  };
}

const campoNumerico = {
  width: 120,
  "& .MuiOutlinedInput-root.Mui-focused fieldset": { borderColor: ROXO },
  "& .MuiInputLabel-root.Mui-focused": { color: ROXO },
};

/**
 * Painel "Programar publicação" da importação: liga a programação e preenche
 * as datas dos itens selecionados em série (primeira data, intervalo em dias e
 * quantos itens saem por vez).
 *
 * @param {Object} props
 * @param {ReturnType<typeof usePublicationSchedule>} props.schedule
 * @param {string[]} props.orderedIds - selecionados, na ordem de publicação
 * @param {boolean} [props.disabled]
 */
export default function PublicationScheduler({ schedule, orderedIds, disabled = false }) {
  const semData = orderedIds.filter((id) => !isScheduled(schedule.datesById[id])).length;

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: schedule.enabled ? ROXO : "#e0e0e0",
        backgroundColor: schedule.enabled ? "rgba(144, 65, 193, 0.04)" : "transparent",
      }}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={schedule.enabled}
            onChange={(e) => schedule.setEnabled(e.target.checked)}
            disabled={disabled}
            sx={{ color: ROXO, "&.Mui-checked": { color: ROXO } }}
          />
        }
        label={<Typography sx={{ fontWeight: 500 }}>Programar publicação</Typography>}
      />
      <Typography variant="caption" sx={{ display: "block", ml: 4, color: "#666" }}>
        Os itens ficam ocultos para os alunos até a data de cada um, e ninguém é avisado na
        importação.
      </Typography>

      {schedule.enabled && (
        <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <PublishAtField
            label="Primeira publicação"
            size="small"
            value={schedule.start}
            onChange={schedule.setStart}
            clearable={false}
            helperText="Data e hora em que sai o primeiro item selecionado."
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            <TextField
              label="Intervalo (dias)"
              type="number"
              size="small"
              value={schedule.intervalDays}
              onChange={(e) => schedule.setIntervalDays(e.target.value)}
              inputProps={{ min: 0 }}
              sx={campoNumerico}
            />
            <TextField
              label="Itens por vez"
              type="number"
              size="small"
              value={schedule.perSlot}
              onChange={(e) => schedule.setPerSlot(e.target.value)}
              inputProps={{ min: 1 }}
              sx={campoNumerico}
            />
            <Button
              variant="outlined"
              size="small"
              disabled={disabled || !schedule.start || orderedIds.length === 0}
              onClick={() => schedule.apply(orderedIds)}
              sx={{ textTransform: "none", color: ROXO, borderColor: ROXO }}
            >
              Aplicar aos selecionados
            </Button>
          </Box>

          {schedule.confirmandoSobrescrita && (
            <Alert
              severity="warning"
              action={
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Button color="inherit" size="small" onClick={schedule.cancelarSobrescrita}>
                    Manter
                  </Button>
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => schedule.apply(orderedIds, { force: true })}
                  >
                    Sobrescrever
                  </Button>
                </Box>
              }
            >
              Você editou datas à mão depois de aplicar. Aplicar de novo sobrescreve essas datas.
            </Alert>
          )}

          {schedule.selecaoMudou(orderedIds) && (
            <Alert severity="info">
              A seleção mudou depois que as datas foram aplicadas. Aplique de novo para recalcular
              a série, ou ajuste as datas item a item.
            </Alert>
          )}

          <Typography variant="caption" sx={{ color: "#666" }}>
            Dá para ajustar a data de cada item na lista abaixo.
            {semData > 0 &&
              ` ${
                semData === 1
                  ? "1 item selecionado está sem data futura e aparece"
                  : `${semData} itens selecionados estão sem data futura e aparecem`
              } para os alunos assim que importar.`}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
