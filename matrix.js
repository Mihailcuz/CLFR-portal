const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789¥øç∆£Ωµπ√∑ß∂ƒ©®†';
const fontSize = 14;
let columns;
let drops;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  columns = Math.floor(canvas.width / fontSize);
  drops = Array(columns).fill(1);
}

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255, 40, 40, 0.8)';
  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < drops.length; i += 1) {
    const text = letters[Math.floor(Math.random() * letters.length)];
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.fillText(text, x, y);

    if (y > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }

    drops[i] += 1;
  }

  requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();
