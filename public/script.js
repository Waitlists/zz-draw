const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let tool = 'pencil';
let color = document.getElementById('colorPicker').value;
let size = document.getElementById('sizePicker').value;
let textInput = document.getElementById('textInput');
let last = {};
let preview = null;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50;

window.addEventListener('resize', () => location.reload());

function drawLine(x0, y0, x1, y1, color, size, emit) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.closePath();
  if (emit) socket.emit('draw', { type: 'line', x0, y0, x1, y1, color, size });
}

function drawText(x, y, text, color, size, emit) {
  ctx.fillStyle = color;
  ctx.font = `${size * 3}px Arial`;
  ctx.fillText(text, x, y);
  if (emit) socket.emit('draw', { type: 'text', x, y, text, color, size });
}

function drawRect(x, y, w, h, color, size, emit) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.strokeRect(x, y, w, h);
  if (emit) socket.emit('draw', { type: 'rect', x, y, w, h, color, size });
}

function drawEllipse(x, y, w, h, color, size, emit) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();
  if (emit) socket.emit('draw', { type: 'ellipse', x, y, w, h, color, size });
}

function redrawPreview() {
  if (!preview) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit('requestRedraw'); // optional: for canvas replay from server
  drawHistory.forEach(d => drawFromData(d, false));
  const { x0, y0, x1, y1 } = preview;
  const w = x1 - x0;
  const h = y1 - y0;
  if (tool === 'rect') drawRect(x0, y0, w, h, color, size, false);
  if (tool === 'ellipse') drawEllipse(x0, y0, w, h, color, size, false);
  if (tool === 'line') drawLine(x0, y0, x1, y1, color, size, false);
}

function drawFromData(data, store = true) {
  switch (data.type) {
    case 'line':
      drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false); break;
    case 'text':
      drawText(data.x, data.y, data.text, data.color, data.size, false); break;
    case 'rect':
      drawRect(data.x, data.y, data.w, data.h, data.color, data.size, false); break;
    case 'ellipse':
      drawEllipse(data.x, data.y, data.w, data.h, data.color, data.size, false); break;
  }
  if (store) drawHistory.push(data);
}

// Events
canvas.addEventListener('mousedown', e => {
  const x = e.clientX, y = e.clientY;
  if (tool === 'text') {
    drawText(x, y, textInput.value, color, size, true);
  } else {
    drawing = true;
    last = { x, y };
  }
});

canvas.addEventListener('mouseup', e => {
  if (!drawing) return;
  const x = e.clientX, y = e.clientY;
  const w = x - last.x;
  const h = y - last.y;
  if (tool === 'rect') drawRect(last.x, last.y, w, h, color, size, true);
  if (tool === 'ellipse') drawEllipse(last.x, last.y, w, h, color, size, true);
  if (tool === 'line') drawLine(last.x, last.y, x, y, color, size, true);
  drawing = false;
  preview = null;
});

canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const x = e.clientX, y = e.clientY;
  if (tool === 'pencil' || tool === 'eraser') {
    drawLine(last.x, last.y, x, y, tool === 'eraser' ? '#ffffff' : color, size, true);
    last = { x, y };
  } else if (['rect', 'ellipse', 'line'].includes(tool)) {
    preview = { x0: last.x, y0: last.y, x1: x, y1: y };
    redrawPreview();
  }
});

// Touch support (same logic)
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  if (tool === 'text') {
    drawText(t.clientX, t.clientY, textInput.value, color, size, true);
  } else {
    drawing = true;
    last = { x: t.clientX, y: t.clientY };
  }
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  const x = t.clientX, y = t.clientY;
  if (!drawing) return;
  if (tool === 'pencil' || tool === 'eraser') {
    drawLine(last.x, last.y, x, y, tool === 'eraser' ? '#ffffff' : color, size, true);
    last = { x, y };
  } else if (['rect', 'ellipse', 'line'].includes(tool)) {
    preview = { x0: last.x, y0: last.y, x1: x, y1: y };
    redrawPreview();
  }
});

canvas.addEventListener('touchend', () => drawing = false);

// Controls
document.getElementById('tool').onchange = e => tool = e.target.value;
document.getElementById('colorPicker').oninput = e => color = e.target.value;
document.getElementById('sizePicker').oninput = e => size = e.target.value;
document.getElementById('clear').onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit('clear');
};

// Sync
let drawHistory = [];

socket.on('init', data => {
  drawHistory = data;
  drawHistory.forEach(d => drawFromData(d, false));
});

socket.on('draw', data => {
  drawFromData(data);
});

socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawHistory = [];
});
