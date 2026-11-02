import { gameConfig } from '../config/gameConfig.js';

const ACTIONS = new Set(['punch', 'kick', 'grab', 'special']);

export class Fighter {
  constructor({ id, x, y = 0, z = 0, facing, isCpu = false, character = null, color = 0x35a7ff, accent = 0xe8edf7 }) {
    this.id = id; this.x = x; this.y = y; this.z = z; this.vy = 0; this.vx = 0; this.vz = 0;
    this.facing = facing; this.isCpu = isCpu; this.character = character;
    this.color = character?.color ?? color; this.accent = character?.accent ?? accent;
    this.skin = character?.skin ?? 0xc98f68; this.hair = character?.hair ?? 0x20232c;
    this.style = character?.style ?? 'balanced';
    this.damageMultiplier = 0.9 + ((character?.stats?.power ?? 3) - 3) * 0.07;
    this.guardMultiplier = 1 - ((character?.stats?.guard ?? 3) - 3) * 0.035;
    this.speedMultiplier = 1 + ((character?.stats?.speed ?? 3) - 3) * 0.045;
    this.health = gameConfig.fighter.maxHealth; this.energy = 20;
    this.state = 'idle'; this.actionTime = 0; this.actionElapsed = 0;
    this.actionSerial = 0; this.activeAction = null;
    this.cooldowns = { punch: 0, kick: 0, grab: 0, special: 0 };
    this.comboCount = 0; this.comboWindow = 0; this.stun = 0;
    this.comboScale = 1; this.juggleHits = 0; this.launcher = false;
    this.blocking = false; this.crouching = false; this.hitFlash = 0;
    this.dashCooldown = 0; this.dashTime = 0; this.dashDirection = 0; this.airAttackUsed = false;
    this.invulnerable = 0; this.knockbackVelocity = 0; this.perfectBlock = false; this.blockAge = 999;
  }

  update(dt, input = {}) {
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTime = Math.max(0, this.dashTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    if (this.comboWindow <= 0) this.comboCount = 0;
    this.stun = Math.max(0, this.stun - dt);
    this.perfectBlock = false;
    if (input.block && this.blocking) this.blockAge += dt;
    else if (input.block && !this.blocking) this.blockAge = 0;
    else this.blockAge = 999;

    if (this.activeAction) {
      this.actionElapsed += dt;
      this.actionTime = Math.max(0, this.activeAction.duration - this.actionElapsed);
      if (this.actionElapsed >= this.activeAction.duration) {
        this.activeAction = null; this.state = 'idle'; this.actionTime = 0; this.actionElapsed = 0;
      }
    }
    if (this.state === 'hit' && this.actionTime > 0) this.actionTime = Math.max(0, this.actionTime - dt);
    if (this.state === 'hit' && this.actionTime <= 0 && this.stun <= 0) this.state = 'idle';

    const locked = this.activeAction || this.state === 'hit' || this.stun > 0;
    if (!locked && !this.blocking && this.dashCooldown <= 0 && this.dashTime <= 0) {
      const requested = input.dashForward ? 1 : input.dashBack ? -1 : 0;
      if (requested) {
        this.dashDirection = requested * this.facing;
        this.dashTime = 0.16;
        this.dashCooldown = 0.62;
        this.invulnerable = Math.max(this.invulnerable, 0.10);
        this.state = 'dash';
      }
    }
    if (this.dashTime > 0 && !locked) {
      this.vx = this.dashDirection * 10.5;
      this.x += this.vx * dt;
    }
    this.blocking = !locked && !!input.block && this.y <= 0.02;
    this.crouching = !locked && !!input.down && !this.blocking && this.y <= 0.02;

    if (!locked && !this.blocking && this.dashTime <= 0) {
      const dirX = typeof input.moveX === 'number' && input.moveX !== 0 ? input.moveX : (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dirZ = typeof input.moveZ === 'number' && input.moveZ !== 0 ? input.moveZ : (input.depthDown ? 1 : 0) - (input.depthUp ? 1 : 0);
      const speedStyle = this.style === 'fast' ? 1.13 : this.style === 'tank' ? 0.88 : 1;
      const air = this.y > 0.02 ? gameConfig.fighter.airControl : 1;
      const speed = gameConfig.fighter.moveSpeed * this.speedMultiplier * speedStyle * air;
      this.vx = dirX * speed;
      this.vz = dirZ * speed;
      this.x += this.vx * dt;
      this.z = Math.max(gameConfig.world.minZ ?? -3.5, Math.min(gameConfig.world.maxZ ?? 3.5, this.z + this.vz * dt));
      if (input.jump && this.y <= 0.001) { this.vy = gameConfig.fighter.jumpSpeed; this.airAttackUsed = false; }
      this.state = (this.y > 0.02 || this.vy > 0) ? 'jump' : (dirX || dirZ) ? 'walk' : this.crouching ? 'crouch' : 'idle';
    } else if (this.blocking) {
      this.vx = 0; this.vz = 0; this.state = 'idle';
    } else {
      this.vx *= Math.max(0, 1 - 10 * dt);
      this.vz *= Math.max(0, 1 - 10 * dt);
    }

    this.vy -= gameConfig.world.gravity * dt;
    this.y = Math.max(0, this.y + this.vy * dt);
    if (this.y === 0 && this.vy < 0) { this.vy = 0; this.juggleHits = 0; }
    this.x += this.knockbackVelocity * dt;
    this.knockbackVelocity *= Math.max(0, 1 - 8 * dt);
    if (Math.abs(this.knockbackVelocity) < 0.03) this.knockbackVelocity = 0;
    this.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, this.x));
    if (this.y <= 0.001) this.airAttackUsed = false;
  }

