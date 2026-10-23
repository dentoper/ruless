const contentEl = document.getElementById('content');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let currentListType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${formatInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (!listItems.length) return;

    const markup = listItems
      .map((item) => `<li>${formatInline(item)}</li>`)
      .join('');

    if (currentListType === 'ol') {
      blocks.push(`<ol>${markup}</ol>`);
    } else {
      blocks.push(`<ul>${markup}</ul>`);
    }

    listItems = [];
    currentListType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line === '---') {
      flushParagraph();
      flushList();
      blocks.push('<hr>');
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      const headingText = line.replace(/^##\s*/, '');
      const headingId = slugify(headingText);
      blocks.push(`<h2 id="${headingId}">${formatInline(headingText)}</h2>`);
      continue;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      const headingText = line.replace(/^#\s*/, '');
      const headingId = slugify(headingText);
      blocks.push(`<h1 id="${headingId}">${formatInline(headingText)}</h1>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      listItems.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      listItems.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${formatInline(line.replace(/^>\s*/, ''))}</blockquote>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.join('\n');
}

function renderToc() {
  const tocEl = document.getElementById('toc');
  if (!tocEl) return;

  const headings = document.querySelectorAll('.content h2');
  if (!headings.length) {
    tocEl.innerHTML = '<p class="toc-empty">Разделы отсутствуют</p>';
    return;
  }

  const items = Array.from(headings)
    .map((heading) => {
      const text = heading.textContent.trim();
      const id = heading.getAttribute('id');
      return `<li><a href="#${id}">${text}</a></li>`;
    })
    .join('');

  tocEl.innerHTML = `<ul>${items}</ul>`;
}

async function loadPage() {
  try {
    const response = await fetch('message.txt', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    contentEl.innerHTML = renderMarkdown(text);
    renderToc();
  } catch (error) {
    contentEl.innerHTML = `
      <h1>Ошибка загрузки содержимого</h1>
      <p>Не удалось загрузить файл message.txt. Проверьте, что файл доступен на сервере.</p>
      <p>${escapeHtml(String(error))}</p>
    `;
  }
}

loadPage();
