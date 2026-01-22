# Configuração do EmailJS para Envio de Reportes

Este guia explica como configurar o EmailJS para enviar emails automaticamente quando um reporte for criado.

## 🎯 Resumo Rápido

Você vai precisar de **3 chaves**:
1. **Service ID** - do serviço de Gmail
2. **Template ID** - do template de email
3. **Public Key** - da sua conta

Tempo total: ~10 minutos

---

## 📧 Passo 1: Criar Conta no EmailJS (GRATUITO)

1. Acesse: https://www.emailjs.com/
2. Clique em **"Sign Up"** (Cadastrar)
3. Use o email **projetocodefolio@gmail.com**
4. Confirme seu email

## 🔧 Passo 2: Adicionar Serviço de Email

1. No dashboard do EmailJS, clique em **"Email Services"**
2. Clique em **"Add New Service"**
3. Escolha **Gmail**
4. Conecte a conta **projetocodefolio@gmail.com**
5. **IMPORTANTE:** Quando aparecer a tela de permissões do Google:
   - ✅ Marque a opção **"Send email on your behalf"** (Enviar email em seu nome)
   - ✅ Aceite todas as permissões solicitadas
6. Copie o **Service ID** (algo como `service_abc123`)

## 📝 Passo 3: Criar Template de Email

1. No dashboard do EmailJS, clique em **"Email Templates"** (menu lateral esquerdo)
2. Clique no botão **"Create New Template"**
3. Você verá um editor com vários campos. Preencha assim:

### Subject (Assunto):
```
🚨 Novo Reporte #{{report_number}} - {{report_name}}
```

### Content (Conteúdo HTML):

