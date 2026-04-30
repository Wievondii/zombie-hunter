import { clamp } from '../utils.js';

export class SpatialGrid {
  constructor(cellSize, cols, rows) {
    this.cellSize = cellSize;
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].length = 0;
    }
  }

  _key(x, y) {
    const cx = clamp(Math.floor(x / this.cellSize), 0, this.cols - 1);
    const cy = clamp(Math.floor(y / this.cellSize), 0, this.rows - 1);
    return cy * this.cols + cx;
  }

  insert(entity) { this.cells[this._key(entity.x, entity.y)].push(entity); }

  query(x, y, radius) {
    const results = [];
    const minCx = clamp(Math.floor((x - radius) / this.cellSize), 0, this.cols - 1);
    const maxCx = clamp(Math.floor((x + radius) / this.cellSize), 0, this.cols - 1);
    const minCy = clamp(Math.floor((y - radius) / this.cellSize), 0, this.rows - 1);
    const maxCy = clamp(Math.floor((y + radius) / this.cellSize), 0, this.rows - 1);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        for (let i = 0; i < cell.length; i++) results.push(cell[i]);
      }
    }
    return results;
  }
}
