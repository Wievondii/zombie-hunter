export const AnimState = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
  ATTACK: 'attack',
  HURT: 'hurt',
  DEATH: 'death',
});

export const Facing = Object.freeze({
  DOWN: 0,
  UP: 1,
  LEFT: 2,
  RIGHT: 3,
});

export class AnimationController {
  constructor() {
    this.state = AnimState.IDLE;
    this.facing = Facing.DOWN;
    this.frame = 0;
    this.timer = 0;
    this.frameSpeed = 8; // frames per second
    this.frameCount = 1;
    this.lockTimer = 0; // prevents state change for duration
    this.prevState = AnimState.IDLE;
  }

  setState(newState, lockDuration = 0) {
    if (this.lockTimer > 0 && newState !== AnimState.DEATH) return;
    if (this.state !== newState) {
      this.prevState = this.state;
      this.state = newState;
      this.frame = 0;
      this.timer = 0;
      if (lockDuration > 0) this.lockTimer = lockDuration;
    }
  }

  setFacingFromVelocity(vx, vy) {
    const ax = Math.abs(vx), ay = Math.abs(vy);
    if (ax < 1 && ay < 1) return; // keep current facing when idle
    if (ax > ay) {
      this.facing = vx > 0 ? Facing.RIGHT : Facing.LEFT;
    } else {
      this.facing = vy > 0 ? Facing.DOWN : Facing.UP;
    }
  }

  update(dt, isMoving = false, isAttacking = false) {
    this.lockTimer = Math.max(0, this.lockTimer - dt);

    if (isAttacking && this.state !== AnimState.DEATH) {
      this.setState(AnimState.ATTACK, 0.15);
    } else if (this.state !== AnimState.ATTACK && this.state !== AnimState.HURT && this.state !== AnimState.DEATH) {
      this.setState(isMoving ? AnimState.WALK : AnimState.IDLE);
    }

    // Auto-return from ATTACK to idle/walk
    if (this.state === AnimState.ATTACK && this.lockTimer <= 0) {
      this.setState(isMoving ? AnimState.WALK : AnimState.IDLE);
    }

    this.timer += dt;
    const frameTime = 1 / this.frameSpeed;
    if (this.timer >= frameTime) {
      this.timer -= frameTime;
      this.frame++;
      if (this.frame >= this.frameCount) this.frame = 0;
    }
  }

  get isLeft() { return this.facing === Facing.LEFT; }
  get isRight() { return this.facing === Facing.RIGHT; }
  get isUp() { return this.facing === Facing.UP; }
  get isDown() { return this.facing === Facing.DOWN; }
  get flipX() { return this.facing === Facing.LEFT; }
}