**Cole este HTML no campo "Content" do EmailJS:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #9041c1 0%, #7d37a7 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 25px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .section {
      margin-bottom: 25px;
      padding: 15px;
      background-color: #f9f9f9;
      border-left: 4px solid #9041c1;
      border-radius: 4px;
    }
    .section-title {
      color: #9041c1;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .info-row {
      margin: 8px 0;
      padding: 5px 0;
    }
    .label {
      font-weight: bold;
      color: #666;
      display: inline-block;
      width: 150px;
    }
    .value {
      color: #333;
    }
    .message-box {
      background-color: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-top: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .btn {
      display: inline-block;
      background-color: #9041c1;
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 15px;
      font-weight: bold;
    }
    .badge {
      display: inline-block;
      background-color: #9041c1;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      margin-right: 10px;
    }

    /* Barra de cópia do link da imagem */
    .copy-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 2px solid #9041c1;
      border-radius: 8px;
      padding: 10px 12px;
      background-color: #f8f4ff;
      overflow: hidden;
    }
    .copy-link {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: monospace;
      font-size: 12px;
      color: #333;
    }
    .copy-btn {
      margin-left: auto;
      display: inline-block;
      background-color: #9041c1;
      color: #fff !important;
      padding: 8px 12px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 12px;
      white-space: nowrap;
    }
    .copy-note {
      margin-top: 8px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Novo Reporte Recebido</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">
        <span class="badge">#{{report_number}}</span>
        {{report_name}}
      </p>
    </div>

    <div class="section">
      <div class="section-title">📋 INFORMAÇÕES DO REPORTE</div>
      <div class="info-row">
        <span class="label">Tipo:</span>
        <span class="value">{{report_type}}</span>
      </div>
      <div class="info-row">
        <span class="label">Data:</span>
        <span class="value">{{date}}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💬 DESCRIÇÃO DO PROBLEMA</div>
      <div class="message-box">{{report_message}}</div>
    </div>

    <div class="section">
      <div class="section-title">👤 INFORMAÇÕES DO USUÁRIO</div>
      <div class="info-row">
        <span class="label">Nome:</span>
        <span class="value">{{user_name}}</span>
      </div>
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">{{user_email}}</span>
      </div>
      <div class="info-row">
        <span class="label">ID:</span>
        <span class="value">{{user_id}}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📚 INFORMAÇÕES DO CURSO</div>
      <div class="info-row">
        <span class="label">Curso:</span>
        <span class="value">{{course_title}}</span>
      </div>
      <div class="info-row">
        <span class="label">ID do Curso:</span>
        <span class="value">{{course_id}}</span>
      </div>
      <div class="info-row">
        <span class="label">Conteúdo:</span>
        <span class="value">{{content_title}}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔧 INFORMAÇÕES TÉCNICAS</div>
      <div class="info-row">
        <span class="label">Resolução da Tela:</span>
        <span class="value">{{screen_resolution}}</span>
      </div>
      <div class="info-row">
        <span class="label">Navegador:</span>
        <span class="value">{{user_agent}}</span>
      </div>
    </div>

    {{#has_image}}
    <div class="section">
      <div class="section-title">📸 IMAGEM ANEXADA</div>
      <div style="margin-top: 15px; padding: 20px; background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px;">
        <p style="margin: 0; color: #2e7d32; font-weight: bold;">✅ Este reporte contém uma imagem anexada</p>
      </div>

      <div style="margin-top: 16px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #333;">Clique no link abaixo para copiar o link Base64 da imagem:</p>
        <a href="{{image_viewer_url}}" style="color: #9041c1; font-weight: bold; font-size: 16px; text-decoration: underline;" target="_blank">{{image_viewer_url}}</a>
      </div>
    </div>
    {{/has_image}}

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://console.firebase.google.com/project/plataformacodefolio/database" class="btn">
        🔗 Acessar Firebase Console
      </a>
    </div>

    <div class="footer">
      <p>Este é um email automático da Plataforma Codefolio</p>
      <p>Sistema de Reportes v1.0</p>
    </div>
  </div>
</body>
</html>
```

### ✏️ Configuração dos Campos do Template:

**IMPORTANTE: Clique na aba "Settings" (Configurações) do template e configure:**

**To Email:**
- Digite: `{{to_email}}`
- ⚠️ NÃO coloque um email fixo! Deve ser a variável `{{to_email}}`

**From Name:**
- Digite: `Plataforma Codefolio`

**Reply To:**
- Digite: `{{user_email}}` (para responder direto ao usuário que fez o reporte)

**Bcc (Cópia Oculta):**
- Digite: `{{bcc_email}}`
- ⚠️ Isso enviará cópia para emanuelferreira.aluno@unipampa.edu.br e matheusciocca.aluno@unipampa.edu.br

---

**Agora volte para a aba "Content" e configure:**

**Subject (Assunto):**
- Cole: `🚨 Novo Reporte #{{report_number}} - {{report_name}}`

**Content (corpo do email):**
- Cole o HTML completo acima (todo o código HTML)
- ⚠️ Certifique-se de colar TUDO, desde `<!DOCTYPE html>` até `</html>`

4. Clique em **"Save"** no canto superior direito
5. Copie o **Template ID** que aparece no topo (algo como `template_xyz789`)
   - Você vai precisar desse ID no código!

### 💡 Dicas Importantes sobre o Template:

- ✅ **Use as variáveis exatamente como estão** - `{{report_number}}`, `{{report_name}}`, etc.
- ✅ **Não remova as chaves duplas** `{{ }}` - elas são necessárias
- ✅ **Você pode testar o template** clicando em "Test it" no EmailJS
- ✅ **Pode personalizar o design** - adicionar cores, mudar emojis, etc.
- ⚠️ **O campo "To Email" DEVE ser** `{{to_email}}` (não um email fixo)

---

## 🔑 Passo 4: Obter Public Key

1. Vá em **"Account"** → **"General"**
2. Copie a **Public Key** (algo como `abc123XYZ`)

## 💻 Passo 5: Configurar no Código

Abra o arquivo: `src/api/services/emailService.js`

Substitua as constantes:

```javascript
const EMAILJS_SERVICE_ID = 'service_abc123';  // Seu Service ID
const EMAILJS_TEMPLATE_ID = 'template_xyz789'; // Seu Template ID
const EMAILJS_PUBLIC_KEY = 'abc123XYZ';       // Sua Public Key
```

## ✅ Passo 6: Testar

1. Reinicie o servidor de desenvolvimento se necessário
2. Crie um reporte na plataforma
3. Verifique o console do navegador para ver logs
4. Verifique sua caixa de entrada (**projetocodefolio@gmail.com**)

## 📊 Limites Gratuitos

- **200 emails por mês**
- Sem necessidade de cartão de crédito
- Ilimitado para uso pessoal/pequenos projetos

## 🔍 Troubleshooting

### ❌ Erro: "Gmail_API: Request had insufficient authentication scopes"

**Solução:**
1. Vá em **Email Services** no dashboard do EmailJS
2. Clique no serviço do Gmail
3. Clique em **"Disconnect"** (Desconectar)
4. Clique em **"Connect Account"** novamente
5. Na tela de permissões do Google:
   - ✅ **MARQUE** a opção "Allow 'Send email on your behalf' permission"
   - ✅ Aceite todas as permissões
6. Salve o serviço
7. Teste novamente

### Email não chega?
1. Verifique a pasta de Spam em **projetocodefolio@gmail.com**
2. Confirme que as chaves estão corretas no código
3. Verifique o console do navegador para erros
4. Certifique-se de que o serviço do Gmail está conectado
5. Teste enviando um email de teste no EmailJS dashboard

### Erro de autenticação?
1. Desconecte e reconecte o Gmail (veja solução acima)
2. Verifique se a Public Key está correta
3. Certifique-se de dar permissão "Send email on your behalf"

## 📚 Recursos Adicionais

- Documentação: https://www.emailjs.com/docs/
- Dashboard: https://dashboard.emailjs.com/
- Suporte: https://www.emailjs.com/contact/

---

**Nota:** O sistema funciona mesmo sem configurar o EmailJS. Os reportes continuarão sendo salvos no banco de dados normalmente.
