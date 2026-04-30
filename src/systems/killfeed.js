export const killFeed = [];

export function addKillFeed(text, color = '#FF4444') {
  killFeed.push({ text, color, life: 3, maxLife: 3 });
  if (killFeed.length > 5) killFeed.shift();
}

export function updateKillFeed(dt) {
  for (let i = killFeed.length - 1; i >= 0; i--) {
    killFeed[i].life -= dt;
    if (killFeed[i].life <= 0) killFeed.splice(i, 1);
  }
}
