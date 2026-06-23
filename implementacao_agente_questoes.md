# Integracao da Plataforma com a Question Generator API

Este documento descreve como a plataforma deve integrar o novo gerador de perguntas hospedado nesta VM.

A regra principal e: **a nova API deve ser a primeira opcao de geracao**. O servico atual que chama a API da GROQ deve continuar existindo e deve ser mantido como fallback. Nao apagar, sobrescrever ou remover a integracao GROQ atual.

## Estado atual da API nesta VM

Servico local configurado:

- Nome do servico: `question-api.service`
- Porta interna: `8000`
- Host do Uvicorn: `0.0.0.0`
- Modelo configurado: `gpt-5.5`
- Autenticacao ChatGPT OAuth: ativa
- Token OAuth salvo em: `/home/emanuel/Documentos/gpt/.secrets/chatgpt_tokens.json`
- Chave da API do gerador: variavel `QUESTION_API_KEY` em `/home/emanuel/Documentos/gpt/.env`

URLs:

- Local na propria VM: `http://127.0.0.1:8000`
- IP privado da VM: `http://10.0.0.172:8000`
- IP publico detectado: `http://136.248.124.114:8000`

Importante: no teste final, `127.0.0.1:8000`, `10.0.0.172:8000` e `136.248.124.114:8000` responderam corretamente. A porta publica `8000` esta acessivel, mas para producao o recomendado e publicar a API por HTTPS usando dominio + Nginx/Caddy na porta `443`.

## Como testar na VM antes de passar para a plataforma

Entre na pasta do projeto:

```bash
cd /home/emanuel/Documentos/gpt
```

Verifique se o servico esta ativo:

```bash
systemctl --user status question-api.service
```

Resposta esperada: `active (running)`.

Teste o health check:

```bash
curl -sS http://127.0.0.1:8000/health
```

Resposta esperada:

```json
{
  "ok": true,
  "model": "gpt-5.5",
  "chatgpt_authenticated": true
}
```

Carregue a chave da API do `.env` para testar sem colar segredo no terminal:

```bash
set -a
source /home/emanuel/Documentos/gpt/.env
set +a
```

Teste uma geracao real:

```bash
curl -sS --max-time 180 \
  -X POST http://127.0.0.1:8000/v1/questions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $QUESTION_API_KEY" \
  -d '{
    "prompt": "Material: Fotossintese e o processo em que plantas usam luz solar, agua e gas carbonico para produzir glicose e oxigenio. A clorofila absorve energia luminosa. O processo ocorre principalmente nos cloroplastos.",
    "question_count": 2,
    "question_type": "mixed",
    "difficulty": "medium",
    "language": "pt-BR"
  }'
```

Resposta esperada: JSON com `ok: true`, `request_id`, `model`, lista `questions` e `metadata`.

Teste bloqueio sem chave:

```bash
curl -sS -X POST http://127.0.0.1:8000/v1/questions \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"teste"}'
```

Resposta esperada:

```json
{"detail":"Invalid API key."}
```

Acompanhe logs em tempo real:

```bash
journalctl --user -u question-api.service -f
```

Reinicie a API quando alterar `.env` ou codigo:

```bash
systemctl --user restart question-api.service
```

## Contrato HTTP da nova API

Endpoint principal:

```http
POST /v1/questions
```

Endpoint alias, se a plataforma preferir nome mais descritivo:

```http
POST /generate-questions
```

Headers obrigatorios:

```http
Content-Type: application/json
Authorization: Bearer <QUESTION_API_KEY>
```

Tambem aceito:

```http
X-API-Key: <QUESTION_API_KEY>
```

Payload:

```json
{
  "prompt": "Texto/material enviado pelo usuario",
  "question_count": 10,
  "question_type": "mixed",
  "difficulty": "medium",
  "language": "pt-BR",
  "extra_instructions": "Opcional: instrucoes adicionais da plataforma"
}
```

Campos:

- `prompt`: obrigatorio. Deve conter o material do usuario ja extraido em texto.
- `question_count`: opcional, padrao `10`, minimo `1`, maximo `50`.
- `question_type`: opcional. Valores recomendados: `mixed`, `multiple_choice`, `true_false`, `short_answer`, `essay`.
- `difficulty`: opcional. Valores recomendados: `easy`, `medium`, `hard`.
- `language`: opcional. Usar `pt-BR` por padrao.
- `extra_instructions`: opcional. Usar para regras especificas da plataforma, por exemplo foco em vestibular, concurso, ENEM, nivel escolar, formato pedagogico etc.

