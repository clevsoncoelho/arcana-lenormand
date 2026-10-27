const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 3000);
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 20);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function cleanBookText(text) {
  return text.replace(/\u0000/g, '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
}

async function extractBookText(file) {
  if (!file) throw new Error('Envie o livro de referência em PDF ou TXT.');
  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) {
    return cleanBookText(file.buffer.toString('utf8'));
  }
  const parsed = await pdfParse(file.buffer);
  return cleanBookText(parsed.text || '');
}

function asDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

function parseModelJson(content) {
  const raw = String(content || '').trim();
  try { return JSON.parse(raw); } catch (_) {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return JSON.parse(fenced[1]);
  const object = raw.match(/\{[\s\S]*\}/);
  if (object) return JSON.parse(object[0]);
  throw new Error('A IA retornou uma resposta fora do formato esperado.');
}

app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/interpret', upload.fields([
  { name: 'book', maxCount: 1 },
  { name: 'cardsImage', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY não configurada no servidor.' });
    const book = req.files?.book?.[0];
    const cardsImage = req.files?.cardsImage?.[0];
    if (!cardsImage) return res.status(400).json({ error: 'Envie uma foto da tiragem.' });
    if (!['image/jpeg', 'image/png'].includes(cardsImage.mimetype)) return res.status(400).json({ error: 'A imagem deve ser JPG ou PNG.' });

    const bookText = await extractBookText(book);
    if (bookText.length < 80) {
      return res.status(422).json({ error: 'Não foi possível extrair texto deste PDF. Ele parece escaneado; envie um TXT ou um PDF com OCR/camada de texto.' });
    }
    const question = String(req.body.question || '').trim();
    if (!question) return res.status(400).json({ error: 'Escreva a pergunta ou o contexto da tiragem.' });
    const boundedBook = bookText.slice(0, 180000);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um intérprete cuidadoso de Baralho Cigano (Petit Lenormand). Use EXCLUSIVAMENTE o conteúdo do livro delimitado abaixo para significados, métodos e combinações. Não invente cartas, posições ou ensinamentos ausentes no livro. Se a imagem estiver inconclusiva, declare a incerteza e peça uma foto melhor. Não faça afirmações deterministas: apresente a leitura como reflexão simbólica, sem substituir aconselhamento médico, jurídico ou financeiro. Responda em português do Brasil.\n\n--- INÍCIO DO LIVRO ---\n${boundedBook}\n--- FIM DO LIVRO ---`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Pergunta/contexto: ${question}\n\nAnalise visualmente a foto, identifique as cartas visíveis da esquerda para a direita e respeite a ordem/posição. Retorne JSON com exatamente estas chaves: "resumo", "cartas" (array de objetos com "ordem", "nome", "confianca", "significado"), "combinacao", "orientacao", "observacoes". Seja específico sobre o vínculo com a pergunta e sinalize cartas não identificadas.` },
            { type: 'image_url', image_url: { url: asDataUrl(cardsImage), detail: 'high' } }
          ]
        }
      ]
    });
    const result = parseModelJson(completion.choices[0]?.message?.content);
    res.json({ ...result, source: { fileName: book.originalname, extractedCharacters: bookText.length, imageName: cardsImage.originalname } });
  } catch (error) {
    console.error(error);
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    res.status(status).json({ error: status === 413 ? `Arquivo maior que ${maxUploadMb} MB.` : error.message || 'Não foi possível concluir a leitura.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`Lenormand aberto em http://localhost:${port}`));
