# Detecção de Idioma - Documentação

## 🌍 Visão Geral

O bot Arcadius agora detecta automaticamente o idioma do usuário (Francês ou Inglês) e responde no mesmo idioma em que foi mencionado.

## 📋 Como Funciona

### Detecção de Idioma

O módulo `languageDetector.js` usa análise de padrões para detectar o idioma:

1. **Palavras Comuns**: Verifica se as palavras utilizadas são típicas do francês ou inglês
2. **Padrões Linguísticos**: Detecta estruturas gramaticais específicas de cada idioma
3. **Caracteres Especiais**: Acentos e caracteres especiais franceses (é, è, ê, à, ç, etc.)
4. **Heurísticas de Pontuação**: Analisa o padrão de pontuação

### Limiar de Confiança

- O sistema usa um limiar de diferença mínima de 5 pontos entre as pontuações
- Se nenhum idioma for claramente detectado, usa **francês como padrão**

### Aplicação das Respostas

#### 1. **Mensagens Mencionadas** (arcadiusMessageHandler.js)

- Quando o bot é mencionado, a detecção ocorre automaticamente
- O prompt do LLM inclui uma instrução de idioma
- As instruções de formatação são ajustadas ao idioma detectado

```javascript
// Exemplo de instrução de idioma para inglês:
"You MUST respond in English, using the same language as the user.";

// Exemplo para francês:
"Tu DOIS répondre en français, en utilisant la même langue que l'utilisateur.";
```

#### 2. **Detecção de Ajuda** (helpDetectionHandler.js)

- O mesmo processo se aplica às respostas de ajuda automáticas
- Respostas em canais de suporte são geradas no idioma do usuário

## 🔧 Arquivos Modificados

### Novos Arquivos

- **modules/languageDetector.js** - Módulo de detecção de idioma

### Arquivos Modificados

- **modules/promptBuilder.js** - Integra detecção de idioma no prompt
- **modules/helpDetectionHandler.js** - Aplica detecção de idioma às respostas de ajuda

## 🚀 Funções Principais

### `detectLanguage(text: string): string`

Detecta o idioma do texto fornecido.

**Retorna:**

- `'fr'` - Francês detectado
- `'en'` - Inglês detectado
- `'unknown'` - Idioma não detectado (padrão: francês)

**Exemplo:**

```javascript
const { detectLanguage } = require("./modules/languageDetector");

const lang = detectLanguage("Hello, how are you?");
console.log(lang); // 'en'

const lang2 = detectLanguage("Bonjour, comment allez-vous?");
console.log(lang2); // 'fr'
```

### `getLanguageInstruction(detectedLanguage: string): string`

Retorna a instrução de idioma para o prompt do LLM.

**Exemplo:**

```javascript
const instruction = getLanguageInstruction("en");
// "You MUST respond in English, using the same language as the user."
```

### `getFormatInstructions(detectedLanguage: string): array`

Retorna instruções de formatação específicas do idioma.

**Exemplo:**

```javascript
const format = getFormatInstructions("en");
// ["- English only.", "- Concise.", "- Raw links (https://...) only.", ...]
```

## 📊 Palavras-Chave Utilizadas

### Francês

Inclui palavras como: le, la, les, de, du, des, et, ou, mais, un, une, etc.
Também detecta padrões como "c'est", "qu'", "l'", etc.

### Inglês

Inclui palavras como: the, a, an, and, or, but, not, my, your, etc.
Também detecta padrões como "-ing", "-ed", "-ly", "th+", etc.

## ⚙️ Configuração

O sistema funciona automaticamente sem necessidade de configuração adicional.
As respostas do LLM incluem agora:

```
--- LANGUE ---
Tu DOIS répondre en français, en utilisant la même langue que l'utilisateur.

--- FORMAT ---
- Français uniquement.
- Concis.
- Liens en BRUT (https://...) uniquement.
- NE JAMAIS inventer de lien. Utiliser UNIQUEMENT les liens fournis dans le contexte.
```

## 🧪 Exemplos de Uso

### Mensagem em Inglês

```
User: @Arcadius How do I install the mod?
Bot: [Responds in English]
```

### Mensagem em Francês

```
User: @Arcadius Comment installer le mod?
Bot: [Répond en français]
```

### Detecção de Ajuda

```
User: I'm having trouble with the launcher (em um canal de support)
Help System: [Responde em inglês]

User: J'ai un problème avec le launcher (em um canal de support)
Help System: [Répond en français]
```

## 📝 Notas Importantes

1. **Precisão da Detecção**: O sistema usa heurísticas e não é 100% preciso. Para mensagens muito curtas, pode haver erros.

2. **Idiomas Suportados**: Atualmente, apenas francês e inglês são suportados. Outros idiomas resultarão em respostas em francês (idioma padrão).

3. **Prompts do LLM**: Os prompts incluem instruções explícitas sobre o idioma para melhorar a precisão das respostas.

4. **Caracteres Especiais**: A detecção de acentos franceses é um forte indicador de francês.

## 🔍 Debugging

Para verificar a detecção de idioma em tempo real, você pode adicionar logs no seu código:

```javascript
const { detectLanguage } = require("./modules/languageDetector");
const lang = detectLanguage(message.content);
console.log(`Detected language: ${lang}`);
```

## 📚 Referências

- [Módulo Language Detector](../modules/languageDetector.js)
- [Prompt Builder](../modules/promptBuilder.js)
- [Help Detection Handler](../modules/helpDetectionHandler.js)