Resposta de sucesso:

```json
{
  "ok": true,
  "request_id": "uuid-da-requisicao",
  "model": "gpt-5.5",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "difficulty": "medium",
      "question": "Texto da pergunta",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Explicacao baseada no material"
    }
  ],
  "metadata": {
    "question_count": 10,
    "language": "pt-BR",
    "notes": ""
  }
}
```

Erros importantes:

- `401`: chave ausente ou invalida.
- `400`: payload invalido, por exemplo `prompt` vazio ou `question_count` fora do limite.
- `503`: OAuth do ChatGPT nao autenticado ou token indisponivel na VM.
- `502`: erro do provedor/modelo ou resposta invalida do modelo.

## Como a plataforma deve integrar sem apagar a GROQ

A plataforma deve tratar a nova Question Generator API como provider primario e manter GROQ como provider secundario.

Fluxo recomendado:

1. Usuario envia o material na plataforma.
2. Plataforma extrai/normaliza o texto do material.
3. Plataforma monta o payload no formato da nova API.
4. Plataforma chama `POST /v1/questions`.
5. Se a nova API retornar sucesso, usar essa resposta.
6. Se a nova API falhar por timeout, rede, `502` ou `503`, registrar o erro e chamar o servico GROQ existente como fallback.
7. Se o erro for `400` ou `401`, nao fazer fallback automatico sem logar como erro de configuracao/payload.
8. Plataforma normaliza a resposta para o formato que o frontend/DB ja espera.
9. Plataforma salva as questoes e mostra ao usuario.

Nao remover:

- Cliente HTTP da GROQ.
- Variaveis de ambiente da GROQ.
- Prompt atual da GROQ.
- Tratamento atual de erro da GROQ.
- Testes existentes da GROQ.

Adicionar:

- Cliente HTTP da nova Question Generator API.
- Configuracao de provider primario.
- Fallback para GROQ.
- Logs que indiquem qual provider gerou as questoes.
- Testes para sucesso na nova API.
- Testes para fallback quando a nova API falhar.

## Variaveis de ambiente recomendadas na plataforma

Adicionar no backend da plataforma:

```env
QUESTION_PROVIDER_PRIMARY=question_api
QUESTION_PROVIDER_FALLBACK=groq
QUESTION_API_BASE_URL=http://136.248.124.114:8000
QUESTION_API_KEY=<copiar o valor de QUESTION_API_KEY da VM>
QUESTION_API_TIMEOUT_MS=180000
QUESTION_API_ENABLED=true
GROQ_API_KEY=<manter a chave atual da plataforma>
```

Se a plataforma estiver na mesma rede privada da VM, pode usar:

```env
QUESTION_API_BASE_URL=http://10.0.0.172:8000
```

Se a plataforma estiver fora da rede privada, nao usar `10.0.0.172`. Nesse caso, liberar o IP publico/porta ou configurar HTTPS.

Nunca colocar `QUESTION_API_KEY` no frontend. A chamada deve sair do backend da plataforma.

## Pseudocodigo de integracao

```ts
type GenerateQuestionsInput = {
  material: string;
  questionCount?: number;
  questionType?: string;
  difficulty?: string;
  language?: string;
  extraInstructions?: string;
};

async function generateQuestions(input: GenerateQuestionsInput) {
  try {
    const primary = await callQuestionApi({
      prompt: input.material,
      question_count: input.questionCount ?? 10,
      question_type: input.questionType ?? 'mixed',
      difficulty: input.difficulty ?? 'medium',
      language: input.language ?? 'pt-BR',
      extra_instructions: input.extraInstructions,
    });

    return normalizeQuestionApiResponse(primary);
  } catch (error) {
    logProviderFailure('question_api', error);

    if (shouldFallbackToGroq(error)) {
      const groq = await callExistingGroqService(input);
      return normalizeGroqResponse(groq);
    }

    throw error;
  }
}
```

Regra para fallback:

```ts
function shouldFallbackToGroq(error: unknown) {
  const status = getHttpStatus(error);
  return status === 502 || status === 503 || status === 504 || isNetworkError(error) || isTimeout(error);
}
```

Nao fazer fallback silencioso em `401`, porque isso significa chave errada. Nao fazer fallback silencioso em `400`, porque isso significa payload errado.

