import test from 'node:test';
import assert from 'node:assert';
import { CharacterModelBuilder } from '../src/three/CharacterModelBuilder.js';
import { Fighter } from '../src/characters/Fighter.js';
import { getFighter, roster } from '../src/characters/roster.js';
import { ArcadeProgression } from '../src/modes/ArcadeProgression.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';

test('Phase 6: Initial four-fighter roster integrity (Atlas, Volt, Rook, Myst)', () => {
  const initialFour = ['atlas', 'volt', 'rook', 'myst'];

  for (const id of initialFour) {
    const config = getFighter(id);
    assert.ok(config, `Roster config should exist for ${id}`);
    assert.strictEqual(config.id, id);
    assert.ok(config.name, `Fighter ${id} should have a display name`);
    assert.ok(config.title, `Fighter ${id} should have a title`);
    assert.ok(config.specialName, `Fighter ${id} should have a special attack name`);
    assert.ok(config.style, `Fighter ${id} should have a combat style`);

    // Model construction verification
    const model = CharacterModelBuilder.build(config);
    assert.strictEqual(model.fighterId, id, `Model fighterId should match ${id}`);
    assert.ok(model.root, `Model ${id} should have root`);
    assert.ok(model.head, `Model ${id} should have head`);
    assert.ok(model.shoulderL && model.shoulderR, `Model ${id} should have shoulders`);
    assert.ok(model.hipJointL && model.hipJointR, `Model ${id} should have hip joints`);

    // Verify distinct fighter identities
    if (id === 'atlas') {
      assert.ok(model.fistR, 'Atlas must possess the heavy Titan Fist');
      assert.strictEqual(model.glowMat.color.getHex(), 0x00F0FF, 'Atlas core glow is Sky Cyan');
    } else if (id === 'volt') {
      assert.ok(model.shockBladeL && model.shockBladeR, 'Volt must possess dual plasma shock blades');
      assert.strictEqual(model.glowMat.color.getHex(), 0xA6FF00, 'Volt plasma glow is Neon Lime');
    } else if (id === 'rook') {
      assert.ok(model.pistonPlateL && model.steamVentL, 'Rook must possess hydraulic piston gauntlets and steam vents');
      assert.strictEqual(model.glowMat.color.getHex(), 0xFF2040, 'Rook core glow is Crimson Reactor');
    } else if (id === 'myst') {
      assert.ok(model.halfMask, 'Myst must possess porcelain half-mask');
      assert.ok(model.coatTailL && model.coatTailR, 'Myst must possess split-tail phantom duster coat');
      assert.ok(model.glyphRingL && model.glyphRingR, 'Myst must possess floating holographic glyph rings');
      assert.strictEqual(model.glowMat.color.getHex(), 0xFF00A0, 'Myst rune glow is Astral Pink');
    }

    // Fighter instance verification
    const fighter = new Fighter({ id: 'p1', x: 0, facing: 1, character: config });
    assert.strictEqual(fighter.character.id, id);
    assert.strictEqual(fighter.style, config.style);
    assert.ok(fighter.damageMultiplier > 0);
    assert.ok(fighter.guardMultiplier > 0);
    assert.ok(fighter.speedMultiplier > 0);
  }
});

test('Phase 6: All 4 fighters animate cleanly across all 17 combat states', () => {
  const initialFour = ['atlas', 'volt', 'rook', 'myst'];
  const states = [
    'idle', 'walk', 'dash', 'jump', 'crouch', 'block',
    'punch', 'kick', 'heavy', 'grab', 'special',
    'hit', 'ko', 'knockdown', 'get_up', 'victory', 'defeat'
  ];

  for (const id of initialFour) {
    const config = getFighter(id);
    const model = CharacterModelBuilder.build(config);

    for (const state of states) {
      const fighter = {
        id,
        character: config,
        x: 0,
        y: state === 'jump' ? 1.2 : 0,
        z: 0.2,
        vx: state === 'walk' || state === 'dash' ? 3.5 : 0,
        vz: 0,
        facing: 1,
        facingAngle: Math.PI / 2,
        state,
        blocking: state === 'block',
        crouching: state === 'crouch',
        actionTime: 0.25,
        hitFlash: state === 'hit' ? 0.2 : 0
      };

      assert.doesNotThrow(() => {
        CharacterModelBuilder.animateFighter(model, fighter, 1.5, 0.016);
      }, `Fighter ${id} animation failed on state: ${state}`);
    }
  }
});

