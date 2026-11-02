import { gameConfig } from '../config/gameConfig.js';

export class CombatSystem {
  constructor(onHit) {
    this.onHit = onHit;
    this.hitRegistry = new Set();
    this.juggleRegistry = new Map();
  }

  /**
   * Deterministic 3D volumetric hit check between attacker's active action and target.
   * Checks horizontal range (X), depth range (Z), vertical reach (Y), and facing direction.
   */
  check3DHit(attacker, action, target) {
    if (!attacker || !action || !target) return false;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const dz = (target.z ?? 0) - (attacker.z ?? 0);

    const horizontalDistance = Math.abs(dx);
    const inFront = Math.sign(dx) === attacker.facing || (horizontalDistance < 0.25 && Math.abs(dz) < 0.35);
    const depthDistance = Math.abs(dz);
    const depthReach = action.depthRange ?? action.depth ?? gameConfig.combat.defaultDepthRange ?? 0.85;
    const verticalOverlap = Math.abs(dy) <= (action.height ?? 1.5);

    return inFront && horizontalDistance <= action.range && depthDistance <= depthReach && verticalOverlap;
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
        const comboBonus = ['punch', 'kick'].includes(action.name)
          ? 1 + Math.min(gameConfig.combat.maxComboBonus, Math.max(0, attacker.comboCount - 1) * 0.08)
          : 1;
        const result = target.takeHit(action.damage * attacker.damageMultiplier * comboBonus * scaling, attacker.facing, action);
        if (result.damage > 0) {
          if (action.name === 'grab') target.x += attacker.facing * 0.12;
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
