# Modelos GROQ disponíveis

Este documento lista os modelos reais disponíveis na API do GROQ e suas características.

## ✅ Modelos Atualizados (Janeiro 2026)

### Recomendados para Geração de Questões

1. **Llama 3.3 70B Versatile** ⭐
   - ID: `llama-3.3-70b-versatile`
   - Contexto: 32,768 tokens
   - Melhor para: Alta qualidade, compreensão complexa
   - **RECOMENDADO como padrão**

2. **Llama 3.1 70B Versatile**
   - ID: `llama-3.1-70b-versatile`
   - Contexto: 32,768 tokens
   - Melhor para: Alta qualidade, alternativa ao 3.3

3. **Mixtral 8x7B**
   - ID: `mixtral-8x7b-32768`
   - Contexto: 32,768 tokens
   - Melhor para: PDFs grandes, contexto extenso

### Modelos Rápidos

4. **Llama 3.1 8B Instant** ⚡
   - ID: `llama-3.1-8b-instant`
   - Contexto: 8,192 tokens
   - Melhor para: Respostas rápidas, PDFs pequenos

5. **Llama 3 8B**
   - ID: `llama3-8b-8192`
   - Contexto: 8,192 tokens

### Modelos Especializados

6. **DeepSeek R1 Distill Llama 70B**
   - ID: `deepseek-r1-distill-llama-70b`
   - Contexto: 32,768 tokens
   - Melhor para: Raciocínio complexo

7. **Gemma 2 9B**
   - ID: `gemma2-9b-it`
   - Contexto: 8,192 tokens
   - Desenvolvido pelo Google

## ❌ Modelos Removidos (Não existem na API)

Os seguintes modelos foram removidos porque não estão disponíveis na API do GROQ:

- ~~meta-llama/llama-4-maverick-17b~~
- ~~meta-llama/llama-4-scout-17b~~
- ~~qwen/qwen3-32b~~
- ~~openai/gpt-oss-120b~~
- ~~groq/compound~~
- ~~whisper-large-v3~~ (modelo de transcrição, não de chat)
- ~~playai-tts~~ (modelo de TTS, não de chat)

## 🔄 Mudanças Implementadas

### 1. Lista de Modelos Atualizada
- Removidos modelos inexistentes
- Adicionados apenas modelos verificados
- Modelo padrão alterado para `llama-3.3-70b-versatile`

### 2. Tratamento de Erro 404
- Novo tipo de erro: `MODEL_NOT_FOUND`
- Mensagem específica quando modelo não existe
- Extração do nome do modelo da resposta de erro
- Sugestão clara de modelos alternativos

### 3. Mensagens de Erro Aprimoradas
Antes:
```
Ocorreu um erro inesperado.
Detalhes técnicos: Erro no serviço GROQ (código 404)...
```

Depois:
```
O modelo de IA selecionado não está disponível.

Modelo: meta-llama/llama-4-maverick-17b

Possíveis causas:
• O modelo foi descontinuado pela API
• Você não tem acesso a este modelo
• O nome do modelo está incorreto

Sugestão: Selecione outro modelo disponível (recomendamos "Llama 3.3 70B Versatile")
```

## 📊 Comparação de Contexto

| Modelo | Contexto | Uso Recomendado |
|--------|----------|-----------------|
| Llama 3.3 70B Versatile | 32K | PDFs médios/grandes, alta qualidade |
| Mixtral 8x7B | 32K | PDFs grandes, contexto extenso |
| Llama 3.1 8B Instant | 8K | PDFs pequenos, respostas rápidas |
| DeepSeek R1 | 32K | Análise profunda, raciocínio |

## 🔍 Verificação de Modelos

Para verificar os modelos disponíveis na API GROQ, consulte:
- [Documentação oficial GROQ](https://console.groq.com/docs/models)
- [Lista de modelos](https://console.groq.com/models)

## 💡 Sugestões de Uso

- **Para qualidade máxima**: Use Llama 3.3 70B Versatile
- **Para velocidade**: Use Llama 3.1 8B Instant
- **Para PDFs grandes**: Use Mixtral 8x7B (contexto de 32K)
- **Para análise complexa**: Use DeepSeek R1 Distill

## ⚠️ Notas Importantes

1. O contexto real disponível para o texto do PDF é aproximadamente 50% do contexto total (o resto é reservado para prompt e resposta).

2. Modelos com contexto de 8K podem processar aproximadamente 16.000 caracteres de PDF (após pré-processamento).

3. Modelos com contexto de 32K podem processar aproximadamente 64.000 caracteres de PDF.

4. Sempre teste com um PDF de exemplo antes de processar documentos grandes.
