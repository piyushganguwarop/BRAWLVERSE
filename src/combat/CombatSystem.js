import { gameConfig } from '../config/gameConfig.js';

export class CombatSystem {
  constructor(onHit) {
    this.onHit = onHit;
    this.hitRegistry = new Set();
    this.juggleRegistry = new Map();
  }

  /**
   * Deterministic 3D volumetric hit check between attacker's active action and target.
   * Checks horizontal range (X), depth range (Z), vertical reach (Y), and true 3D facing alignment.
   */
  check3DHit(attacker, action, target) {
    if (!attacker || !action || !target) return false;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dz = (target.z ?? 0) - (attacker.z ?? 0);

    // 1. Vertical reach check
    const verticalOverlap = Math.abs(dy) <= (action.height ?? 1.5);
    if (!verticalOverlap) return false;

    // 2. Horizontal and Depth reach
    const horizontalDistance = Math.abs(dx);
    const depthDistance = Math.abs(dz);
    const maxRange = action.range ?? 1.2;
    const depthReach = action.depthRange ?? action.depth ?? gameConfig.combat.defaultDepthRange ?? 0.85;

    if (horizontalDistance > maxRange || depthDistance > depthReach) return false;

    const planarDist = Math.hypot(dx, dz);
    if (planarDist > maxRange) return false;

    // 3. Directional Alignment (Facing check in 3D XZ plane)
    if (action.omniDirectional) return true;

    // Close contact range deadzone: if target is within 0.22m, hits can connect
    if (planarDist < 0.22) return true;

    let fx = attacker.facingVector?.x;
    let fz = attacker.facingVector?.z;
    if (fx === undefined || fz === undefined) {
      if (attacker.facingAngle !== undefined) {
        fx = Math.sin(attacker.facingAngle);
        fz = Math.cos(attacker.facingAngle);
      } else {
        fx = attacker.facing ?? 1;
        fz = 0;
      }
    }

    // Direction vector to target
    const tx = dx / planarDist;
    const tz = dz / planarDist;

    // Vector dot product alignment
    const dot = fx * tx + fz * tz;

    // Target must be in the attacker's front field of view (cone >= ~78 degrees)
    // Attacks directly behind (dot < 0) will miss!
    return dot >= 0.20;
  }

  update(fighters) {
    for (const fighter of fighters) if (fighter.y <= 0.08) this.juggleRegistry.set(fighter.id, 0);
    for (const attacker of fighters) {
      const action = attacker.activeAction;
      if (!action) continue;
      if (attacker.actionElapsed < action.activeStart || attacker.actionElapsed > action.activeEnd) continue;
      for (const target of fighters) {
        if (target.id === attacker.id || target.health <= 0) continue;
        const hitKey = `${attacker.id}:${attacker.actionSerial}:${target.id}`;
        if (this.hitRegistry.has(hitKey)) continue;

        if (!this.check3DHit(attacker, action, target)) continue;

        this.hitRegistry.add(hitKey);
        const previousJuggle = this.juggleRegistry.get(target.id) ?? 0;
        const scaling = target.y > 0.08
          ? Math.max(gameConfig.combat.minimumComboDamage, 1 - previousJuggle * gameConfig.combat.comboScaling)
          : 1;
        const comboBonus = ['punch', 'kick', 'heavy'].includes(action.name)
          ? 1 + Math.min(gameConfig.combat.maxComboBonus, Math.max(0, attacker.comboCount - 1) * 0.08)
          : 1;
        const result = target.takeHit(action.damage * attacker.damageMultiplier * comboBonus * scaling, attacker.facing, action, attacker);
        if (result.damage > 0) {
          if (action.name === 'grab') {
            let gx = attacker.facingVector?.x;
            let gz = attacker.facingVector?.z;
            if (gx === undefined || gz === undefined) {
              if (attacker.facingAngle !== undefined) {
                gx = Math.sin(attacker.facingAngle);
                gz = Math.cos(attacker.facingAngle);
              } else {
                gx = attacker.facing ?? 1;
                gz = 0;
              }
            }
            const gLen = Math.hypot(gx, gz) || 1;
            target.x = Math.max(gameConfig.world.minX, Math.min(gameConfig.world.maxX, target.x + (gx / gLen) * 0.12));
            target.z = Math.max(gameConfig.world.minZ, Math.min(gameConfig.world.maxZ, (target.z ?? 0) + (gz / gLen) * 0.12));
          }
          if (!result.blocked && !result.perfect && target.y > 0.08) this.juggleRegistry.set(target.id, previousJuggle + 1);
          else if (!result.blocked && !result.perfect && action.launcher) {
            target.vy = gameConfig.combat.launcherVelocity;
            target.y = Math.max(target.y, 0.12);
            target.juggleHits = 0;
            this.juggleRegistry.set(target.id, 0);
          }
          this.onHit?.({ attacker, target, damage: result.damage, blocked: result.blocked, perfect: result.perfect, combo: attacker.comboCount, action: action.name, launcher: !!action.launcher && !result.blocked });
        }
      }
    }
  }
}
