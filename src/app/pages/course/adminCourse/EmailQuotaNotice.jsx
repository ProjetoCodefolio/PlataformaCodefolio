import { useEffect, useState } from "react";
import { Alert } from "@mui/material";
import { fetchDeferredEmailCount } from "$api/services/emailService";

/**
 * Avisa o professor quando avisos por e-mail do curso ficaram esperando a cota
 * diária do provedor. A fila reentrega sozinha, mas só no dia seguinte — sem
 * esta faixa o professor sai da tela achando que a turma já foi avisada.
 */
const EmailQuotaNotice = ({ courseId }) => {
  const [deferred, setDeferred] = useState(0);

  useEffect(() => {
    if (!courseId) return undefined;
    let cancelled = false;
    fetchDeferredEmailCount(courseId).then((count) => {
      if (!cancelled) setDeferred(count);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!deferred) return null;

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {deferred === 1
        ? "1 aviso por e-mail ficou na fila por causa do limite diário e sai amanhã. A notificação no app já foi entregue."
        : `${deferred} avisos por e-mail ficaram na fila por causa do limite diário e saem amanhã. As notificações no app já foram entregues.`}
    </Alert>
  );
};

export default EmailQuotaNotice;