## Exemplo de chamada em backend Node/TypeScript

```ts
export async function callQuestionApi(payload: {
  prompt: string;
  question_count?: number;
  question_type?: string;
  difficulty?: string;
  language?: string;
  extra_instructions?: string;
}) {
  const baseUrl = process.env.QUESTION_API_BASE_URL;
  const apiKey = process.env.QUESTION_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('QUESTION_API_BASE_URL ou QUESTION_API_KEY ausente');
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.QUESTION_API_TIMEOUT_MS ?? 180000),
  );

  try {
    const response = await fetch(`${baseUrl}/v1/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(`Question API failed with ${response.status}`);
      Object.assign(error, { status: response.status, data });
      throw error;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
```

## Normalizacao da resposta

A logica de criacao, retorno, normalizacao e salvamento das questoes deve seguir **tal qual a plataforma funciona hoje**. Esta API nao deve impor um formato novo ao banco ou ao frontend se a plataforma ja possui um contrato interno estabelecido.

A plataforma deve documentar o formato real que ela usa hoje e, se necessario, este agente/API sera ajustado para devolver exatamente esse formato. Ate esse ajuste acontecer, a plataforma deve converter a resposta desta API no mesmo ponto em que hoje converte a resposta da GROQ.

Obrigatorio preservar:

- A forma como a plataforma define quantidade e tipo de questoes.
- A forma como a plataforma representa alternativas.
- A forma como a plataforma identifica resposta correta.
- A forma como a plataforma salva questoes, alternativas, resposta e explicacao no banco.
- A forma como o frontend espera receber as questoes.
- A regra atual de associar questoes ao usuario, aula, material, curso ou entidade equivalente.

Se hoje a resposta da GROQ ja e transformada antes de salvar no banco, reaproveitar o mesmo ponto de normalizacao. Nao criar um segundo formato paralelo sem necessidade.

Mapeamento inicial sugerido:

- `questions[].question` -> enunciado da questao.
- `questions[].options` -> alternativas.
- `questions[].correct_answer` -> resposta correta.
- `questions[].explanation` -> justificativa/comentario.
- `questions[].type` -> tipo da questao.
- `questions[].difficulty` -> dificuldade.
- `request_id` -> guardar em logs/auditoria.
- `model` -> guardar como provider metadata.

Se o banco atual nao tiver campo para `explanation`, decidir se cria o campo ou se ignora temporariamente.



### Compatibilidade obrigatoria com a plataforma

O documento da plataforma deve deixar claro qual e o contrato canonico de questoes. Esse contrato canonico e a fonte da verdade. Se houver divergencia entre o JSON retornado por esta API e o formato que a plataforma usa para salvar/exibir questoes, a integracao deve fazer uma destas duas coisas:

1. Adaptar a resposta no backend da plataforma antes de salvar.
2. Solicitar ajuste deste agente/API para retornar no formato canonico da plataforma.

A decisao deve ser explicita. Nao deixar o frontend, o banco e o gerador com formatos diferentes sem um normalizador claro.

## Checklist de alteracao na plataforma

1. Localizar o servico atual que chama GROQ.
2. Criar um cliente separado para `QuestionGeneratorApiClient`.
3. Nao alterar o cliente GROQ existente, exceto se for necessario encaixar fallback.
4. Criar uma camada de orquestracao, por exemplo `QuestionGenerationService`.
5. Configurar `QuestionGenerationService` para tentar `question_api` primeiro.
6. Em falha recuperavel, chamar o provider GROQ atual.
7. Preservar o formato final que o restante da plataforma ja espera.
8. Adicionar logs com provider usado: `question_api` ou `groq`.
9. Adicionar timeout de ate `180000ms` para a nova API.
10. Garantir que `QUESTION_API_KEY` fique apenas no backend.
11. Adicionar teste unitario do caminho feliz com a nova API.
12. Adicionar teste unitario de fallback para GROQ.
13. Adicionar teste de erro `401` sem fallback.
14. Adicionar teste de payload invalido `400` sem fallback.
15. Testar em staging antes de producao.

## O que a plataforma deve documentar para este agente poder adequar o lado da VM

A plataforma deve criar um documento proprio explicando como ela funciona hoje. Esse documento deve ser entregue junto com qualquer pedido futuro de ajuste neste agente/API, porque sem isso o agente deste lado fica obrigado a adivinhar contratos, formatos e fluxos.

Nome sugerido do documento na plataforma:

```txt
DOCUMENTACAO_FUNCIONAMENTO_GERACAO_QUESTOES.md
```

Esse documento da plataforma deve explicar, no minimo:

1. Stack usada: framework, linguagem, versao do runtime e gerenciador de pacotes.
2. Onde fica o codigo que recebe o prompt/material do usuario.
3. Onde fica o servico atual que chama GROQ.
4. Quais arquivos devem ser alterados para trocar/adicionar provider de IA.
5. Formato exato do payload que o frontend envia ao backend.
6. Formato exato que o backend espera receber do gerador de perguntas.
7. Formato exato salvo no banco de dados.
8. Estrutura das tabelas ou modelos relacionados a perguntas, alternativas e respostas.
9. Como o material do usuario chega: texto puro, PDF, arquivo, URL, HTML, transcricao etc.
10. Onde e como o texto do material e extraido antes de chamar a IA.
11. Prompt atual usado com GROQ.
12. Modelo GROQ atual e parametros usados, como temperatura, max tokens e timeout.
13. Como a plataforma trata erros da GROQ hoje.
14. Como a plataforma mostra erro para o usuario.
15. Se a geracao e sincrona, por fila, job/background worker ou webhook.
16. Limite atual de tamanho do material enviado pelo usuario.
17. Limite atual de quantidade de questoes por requisicao.
18. Regras pedagogicas atuais, se houver.
19. Como autentica usuarios e como vincula uma geracao ao usuario/aula/material.
20. Onde ficam as variaveis de ambiente em desenvolvimento, staging e producao.
21. Como fazer deploy da plataforma.
22. Como rodar testes da plataforma.
23. Como observar logs da geracao em producao.
24. Exemplo real de requisicao recebida do frontend.
25. Exemplo real de resposta esperada pelo frontend.
26. Exemplo real de resposta atual da GROQ antes da normalizacao.
27. Exemplo real de objeto final salvo no banco.

Com esse documento, se for necessario adequar o agente deste lado, sera possivel ajustar:

- Campos de entrada aceitos pela API.
- Schema de resposta.
- Tipo de questao.
- Idioma e dificuldade.
- Prompt interno.
- Quantidade maxima de questoes.
- Formato de alternativas.
- Formato de resposta correta.
- Metadados exigidos pela plataforma.
- Compatibilidade com o normalizador atual da plataforma.

## Criterios de aceite antes de liberar para usuarios

A integracao esta pronta quando:

- `GET /health` retorna `chatgpt_authenticated: true`.
- Plataforma consegue chamar `/v1/questions` do ambiente dela.
- Nova API e usada primeiro.
- GROQ continua funcionando como fallback.
- Erro `401` nao cai em fallback silencioso.
- Erro `400` nao cai em fallback silencioso.
- Logs mostram qual provider foi usado.
- Frontend recebe o mesmo formato que ja espera ou foi ajustado conscientemente.
- A chave `QUESTION_API_KEY` nao aparece no frontend.
- Porta publica ou HTTPS foi configurado para acesso externo.

## Comandos operacionais da API

Status:

```bash
systemctl --user status question-api.service
```

Restart:

```bash
systemctl --user restart question-api.service
```

Logs:

```bash
journalctl --user -u question-api.service -f
```

Health:

```bash
curl -sS http://127.0.0.1:8000/health
```

Ver porta escutando:

```bash
ss -tulpn | grep 8000
```



## Como liberar o IP publico na Oracle Cloud

Esta VM esta na Oracle Cloud Infrastructure, regiao `sa-saopaulo-1`, com IP privado `10.0.0.172` e IP publico detectado `136.248.124.114`.

A API ja esta escutando corretamente dentro da VM em `0.0.0.0:8000`. Se `curl http://127.0.0.1:8000/health` funciona, mas `curl http://136.248.124.114:8000/health` da timeout, o bloqueio esta antes da aplicacao: regra da Oracle Cloud, firewall local da VM, ou ambos.

