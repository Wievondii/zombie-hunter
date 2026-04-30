import { IW, IH } from '../config.js';
import { TILE_SIZE, TILE_FLOOR, TILE_WALL, TILE_OBSTACLE, TILE_DECOR, drawTile } from '../data/tilesets.js';
import { seededRand } from '../utils.js';

export class TileMap {
  constructor(biome = 'graveyard') {
    this.biome = biome;
    this.tileSize = TILE_SIZE;
    this.cols = Math.ceil(IW / TILE_SIZE);
    this.rows = Math.ceil(IH / TILE_SIZE);
    this.tiles = [];
    this._bgCanvas = null;
    this._bgCtx = null;
    this._dirty = true;
    this.generate();
  }

  generate() {
    const { cols, rows } = this;
    this.tiles = new Array(rows);
    // Fixed seed based on biome name + dimensions so map is stable across resizes
    let seed = 0;
    const key = this.biome + cols + 'x' + rows;
    for (let i = 0; i < key.length; i++) seed = ((seed << 5) - seed + key.charCodeAt(i)) | 0;
    const rng = seededRand(Math.abs(seed) + 1);

    for (let r = 0; r < rows; r++) {
      this.tiles[r] = new Uint8Array(cols);
      for (let c = 0; c < cols; c++) {
        // Border walls
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          this.tiles[r][c] = TILE_WALL;
          continue;
        }
        // Inner border walls (2 tiles thick)
        if (r === 1 || r === rows - 2 || c === 1 || c === cols - 2) {
          this.tiles[r][c] = TILE_WALL;
          continue;
        }

        // Default floor
        this.tiles[r][c] = TILE_FLOOR;

        // Random obstacles (not too dense, not near center spawn)
        const centerC = cols / 2, centerR = rows / 2;
        const distFromCenter = Math.abs(c - centerC) + Math.abs(r - centerR);

        if (distFromCenter > 6) {
          const roll = rng();
          if (roll < 0.04) {
            this.tiles[r][c] = TILE_WALL;
          } else if (roll < 0.07) {
            this.tiles[r][c] = TILE_OBSTACLE;
          } else if (roll < 0.10) {
            this.tiles[r][c] = TILE_DECOR;
          }
        }
      }
    }

    // Ensure spawn area is clear (center 6x6)
    const spawnR = (rows / 2 - 3) | 0;
    const spawnC = (cols / 2 - 3) | 0;
    for (let r = spawnR; r < spawnR + 6; r++) {
      for (let c = spawnC; c < spawnC + 6; c++) {
        if (r >= 2 && r < rows - 2 && c >= 2 && c < cols - 2) {
          this.tiles[r][c] = TILE_FLOOR;
        }
      }
    }

    // Ensure paths exist (horizontal and vertical corridors)
    const midR = (rows / 2) | 0;
    const midC = (cols / 2) | 0;
    for (let c = 2; c < cols - 2; c++) {
      this.tiles[midR][c] = TILE_FLOOR;
      if (midR + 1 < rows - 2) this.tiles[midR + 1][c] = TILE_FLOOR;
    }
    for (let r = 2; r < rows - 2; r++) {
      this.tiles[r][midC] = TILE_FLOOR;
      if (midC + 1 < cols - 2) this.tiles[r][midC + 1] = TILE_FLOOR;
    }

    this._dirty = true;
  }

  isWalkable(worldX, worldY) {
    const c = (worldX / this.tileSize) | 0;
    const r = (worldY / this.tileSize) | 0;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    const t = this.tiles[r][c];
    return t === TILE_FLOOR || t === TILE_DECOR;
  }

  isWall(worldX, worldY) {
    const c = (worldX / this.tileSize) | 0;
    const r = (worldY / this.tileSize) | 0;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
    return this.tiles[r][c] === TILE_WALL;
  }

  isObstacle(worldX, worldY) {
    const c = (worldX / this.tileSize) | 0;
    const r = (worldY / this.tileSize) | 0;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    return this.tiles[r][c] === TILE_OBSTACLE;
  }

  destroyObstacle(worldX, worldY) {
    const c = (worldX / this.tileSize) | 0;
    const r = (worldY / this.tileSize) | 0;
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.tiles[r][c] === TILE_OBSTACLE) {
      this.tiles[r][c] = TILE_FLOOR;
      this._dirty = true;
      return true;
    }
    return false;
  }

  // Resolve entity collision with walls
  resolveCollision(x, y, radius) {
    let newX = x, newY = y;
    const ts = this.tileSize;

    // Check tiles around the entity
    const minC = Math.max(0, ((x - radius) / ts) | 0);
    const maxC = Math.min(this.cols - 1, ((x + radius) / ts) | 0);
    const minR = Math.max(0, ((y - radius) / ts) | 0);
    const maxR = Math.min(this.rows - 1, ((y + radius) / ts) | 0);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const t = this.tiles[r][c];
        if (t !== TILE_WALL && t !== TILE_OBSTACLE) continue;

        const tileX = c * ts, tileY = r * ts;
        // Closest point on tile to entity
        const closestX = Math.max(tileX, Math.min(newX, tileX + ts));
        const closestY = Math.max(tileY, Math.min(newY, tileY + ts));
        const dx = newX - closestX, dy = newY - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius && dist > 0) {
          const overlap = radius - dist;
          newX += (dx / dist) * overlap;
          newY += (dy / dist) * overlap;
        }
      }
    }

    return { x: newX, y: newY };
  }

  renderToOffscreen() {
    if (!this._dirty) return;
    if (!this._bgCanvas) {
      this._bgCanvas = document.createElement('canvas');
      this._bgCtx = this._bgCanvas.getContext('2d');
    }
    this._bgCanvas.width = IW;
    this._bgCanvas.height = IH;
    const c = this._bgCtx;
    const rng = seededRand(42);

    for (let r = 0; r < this.rows; r++) {
      for (let col = 0; col < this.cols; col++) {
        drawTile(c, this.tiles[r][col], col * this.tileSize, r * this.tileSize, this.biome, rng);
      }
    }
    this._dirty = false;
  }

  draw(c) {
    this.renderToOffscreen();
    if (this._bgCanvas) c.drawImage(this._bgCanvas, 0, 0);
  }
}
