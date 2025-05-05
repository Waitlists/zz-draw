const socket = io();
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let color = document.getElementById('colorPicker').value;
let size = document.getElementById('sizePicker').value;
let isEraser = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50;

window.addEventListener('resize', () => {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 50;
  ctx.putImageData(img, 0, 0);
});

function drawLine(x0, y0, x1, y1, color, size, emit) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.closePath();

  if (!emit) return;
  socket.emit('draw', { x0, y0, x1, y1, color, size });
}

let last = {};

canvas.addEventListener('mousedown', e => {
  drawing = true;
  last = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseout', () => drawing = false);

canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  drawLine(last.x, last.y, e.clientX, e.clientY, isEraser ? '#ffffff' : color, size, true);
  last = { x: e.clientX, y: e.clientY };
});

// Touch support
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  drawing = true;
  last = { x: t.clientX, y: t.clientY };
});

canvas.addEventListener('touchend', () => drawing = false);
canvas.addEventListener('touchcancel', () => drawing = false);

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!drawing) return;
  const t = e.touches[0];
  drawLine(last.x, last.y, t.clientX, t.clientY, isEraser ? '#ffffff' : color, size, true);
  last = { x: t.clientX, y: t.clientY };
});

// Controls
document.getElementById('colorPicker').addEventListener('input', e => {
  color = e.target.value;
  isEraser = false;
});
document.getElementById('sizePicker').addEventListener('input', e => {
  size = e.target.value;
});
document.getElementById('eraser').addEventListener('click', () => {
  isEraser = true;
});
document.getElementById('clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit('clear');
});

// Incoming draw
socket.on('draw', data => {
  drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
});

socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