### 1. Liberar porta 8000 na Oracle Cloud

No painel da Oracle Cloud:

1. Acesse `Compute` > `Instances`.
2. Abra a instancia `mentoriavm`.
3. Em `Instance details`, abra a VNIC primaria ou a subnet associada.
4. Verifique se a VNIC usa `Network Security Groups`.
5. Se houver NSG, adicione a regra de entrada no NSG.
6. Se nao houver NSG, abra a `Subnet` e depois a `Security List` associada.
7. Adicione uma regra `Ingress` com:
   - Source CIDR: IP publico da plataforma, se souber; caso contrario `0.0.0.0/0` temporariamente.
   - IP Protocol: `TCP`
   - Source Port Range: deixar vazio ou `All`
   - Destination Port Range: `8000`
   - Description: `Question Generator API`
8. Salve a regra.

Mais seguro: em vez de `0.0.0.0/0`, use somente o IP publico do backend da plataforma. Exemplo:

```txt
203.0.113.10/32
```

Use `0.0.0.0/0` apenas se a API precisar ser acessivel por qualquer origem ou enquanto estiver testando.

### 2. Liberar firewall local da VM, se necessario

Depois de liberar na OCI, teste de fora da VM:

```bash
curl -sS --max-time 10 http://136.248.124.114:8000/health
```

