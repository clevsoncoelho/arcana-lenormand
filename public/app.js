const form = document.querySelector('#reading-form');
const bookInput = document.querySelector('#book');
const imageInput = document.querySelector('#cardsImage');
const bookName = document.querySelector('#book-name');
const preview = document.querySelector('#preview');
const imageEmpty = document.querySelector('#image-empty');
const resultArea = document.querySelector('#result-area');
const resultContent = document.querySelector('#result-content');
const submitButton = document.querySelector('#submit-button');

bookInput.addEventListener('change', () => { bookName.textContent = bookInput.files[0]?.name || 'Arraste ou selecione seu livro'; });
imageInput.addEventListener('change', () => { if (imageInput.files[0]) { preview.src = URL.createObjectURL(imageInput.files[0]); preview.hidden = false; imageEmpty.hidden = true; } });
['book-drop','image-drop'].forEach(id => { const el = document.getElementById(id); ['dragenter','dragover'].forEach(e => el.addEventListener(e, ev => { ev.preventDefault(); el.classList.add('dragover'); })); ['dragleave','drop'].forEach(e => el.addEventListener(e, ev => { ev.preventDefault(); el.classList.remove('dragover'); })); });
document.querySelector('#camera-button').addEventListener('click', () => imageInput.click());
document.querySelector('#new-reading').addEventListener('click', () => { resultArea.hidden = true; window.scrollTo({top:0,behavior:'smooth'}); });

function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function block(title, text) { return `<article class="result-block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text || 'Não informado.')}</p></article>`; }

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true; submitButton.querySelector('span').textContent = 'Lendo as cartas...';
  resultArea.hidden = true;
  try {
    const response = await fetch('/api/interpret', { method:'POST', body:new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a leitura.');
    const cards = Array.isArray(data.cartas) ? data.cartas : [];
    resultContent.innerHTML = `<p class="result-summary">${escapeHtml(data.resumo)}</p><div class="result-grid">${cards.map(card => `<article class="card-result"><span class="order">CARTA ${escapeHtml(card.ordem)}</span><h3>${escapeHtml(card.nome)}</h3><span class="confidence">Confiança: ${escapeHtml(card.confianca)}</span><p>${escapeHtml(card.significado)}</p></article>`).join('')}</div><div class="result-lower">${block('Síntese da combinação', data.combinacao)}${block('Orientação', data.orientacao)}${block('Observações', data.observacoes)}${block('Fonte usada', `${data.source?.fileName || 'arquivo'} · ${data.source?.extractedCharacters || 0} caracteres extraídos`)}</div>`;
    resultArea.hidden = false; resultArea.scrollIntoView({behavior:'smooth', block:'start'});
  } catch (error) { resultContent.innerHTML = `<div class="result-block"><h3>Não foi possível concluir</h3><p>${escapeHtml(error.message)}</p></div>`; resultArea.hidden = false; resultArea.scrollIntoView({behavior:'smooth'}); }
  finally { submitButton.disabled = false; submitButton.querySelector('span').textContent = 'Interpretar minha tiragem'; }
});
