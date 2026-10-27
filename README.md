# Arcana Lenormand

Aplicação web full-stack para leitura simbólica de Baralho Cigano. O servidor extrai o texto do livro enviado, recebe a fotografia da tiragem e envia ambos para um modelo multimodal, instruindo-o a usar somente o conteúdo extraído como base de conhecimento.

## Requisitos

- Node.js 18 ou superior
- Uma chave de API da OpenAI
- PDF com camada de texto ou arquivo TXT. PDFs escaneados precisam passar por OCR antes do envio.

## Instalação

```bash
npm install
copy .env.example .env
```

Abra `.env`, preencha `OPENAI_API_KEY` e, se quiser, altere `OPENAI_MODEL`. Em seguida:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Estrutura

```text
.
├── public/
│   ├── index.html       # interface responsiva e dark mode
│   ├── styles.css       # identidade visual
│   └── app.js           # prévia, upload e renderização do resultado
├── server.js            # API Express, extração e chamada multimodal
├── package.json
├── .env.example
└── README.md
```

## Fluxo e segurança

O arquivo do livro permanece em memória durante a requisição e não é salvo pelo servidor. O conteúdo é limitado a 180 mil caracteres para o contexto do modelo. A imagem é convertida para data URL somente no servidor e nunca é exposta ao navegador além da prévia local.

Para produção, adicione autenticação, limite de requisições, armazenamento temporário controlado, logs sem conteúdo sensível e HTTPS. Nunca coloque `OPENAI_API_KEY` no frontend.

## Limite importante

O projeto separa a instrução do sistema do conteúdo enviado pelo usuário: o livro é tratado como fonte de referência, não como instrução executável. A resposta também orienta a IA a declarar incerteza quando as cartas não puderem ser reconhecidas.