Se continuar timeout, rode na VM:

```bash
sudo iptables -L INPUT -n --line-numbers
```

Se existir uma regra `REJECT` ou `DROP` antes da porta `8000`, libere a porta antes dela:

```bash
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
```

Teste novamente:

```bash
curl -sS --max-time 10 http://136.248.124.114:8000/health
```

Para persistir a regra apos reboot, use uma das opcoes abaixo conforme a VM tiver instalado.

Com `netfilter-persistent`:

```bash
sudo netfilter-persistent save
```

Se o comando nao existir:

```bash
sudo apt update
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Se a VM usar UFW:

```bash
sudo ufw allow 8000/tcp
sudo ufw status
```

Nesta VM, o comando `which ufw` nao encontrou UFW instalado no momento do teste.

### 3. Interpretar o resultado dos testes

- `curl http://127.0.0.1:8000/health` funciona: aplicacao esta viva localmente.
- `curl http://10.0.0.172:8000/health` funciona: aplicacao escuta na rede privada.
- `curl http://136.248.124.114:8000/health` da timeout: firewall/security group/NAT bloqueando.
- `curl http://136.248.124.114:8000/health` da connection refused: porta chegou na VM, mas servico nao esta escutando.
- `curl http://136.248.124.114:8000/health` retorna JSON: acesso publico resolvido.

### 4. Recomendacao para producao

A solucao mais limpa para producao e publicar por HTTPS:

```txt
https://api.seudominio.com/v1/questions
```

Nesse caso, libere portas `80` e `443` na OCI, instale Nginx ou Caddy na VM e encaminhe para `127.0.0.1:8000`. A plataforma passa a chamar HTTPS em vez de `http://IP:8000`.



## HTTPS agora

Para HTTPS valido em producao, e necessario ter um dominio ou subdominio apontando para o IP publico da VM. Exemplo:

```txt
api-questoes.seudominio.com -> 136.248.124.114
```

Nao e recomendado depender de HTTPS direto no IP, porque certificados publicos confiaveis normalmente sao emitidos para dominios, nao para IPs. Certificado autoassinado ate funciona tecnicamente, mas a plataforma/cliente HTTP pode rejeitar a conexao e isso nao deve ser usado como integracao principal.

Checklist para ativar HTTPS com Caddy:

1. Criar um registro DNS `A` apontando o subdominio para `136.248.124.114`.
2. Liberar portas TCP `80` e `443` na Oracle Cloud.
3. Instalar Caddy na VM.
4. Configurar reverse proxy do dominio para `127.0.0.1:8000`.
5. Trocar `QUESTION_API_BASE_URL` da plataforma para `https://api-questoes.seudominio.com`.

Exemplo de Caddyfile:

```caddyfile
api-questoes.seudominio.com {
    reverse_proxy 127.0.0.1:8000
}
```

Depois de configurar HTTPS, a plataforma deve usar:

```env
QUESTION_API_BASE_URL=https://api-questoes.seudominio.com
```

Enquanto nao houver dominio, a integracao pode continuar em HTTP com `QUESTION_API_KEY`, mas a chave deve ficar exclusivamente no backend da plataforma.

## Observacao sobre HTTPS

Para producao, o ideal e nao chamar `http://IP:8000` diretamente. O recomendado e publicar com HTTPS, por exemplo:

```txt
https://api.seudominio.com/v1/questions
```

Nginx ou Caddy podem receber na porta `443` e encaminhar para `127.0.0.1:8000`. Isso evita problemas de mixed content no navegador e melhora seguranca operacional.