test('Phase 6: Offline Modes Interoperability (Arcade, Training, Local Versus)', () => {
  const initialFour = ['atlas', 'volt', 'rook', 'myst'];

  // 1. Arcade Mode ladder with each fighter as player
  for (const id of initialFour) {
    const arcade = new ArcadeProgression({ playerId: id, stageId: 'neon' });
    assert.strictEqual(arcade.status, 'active');
    assert.ok(arcade.opponents.length >= 3, `Arcade should have opponents for ${id}`);
    assert.ok(!arcade.opponents.includes(id), `Player ${id} should not be in their own ladder opponents`);

    const currentFight = arcade.current();
    assert.ok(currentFight.fighterId, 'Current fight should have an opponent ID');
    assert.notStrictEqual(currentFight.fighterId, id);
    assert.strictEqual(currentFight.index, 0);
  }

  // 2. Training Mode: pairs between any fighter and dummy
  for (const playerId of initialFour) {
    for (const dummyId of initialFour) {
      const player = new Fighter({ id: 'player', x: -1.5, facing: 1, character: getFighter(playerId) });
      const dummy = new Fighter({ id: 'dummy', x: 1.5, facing: -1, isCpu: true, character: getFighter(dummyId) });

      assert.strictEqual(player.character.id, playerId);
      assert.strictEqual(dummy.character.id, dummyId);
      assert.strictEqual(dummy.isCpu, true);
    }
  }

  // 3. Local Versus Mode: independent P1 and P2 fighter selection
  for (let i = 0; i < initialFour.length; i++) {
    for (let j = 0; j < initialFour.length; j++) {
      const p1Id = initialFour[i];
      const p2Id = initialFour[j];

      const p1 = new Fighter({ id: 'player', x: -2.0, facing: 1, character: getFighter(p1Id) });
      const p2 = new Fighter({ id: 'player2', x: 2.0, facing: -1, character: getFighter(p2Id) });

      assert.strictEqual(p1.id, 'player');
      assert.strictEqual(p2.id, 'player2');
      assert.strictEqual(p1.character.id, p1Id);
      assert.strictEqual(p2.character.id, p2Id);
    }
  }
});

test('Phase 6: 3D Combat hit detection and special moves between all 4 fighters', () => {
  const initialFour = ['atlas', 'volt', 'rook', 'myst'];

  // Test special attack execution and hit registration across every matchup pair
  for (const attackerId of initialFour) {
    for (const defenderId of initialFour) {
      if (attackerId === defenderId) continue;

      let hitDetected = false;
      const combat = new CombatSystem((hitData) => {
        hitDetected = true;
        assert.ok(hitData.damage > 0, 'Special hit should deal damage');
      });

      const attacker = new Fighter({ id: 'attacker', x: 0, y: 0, z: 0, facing: 1, character: getFighter(attackerId) });
      const defender = new Fighter({ id: 'defender', x: 0.8, y: 0, z: 0, facing: -1, character: getFighter(defenderId) });

      attacker.energy = 50;
      const started = attacker.startAction('special');
      assert.ok(started, `${attackerId} should start special attack against ${defenderId}`);
      assert.strictEqual(attacker.state, 'special');

      // Step action elapsed into active window
      attacker.actionElapsed = attacker.activeAction.startup + 0.02;

      combat.update([attacker, defender]);

      assert.ok(hitDetected, `${attackerId} special should hit ${defenderId} within range`);
    }
  }
});
