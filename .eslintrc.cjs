/* eslint-env node */

// Configuração do ESLint. O projeto já tinha o script `npm run lint` e os
// plugins instalados, mas nenhum arquivo de configuração — o comando abortava
// com "couldn't find a configuration file" e ninguém era avisado. Sem ele
// passaram despercebidos erros que o `no-undef` pega de primeira, como um
// setter de estado inexistente e funções usando `ref`/`database` sem import.
//
// A régua é: o que quebra em execução é `error`; o que é sinal de alerta e
// exige julgamento caso a caso é `warn`.
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", ".firebase", "public"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "detect" } },
  plugins: ["react-refresh"],
  rules: {
    // O projeto não usa PropTypes de forma consistente e a checagem de tipo de
    // prop não é o objetivo aqui.
    "react/prop-types": "off",

    // Aspas e acentos em texto JSX são a norma na interface em português.
    "react/no-unescaped-entities": "off",

    // Variável não usada é ruído, não quebra — mas argumento ignorado com _ e
    // erro capturado sem uso são idiomáticos.
    "no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", caughtErrors: "none" },
    ],

    // Dependência faltando em hook costuma ser bug de verdade, mas rever cada
    // caso exige julgamento: fica como aviso, não trava o comando.
    "react-hooks/exhaustive-deps": "warn",

    "react-refresh/only-export-components": "off",
  },
};
