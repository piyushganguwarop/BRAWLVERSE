export const gameConfig = {
  width: 1280,
  height: 720,
  world: {
    minX: -5.4,
    maxX: 5.4,
    minZ: -2.2,
    maxZ: 2.2,
    floorY: 0,
    ceilingY: 7.5,
    gravity: 22,
    fighterSpacing: 0.92
  },
  fighter: { moveSpeed: 4.3, jumpSpeed: 8.6, maxHealth: 100, maxEnergy: 100, airControl: 0.58, groundFriction: 12 },
  combat: {
    defaultDepthRange: 0.85,
    punch: { cancelStart: 0.16, cancelEnd: 0.29, damage: 7, range: 1.65, depthRange: 0.85, cooldown: 0.34, duration: 0.34, activeStart: 0.09, activeEnd: 0.19, energy: 5, hitstun: 0.18, knockback: 0.32, height: 1.45 },
    kick: { cancelStart: 0.22, cancelEnd: 0.39, damage: 11, range: 1.95, depthRange: 0.95, cooldown: 0.58, duration: 0.46, activeStart: 0.15, activeEnd: 0.29, energy: 8, hitstun: 0.25, knockback: 0.48, height: 1.35 },
    heavy: { cancelStart: 0.28, cancelEnd: 0.48, damage: 16, range: 2.15, depthRange: 1.05, cooldown: 0.72, duration: 0.58, activeStart: 0.18, activeEnd: 0.35, energy: 12, hitstun: 0.35, knockback: 0.65, height: 1.5 },
    grab: { cancelStart: 0.30, cancelEnd: 0.44, damage: 15, range: 1.25, depthRange: 0.75, cooldown: 0.9, duration: 0.52, activeStart: 0.18, activeEnd: 0.28, energy: 10, hitstun: 0.38, knockback: 0.62, height: 1.6, breaksGuard: true },
    special: { damage: 24, range: 3.25, depthRange: 1.45, cooldown: 1.5, duration: 0.72, activeStart: 0.24, activeEnd: 0.48, energyCost: 45, hitstun: 0.42, knockback: 0.8, height: 1.8 },
    blockMultiplier: 0.2,
    perfectBlockWindow: 0.12,
    comboWindow: 0.95,
    comboScaling: 0.12,
    minimumComboDamage: 0.42,
    launcherHeight: 5.2,
    launcherVelocity: 8.2,
    maxComboBonus: 0.35
  }
};
