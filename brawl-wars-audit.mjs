#!/usr/bin/env node
/**
 * Brawl Wars read-only source audit.
 * Place this file beside package.json and run: node brawl-wars-audit.mjs
 * It does not modify game source. It writes BRAWL_WARS_AUTO_AUDIT.txt only.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'BRAWL_WARS_AUTO_AUDIT.txt');
const EXCLUDE = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.vite']);
const lines = [];
const findings = [];
const now = new Date().toISOString();

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  catch { return ''; }
}
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function lineOf(source, pattern) {
  const index = source.search(pattern);
  return index < 0 ? null : source.slice(0, index).split(/\r?\n/).length;
}
function add(id, severity, status, title, evidence, impact, recommendation) {
  findings.push({ id, severity, status, title, evidence, impact, recommendation });
}
function run(command, args, timeout = 180000) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    maxBuffer: 12 * 1024 * 1024,
    windowsHide: true,
    shell: (typeof command === 'string' && command.toLowerCase().endsWith('.exe')) ? false : process.platform === 'win32'
  });
  return {
    status: result.status,
    signal: result.signal,
    error: result.error?.message || '',
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    timedOut: result.error?.code === 'ETIMEDOUT'
  };
}
function walk(dir, result = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return result; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.nvmrc') continue;
    if (EXCLUDE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, result);
    else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) result.push(full);
  }
  return result;
}
function relative(file) { return path.relative(ROOT, file).split(path.sep).join('/'); }
function addSourceFinding(id, severity, title, file, expression, why, fix) {
  const source = read(file);
  const line = source ? lineOf(source, expression) : null;
  add(id, severity, source && line ? 'CONFIRMED IN SOURCE' : 'NOT CONFIRMED BY THIS CHECK', title,
    source && line ? `${file}:${line}` : `${file}: expected pattern was not found`, why, fix);
}

const packageText = read('package.json');
let pkg = {};
try { pkg = JSON.parse(packageText); } catch {}
if (!pkg.name) {
  console.error('ERROR: package.json was not found in the current folder.');
  console.error('Place this script in the project root, beside package.json, then run it again.');
  process.exit(2);
}

lines.push('BRAWL WARS - AUTOMATED LOCAL SOURCE AUDIT');
lines.push(`Generated: ${now}`);
lines.push(`Project: ${pkg.name} ${pkg.version || '(version not specified)'}`);
lines.push(`Root: ${ROOT}`);
lines.push(`Platform: ${os.platform()} ${os.release()} | Node ${process.version} | npm ${run('npm', ['--version'], 15000).stdout.trim() || 'unavailable'}`);
lines.push('');
lines.push('IMPORTANT: This is a read-only audit. Game source files are not modified.');
lines.push('The only file written by this script is BRAWL_WARS_AUTO_AUDIT.txt.');
lines.push('This script checks source patterns, tests, and JavaScript syntax. It cannot see the rendered browser UI or prove real multiplayer security.');
lines.push('');

// 1. Automated tests.
lines.push('1. AUTOMATED TESTS');
if (pkg.scripts?.test) {
  const test = run('npm', ['test'], 180000);
  const testOutput = `${test.stdout}\n${test.stderr}`;
  const pass = testOutput.match(/# pass\s+(\d+)/i)?.[1] ?? testOutput.match(/(\d+) passing/i)?.[1];
  const fail = testOutput.match(/# fail\s+(\d+)/i)?.[1] ?? testOutput.match(/(\d+) failing/i)?.[1];
  lines.push(`Command: npm test`);
  lines.push(`Exit code: ${test.status ?? 'unknown'}${test.timedOut ? ' (TIMEOUT)' : ''}`);
  if (pass !== undefined || fail !== undefined) lines.push(`Parsed result: ${pass ?? '?'} passed, ${fail ?? '?'} failed`);
  if (test.error) lines.push(`Process error: ${test.error}`);
  lines.push('Output tail:');
  lines.push(testOutput.trim().split(/\r?\n/).slice(-38).map(x => `  ${x}`).join('\n') || '  (no output)');
  add('AUTO-TEST', test.status === 0 ? 'INFO' : 'P0', test.status === 0 ? 'PASSED' : 'FAILED', 'Node automated test suite',
    `npm test exited with ${test.status ?? 'unknown'}; ${pass ?? 'unknown'} passed; ${fail ?? 'unknown'} failed`,
    test.status === 0 ? 'Automated tests passed, but this does not prove browser rendering or production runtime behavior.' : 'Tests failed, timed out, or could not start.',
    'Resolve every failing test and rerun npm test. Then test the built game in a browser.');
} else {
  lines.push('SKIPPED: package.json has no test script.');
}
lines.push('');

// 2. JavaScript syntax.
lines.push('2. JAVASCRIPT SYNTAX CHECKS');
const jsFiles = walk(ROOT);
let syntaxFailures = [];
for (const file of jsFiles) {
  const check = run(process.execPath, ['--check', file], 20000);
  if (check.status !== 0) syntaxFailures.push({ file: relative(file), output: `${check.stderr}\n${check.stdout}`.trim() || check.error || `exit ${check.status}` });
}
lines.push(`JavaScript files checked: ${jsFiles.length}`);
lines.push(`Syntax failures: ${syntaxFailures.length}`);
if (syntaxFailures.length) {
  for (const failure of syntaxFailures) lines.push(`- ${failure.file}\n  ${failure.output.replace(/\r?\n/g, '\n  ')}`);
} else {
  lines.push('Result: all discovered JavaScript files passed node --check.');
}
add('SYNTAX', syntaxFailures.length ? 'P0' : 'INFO', syntaxFailures.length ? 'FAILED' : 'PASSED', 'JavaScript syntax',
  `${jsFiles.length} files checked; ${syntaxFailures.length} failures`,
  syntaxFailures.length ? 'At least one JavaScript file cannot be parsed by Node.' : 'Syntax checks passed. This does not check browser runtime behavior.',
  'Fix each syntax error and rerun the audit.');
lines.push('');

// 3. Production build availability.
lines.push('3. PRODUCTION BUILD CHECK');
const viteBin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
if (exists(viteBin) && pkg.scripts?.build) {
  const build = run('npm', ['run', 'build'], 180000);
  lines.push('Command: npm run build');
  lines.push(`Exit code: ${build.status ?? 'unknown'}${build.timedOut ? ' (TIMEOUT)' : ''}`);
  lines.push(`${build.stdout}\n${build.stderr}`.trim().split(/\r?\n/).slice(-50).map(x => `  ${x}`).join('\n'));
  add('BUILD', build.status === 0 ? 'INFO' : 'P0', build.status === 0 ? 'PASSED' : 'FAILED', 'Vite production build',
    `npm run build exited with ${build.status ?? 'unknown'}`,
    build.status === 0 ? 'Production assets were generated. Browser preview testing is still required.' : 'The production build failed.',
    'Fix the reported dependency, permission, import, or bundling error. Rerun npm run build.');
} else {
  lines.push('NOT RUN: Vite is not installed in node_modules or no build script exists.');
  lines.push('Run npm install, then run npm run build.');
  add('BUILD', 'P0', 'NOT RUN', 'Vite production build',
    'node_modules/.bin/vite was not found or build script is absent',
    'This audit cannot verify the deployable production bundle until dependencies are installed.',
    'Run npm install, resolve installation errors, then run npm run build.');
}
lines.push('');

// 4. Targeted project source checks.
lines.push('4. TARGETED SOURCE-LEVEL BUG CHECKS');
const fight = read('src/scenes/FightScene.js');
const select = read('src/scenes/SelectScene.js');
const validation = read('server/validation.js');
const server = read('server.js');
const html = read('index.html');
const input = read('src/input/InputController.js');
const onlineRoom = read('src/multiplayer/OnlineRoom.js');
const threeStage = read('src/three/ThreeStage.js');
const preview = read('src/characters/CustomizerPreview.js');
const css = read('src/style.css');
const main = read('src/main.js');

const createHudAt = fight.indexOf('this.createHud()');
const createPauseAt = fight.indexOf('this.createPauseButton()');
const layoutPause = /this\.pauseButton\.setPosition\(/.test(fight);
const createHudCallsLayout = /createHud\s*\([\s\S]*?this\.layoutHud\(/.test(fight);
add('BW-001', 'P0', createHudAt >= 0 && createPauseAt > createHudAt && createHudCallsLayout && layoutPause ? 'CONFIRMED' : 'NOT DETECTED',
  'Fight scene pause button initialization order',
  `FightScene.js createHud at ${createHudAt >= 0 ? fight.slice(0, createHudAt).split(/\n/).length : 'not found'}; createPauseButton at ${createPauseAt >= 0 ? fight.slice(0, createPauseAt).split(/\n/).length : 'not found'}; layoutHud touches pauseButton=${layoutPause}`,
  'If confirmed, first HUD layout calls setPosition before pauseButton is created. This can crash when entering a fight.',
  'Create the pause button before the first layoutHud call, or perform the initial layout after both HUD and buttons exist.');

const roomMax = html.match(/id=["']room-code["'][^>]*maxlength=["']?(\d+)/i)?.[1];
const serverSix = /\{6\}/.test(validation) && /randomBytes\(3\)/.test(server);
add('BW-002', 'P1', roomMax && serverSix && Number(roomMax) !== 6 ? 'CONFIRMED' : 'NOT DETECTED',
  'Online room code input length', `index.html maxlength=${roomMax ?? 'not found'}; server creates six hex characters and validates six`,
  'A joiner cannot type the complete room code if the input maxlength is shorter than the server code.',
  'Set the input maxlength and placeholder to six characters. Validate and uppercase the value on input.');

const onlineStart = select.match(/this\.scene\.start\(['"]FightScene['"],\s*\{([^}]*)\}\)/s)?.[1] || '';
add('BW-003', 'P1', /online\s*:\s*true/.test(onlineStart) && !/mode\s*:/.test(onlineStart) ? 'CONFIRMED' : 'NOT DETECTED',
  'Online mode flag passed into FightScene', `SelectScene room:start payload: ${onlineStart.replace(/\s+/g, ' ').trim() || 'not found'}`,
  'If mode is omitted and FightScene defaults to arcade, online matches can be classified as arcade for results/rewards.',
  'Pass mode: "online" explicitly and ensure match rewards and history distinguish online matches.');

const remoteId = /id:\s*this\.online\s*\?\s*['"]remote['"]\s*:\s*['"]cpu['"]/.test(fight);
const cpuRegistry = /addFighter\(['"]cpu['"]/.test(fight);
const modelUsesId = /fighters\.get\(fighter\.id\)/.test(threeStage) || /get\(fighter\.id\)/.test(threeStage);
add('BW-004', 'P1', remoteId && cpuRegistry && modelUsesId ? 'CONFIRMED' : 'NOT DETECTED',
  'Online remote fighter model registry ID mismatch',
  `FightScene uses online remote ID=${remoteId}; registers CPU model key=${cpuRegistry}; ThreeStage looks up fighter.id=${modelUsesId}`,
  'If keys differ, the render loop cannot find the opponent model for the online fighter.',
  'Use one consistent fighter ID for the online Fighter object, ThreeStage.addFighter, and render/update registry.');

const allowlist = validation.match(/ALLOWED_INPUTS[^\]]*\[([\s\S]*?)\]/)?.[1] || '';
const inputHasDash = /dashForward|dashBack/.test(input);
const serverHasDash = /dashForward|dashBack/.test(allowlist);
add('BW-005', 'P1', inputHasDash && !serverHasDash ? 'CONFIRMED' : 'NOT DETECTED',
  'Online dash fields filtered by server input allow-list',
  `InputController includes dash fields=${inputHasDash}; server allow-list includes dash fields=${serverHasDash}`,
  'The client can send dash state, but sanitizeInputPayload removes keys absent from ALLOWED_INPUTS.',
  'Add the intended dash fields to the server allow-list and validate their type and cooldown server-side.');

const leaveDefinition = /leave\s*\(\)\s*\{/.test(onlineRoom);
const leaveCalls = (fight.match(/onlineRoom\.leave\s*\(/g) || []).length + (select.match(/onlineRoom\.leave\s*\(/g) || []).length;
add('BW-006', 'P1', leaveDefinition && leaveCalls === 0 ? 'CONFIRMED' : 'NOT DETECTED',
  'Online room leave is not called from scene exit flows', `OnlineRoom.leave exists=${leaveDefinition}; scene call sites found=${leaveCalls}`,
  'A socket may remain associated with an old room, preventing the player from creating or joining another room.',
  'Call leave on every exit, match end, page teardown and relevant scene shutdown. Unsubscribe local listeners too.');

const peerEventsServer = /room:peer-disconnected/.test(server) && /room:peer-reconnected/.test(server);
const peerEventsClient = /room:peer-disconnected/.test(onlineRoom) || /room:peer-disconnected/.test(fight);
add('BW-007', 'P1', peerEventsServer && !peerEventsClient ? 'CONFIRMED' : 'NOT DETECTED',
  'Peer disconnect/reconnect notifications not handled by client', `Server emits both peer lifecycle events=${peerEventsServer}; client subscribes=${peerEventsClient}`,
  'Players may see a frozen/stale opponent without a proper reconnect state or clear UI feedback.',
  'Subscribe to peer disconnect/reconnect events. Pause or terminate the match according to a defined reconnect policy.');

const removeBlock = server.match(/function removePlayer\([\s\S]*?\n\}/)?.[0] || '';
const filtersPlayers = /room\.players\s*=\s*room\.players\.filter/.test(removeBlock);
const updatesSlot = /socket\.data\.slot\s*=/.test(removeBlock) || /\.slot\s*=\s*0/.test(removeBlock);
add('BW-008', 'P1', filtersPlayers && !updatesSlot ? 'CONFIRMED' : 'NOT DETECTED',
  'Room host removal does not reassign remaining socket slot', `removePlayer compacts player array=${filtersPlayers}; updates slot metadata=${updatesSlot}`,
  'After slot 0 leaves, the remaining slot 1 player can still refer to slot 1 while now occupying index 0. Ownership checks may fail.',
  'Reassign the surviving player slot and socket.data.slot atomically, and update host identity and role.');

const shakeChecked = /fighter\.settings\.shake['"]\)\s*!==\s*['"]0['"]/.test(fight);
const shakeOther = /fighter\.settings\.shake['"]\)\s*===\s*['"]0['"]/.test(fight);
const shakeStore = /fighter\.settings\.shake/.test(main) || /fighter\.settings\.shake/.test(read('src/scenes/MainMenuScene.js'));
add('BW-009', 'P2', shakeChecked && shakeOther && shakeStore ? 'CONFIRMED' : 'NOT DETECTED',
  'Reduce screen shake setting may be inverted or inconsistent', `FightScene has shake conditions for value != 0=${shakeChecked} and value == 0=${shakeOther}; setting UI/storage reference=${shakeStore}`,
  'The preference can produce more shake when Reduce screen shake is enabled, or inconsistent shake between hit paths.',
  'Define one boolean meaning (for example reduceShake=true) and apply it consistently to all camera shake calls.');

const cameraLookAt = /camera\.lookAt\s*\(/.test(preview);
const cameraZoom = /zoom\s*=\s*6\.8|6\.8/.test(preview);
add('BW-010', 'P1', cameraZoom && !cameraLookAt ? 'CONFIRMED' : 'NOT DETECTED',
  'Fighter creator camera may not be framed on the full model', `Preview uses fixed zoom=${cameraZoom}; explicit camera.lookAt=${cameraLookAt}`,
  'Screenshots show the fighter cut off at the top of the preview. Fixed camera placement without target framing can crop taller models.',
  'Fit the camera to the model bounding box, target the model center, and recompute on resize.');

const roomCodeRule = /maxlength=["']4["']/.test(html) && /\{6\}/.test(validation);
const creatorNestedScroll = /\.creator-panel\s*\{[^}]*overflow:\s*auto/s.test(css) && /\.creator-card\s*\{[^}]*overflow:\s*auto/s.test(css);
add('BW-011', 'P2', creatorNestedScroll ? 'CONFIRMED' : 'NOT DETECTED',
  'Fighter creator has nested scroll containers', 'src/style.css: both creator-panel and creator-card use overflow:auto',
  'Two independent scroll areas can make the preview and form awkward to navigate and can hide fields.',
  'Use one primary vertical scroll container. Keep the preview fixed or independently sized without a second vertical scrollbar.');

const listeners = (select.match(/onlineRoom\.on\s*\(/g) || []).length;
const unsubscribePattern = /\.off\s*\(|unsubscribe|removeListener/.test(select);
add('BW-012', 'P2', listeners > 0 && !unsubscribePattern ? 'CONFIRMED' : 'NOT DETECTED',
  'Online room event subscriptions may accumulate when panel is reopened', `SelectScene onlineRoom.on registrations=${listeners}; cleanup/off pattern in SelectScene=${unsubscribePattern}`,
  'Repeatedly opening the online panel may register duplicate callbacks and duplicate scene starts or status updates.',
  'Keep unsubscribe functions for each subscription and invoke them when the panel closes or scene shuts down.');

const lockfile = exists('package-lock.json') || exists('npm-shrinkwrap.json') || exists('pnpm-lock.yaml') || exists('yarn.lock');
add('BW-013', 'P2', lockfile ? 'NOT DETECTED' : 'CONFIRMED',
  'Dependency lockfile is missing', `Lockfile found=${lockfile}`,
  'Dependency version ranges may resolve to different package versions on different installs and deployments.',
  'Generate and commit the lockfile with the package manager used by the project. Use npm ci for repeatable CI/deploy builds.');

const audioNote = /volume sliders store preferences|audio mixer/i.test(html + css + main);
add('BW-014', 'P2', audioNote ? 'CONFIRMED' : 'NOT DETECTED',
  'Audio settings may only save values instead of controlling actual audio', `Project UI/source mentions future audio mixer=${audioNote}`,
  'Volume sliders that do not change music or sound effects appear functional but have no audio effect.',
  'Implement a central audio mixer with master/music/SFX buses, or clearly disable/label volume controls until audio exists.');

const resizeListener = /scale\.on\(['"]resize['"]/.test(fight + select);
const shutdownHook = /events\.once\(['"]shutdown['"]/.test(fight + select);
add('BW-015', 'P2', resizeListener && shutdownHook ? 'REVIEW' : 'NOT DETECTED',
  'Scene resize/listener cleanup needs lifecycle verification', `Scene scale resize listeners present=${resizeListener}; shutdown hooks present=${shutdownHook}`,
  'A listener that is not detached can run against destroyed scene objects after repeated navigation.',
  'Store listener references and call scale.off during shutdown. Repeat enter/exit cycles and inspect console and memory.');

const shakeLines = lineOf(fight, /this\.pauseButton\.setPosition\(/);
lines.push(`Targeted checks: ${findings.filter(x => x.id.startsWith('BW-')).length}`);
for (const f of findings.filter(x => x.id.startsWith('BW-'))) {
  lines.push('');
  lines.push(`${f.id} | ${f.severity} | ${f.status}`);
  lines.push(f.title);
  lines.push(`Evidence: ${f.evidence}`);
  lines.push(`Impact: ${f.impact}`);
  lines.push(`Recommended fix: ${f.recommendation}`);
}
lines.push('');

// 5. Project metadata and manual browser-only checks.
lines.push('5. PROJECT AND ENVIRONMENT');
lines.push(`package.json Node requirement: ${pkg.engines?.node || 'not specified'}`);
lines.push(`.nvmrc: ${read('.nvmrc').trim() || 'not present'}`);
lines.push(`Lockfile: ${lockfile ? 'present' : 'MISSING'}`);
lines.push(`node_modules: ${exists('node_modules') ? 'present' : 'not present'}`);
lines.push(`Vite executable: ${exists(viteBin) ? 'present' : 'not present'}`);
lines.push('');

// 6. Manual browser checks.
lines.push('6. MANUAL BROWSER CHECKS STILL REQUIRED');
lines.push('- Open the production preview URL and inspect DevTools Console and Network.');
lines.push('- Test main menu, fighter selection, creator, settings, Arcade, Training and Local Versus.');
lines.push('- Test screen sizes 1920x1080, 1366x768, 1280x666, 1024x768, 768x1024, 390x844 and 844x390.');
lines.push('- Test creator preview framing, all scroll controls, and keyboard/touch input.');
lines.push('- Test Online create/join with two separate browsers or devices, including host leave and reconnect.');
lines.push('- Run at least ten consecutive match start/finish/exit cycles and watch for errors or memory growth.');
lines.push('- Check fullscreen after pressing Escape, switching tabs, resizing and returning.');
lines.push('- Do not treat client-side combat as cheat-resistant. Server authority must be implemented before public ranked PvP.');
lines.push('');

// 7. Limitations.
lines.push('7. LIMITATIONS');
lines.push('- This script is a static/local audit. It does not edit or repair the game.');
lines.push('- It does not automate Chrome, click UI controls, measure layout boxes, or record screenshots.');
lines.push('- It cannot prove that anti-cheat is effective. Security requires adversarial testing and server-authoritative game state.');
lines.push('- A NOT DETECTED result means only that this simple source-pattern check did not find the issue. It is not proof that the feature is correct.');
lines.push('- Run npm install before expecting the Vite production build check to run.');
lines.push('');

// 8. Summary.
lines.push('8. SUMMARY');
const confirmed = findings.filter(f => f.status === 'CONFIRMED' || f.status === 'CONFIRMED IN SOURCE');
lines.push(`Total source findings flagged: ${findings.length}`);
lines.push(`Confirmed source findings: ${confirmed.length}`);
lines.push(`JavaScript files checked: ${jsFiles.length}`);
lines.push(`Syntax failures: ${syntaxFailures.length}`);

fs.writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');

console.log('Brawl Wars audit complete.');
console.log(`Report: ${OUT}`);
console.log(`JavaScript files checked: ${jsFiles.length}`);
console.log(`Syntax failures: ${syntaxFailures.length}`);
console.log(`Confirmed source findings: ${confirmed.length}`);
console.log('');
console.log('Note: Browser interaction and real multiplayer security still require manual testing.');
