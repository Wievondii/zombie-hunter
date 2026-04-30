// Tile IDs: 0=void, 1=floor, 2=wall, 3=obstacle(destructible), 4=decoration
export const TILE_SIZE = 16;
export const TILE_VOID = 0;
export const TILE_FLOOR = 1;
export const TILE_WALL = 2;
export const TILE_OBSTACLE = 3;
export const TILE_DECOR = 4;

// Biome color palettes
export const BIOMES = {
  graveyard: {
    name: '墓地',
    floor: ['#2D2D1F', '#2A2A1D', '#303022', '#2B2B1E'],
    wall: ['#4A4A35', '#3D3D2F', '#555545', '#3A3A28'],
    obstacle: ['#5D4037', '#4E342E', '#6D5044', '#3E2723'],
    decor: ['#3A3D25', '#3D4A25', '#4A4A35'],
    ambient: 'rgba(8,8,20,0.55)',
  },
  city: {
    name: '城市',
    floor: ['#3C3C3C', '#404040', '#383838', '#444444'],
    wall: ['#5A5A5A', '#666666', '#505050', '#4A4A4A'],
    obstacle: ['#7B7B7B', '#6E6E6E', '#888888', '#5D5D5D'],
    decor: ['#555555', '#606060', '#4A4A4A'],
    ambient: 'rgba(10,10,25,0.5)',
  },
  factory: {
    name: '工厂',
    floor: ['#3A3A3A', '#353535', '#404040', '#3D3D3D'],
    wall: ['#5D5D5D', '#6A6A6A', '#505050', '#4D4D4D'],
    obstacle: ['#8B6914', '#7B5B0A', '#9B7924', '#6B4B04'],
    decor: ['#FF5722', '#FF8A65', '#BF360C'],
    ambient: 'rgba(15,8,5,0.5)',
  },
  lab: {
    name: '实验室',
    floor: ['#E0E0E0', '#D5D5D5', '#EBEBEB', '#CCCCCC'],
    wall: ['#90A4AE', '#78909C', '#B0BEC5', '#607D8B'],
    obstacle: ['#B0BEC5', '#90A4AE', '#CFD8DC', '#78909C'],
    decor: ['#00BCD4', '#00ACC1', '#0097A7'],
    ambient: 'rgba(5,10,15,0.4)',
  },
};

// Tile render functions — draw a 16x16 tile onto a canvas context
export function drawTile(c, tileId, x, y, biome, rng) {
  const s = TILE_SIZE;
  const colors = BIOMES[biome] || BIOMES.graveyard;

  switch (tileId) {
    case TILE_FLOOR: {
      const ci = (rng() * colors.floor.length) | 0;
      c.fillStyle = colors.floor[ci];
      c.fillRect(x, y, s, s);
      // Subtle variation
      if (rng() < 0.15) {
        c.fillStyle = colors.floor[(ci + 1) % colors.floor.length];
        c.fillRect(x + 4, y + 4, 4, 4);
      }
      break;
    }
    case TILE_WALL: {
      c.fillStyle = colors.wall[0];
      c.fillRect(x, y, s, s);
      // Top edge highlight
      c.fillStyle = colors.wall[1];
      c.fillRect(x, y, s, 2);
      // Side shadow
      c.fillStyle = colors.wall[2];
      c.fillRect(x, y + s - 2, s, 2);
      // Random brick pattern
      if (rng() < 0.4) {
        c.fillStyle = colors.wall[3];
        c.fillRect(x + 2, y + 4, s - 4, s - 6);
      }
      break;
    }
    case TILE_OBSTACLE: {
      // Floor underneath
      c.fillStyle = colors.floor[0];
      c.fillRect(x, y, s, s);
      // Obstacle
      c.fillStyle = colors.obstacle[0];
      c.fillRect(x + 2, y + 2, s - 4, s - 4);
      c.fillStyle = colors.obstacle[1];
      c.fillRect(x + 3, y + 3, s - 6, s - 6);
      // Highlight
      c.fillStyle = colors.obstacle[2];
      c.fillRect(x + 4, y + 3, s - 8, 2);
      break;
    }
    case TILE_DECOR: {
      // Floor underneath
      c.fillStyle = colors.floor[0];
      c.fillRect(x, y, s, s);
      // Small decoration
      const di = (rng() * colors.decor.length) | 0;
      c.fillStyle = colors.decor[di];
      if (rng() < 0.5) {
        // Small dot/pebble
        c.fillRect(x + 6, y + 6, 4, 4);
      } else {
        // Line/crack
        c.fillRect(x + 3, y + 7, 8, 2);
      }
      break;
    }
  }
}