  startAction(name) {
    const spec = gameConfig.combat[name];
    if (!ACTIONS.has(name) || !spec || this.blocking || this.stun > 0 || this.cooldowns[name] > 0) return false;
    const current = this.activeAction;
    const canCancel = current && ['punch','kick'].includes(current.name) &&
      ['punch','kick'].includes(name) &&
      this.actionElapsed >= (current.cancelStart ?? current.duration * 0.55) &&
      this.actionElapsed <= (current.cancelEnd ?? current.duration * 0.88);
    if ((this.state !== 'idle' || current) && !canCancel) return false;
    if (name === 'special' && this.energy < spec.energyCost) return false;
    if (name === 'special') this.energy -= spec.energyCost;
    else this.energy = Math.min(gameConfig.fighter.maxEnergy, this.energy + spec.energy);
    if (['punch','kick'].includes(name)) {
      this.comboCount = this.comboWindow > 0 ? this.comboCount + 1 : 1;
      this.comboWindow = gameConfig.combat.comboWindow;
    }
    this.actionSerial += 1;
    const variant = this.y > 0.08 ? 'air' : this.crouching && ['punch','kick'].includes(name) ? 'crouch' : '';
    const launcher = name === 'kick' && this.comboCount >= 3 && !variant;
    const tuned = variant === 'air' ? { damage: spec.damage * 0.88, range: spec.range * 1.08, knockback: spec.knockback * 1.12, height: (spec.height ?? 1.5) + 0.6 } :
      variant === 'crouch' ? { damage: spec.damage * 1.08, range: spec.range * 0.92, height: Math.max(0.8, (spec.height ?? 1.5) - 0.3) } : {};
    this.activeAction = { name, ...spec, ...tuned, variant, launcher };
    this.actionElapsed = 0; this.actionTime = spec.duration; this.state = name;
    this.cooldowns[name] = spec.cooldown;
    return true;
  }

  takeHit(damage, attackerFacing, spec = {}) {
    if (this.invulnerable > 0 || this.health <= 0) return { damage: 0, blocked: false, perfect: false };
    const facingAttacker = this.facing === -attackerFacing;
    const guarding = this.blocking && facingAttacker && this.y <= 0.02;
    const perfect = guarding && this.blockAge <= gameConfig.combat.perfectBlockWindow;
    const blocked = guarding && !spec.breaksGuard;
    const actual = blocked ? Math.max(1, damage * (perfect ? 0.05 : gameConfig.combat.blockMultiplier) * this.guardMultiplier) : damage;
    this.health = Math.max(0, this.health - actual);
    this.energy = Math.min(gameConfig.fighter.maxEnergy, this.energy + actual * 0.8 + (perfect ? 8 : 0));
    this.hitFlash = 0.18; this.invulnerable = 0.1;
    if (blocked) { this.perfectBlock = perfect; this.blockAge = 0; }
    else {
      this.state = 'hit'; this.activeAction = null; this.actionTime = spec.hitstun ?? 0.25;
      this.stun = spec.hitstun ?? 0.25; this.actionElapsed = 0;
      this.comboWindow = 0; this.comboCount = 0;
      this.knockbackVelocity = attackerFacing * (spec.knockback ?? 0.35) * 5;
      this.blocking = false;
    }
    return { damage: actual, blocked, perfect };
  }
}
