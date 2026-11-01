import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const digest = value => createHash('sha256').update(value).digest('hex');
const cleanHandle = value => String(value ?? '').trim().toLowerCase();
const emptyStore = () => ({ accounts:[], sessions:[], bans:[], reports:[], mutes:[], blocks:[], appeals:[], logs:[] });

export class AccountService {
  constructor({ file = process.env.ACCOUNT_DATA_FILE || 'server-data/accounts.json', adminIds = (process.env.ADMIN_ACCOUNT_IDS || '').split(',').filter(Boolean), secret = process.env.AUTH_SECRET } = {}) {
    this.file = file; this.adminIds = new Set(adminIds); this.secret = secret || randomBytes(32).toString('hex');
    if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) throw new Error('AUTH_SECRET must be configured with at least 32 characters in production.');
    this.state = emptyStore();
  }

  async load() {
    try { this.state = { ...emptyStore(), ...JSON.parse(await readFile(this.file, 'utf8')) }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return this;
  }

  async save() {
    await mkdir(dirname(this.file), { recursive:true });
    const temp = `${this.file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(this.state), { mode:0o600 });
    await rename(temp, this.file);
  }

  async createSession(account) {
    const token = randomBytes(32).toString('base64url');
    const session = { id:randomUUID(), accountId:account.id, tokenHash:digest(token), expiresAt:Date.now()+30*24*60*60*1000 };
    this.state.sessions = this.state.sessions.filter(item => item.accountId !== account.id || item.expiresAt > Date.now());
    this.state.sessions.push(session); await this.save();
    return { token, expiresAt:session.expiresAt };
  }

  async register(handle, password) {
    const normalized=cleanHandle(handle);
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) throw new Error('Handle must be 3–20 letters, numbers or underscores.');
    if (typeof password!=='string'||password.length<12||password.length>128) throw new Error('Password must be 12–128 characters.');
    if (this.state.accounts.some(account=>account.handle===normalized)) throw new Error('That handle is already in use.');
    const salt=randomBytes(16).toString('hex');
    const passwordHash=(await scrypt(password,salt,64)).toString('hex');
    const account={id:randomUUID(),handle:normalized,passwordHash,salt,createdAt:Date.now(),profile:{level:1,xp:0,coins:0,wins:0,losses:0,unlocks:['atlas','volt','rook','neon']}};
    this.state.accounts.push(account); this.log('account.create',null,account.id,{handle:normalized});
    return {account:this.publicAccount(account),session:await this.createSession(account)};
  }

  async login(handle,password) {
    const account=this.state.accounts.find(item=>item.handle===cleanHandle(handle));
    const salt=account?.salt||'invalid-account-salt';
    const actual=await scrypt(String(password??''),salt,64);
    const expected=account ? Buffer.from(account.passwordHash,'hex') : Buffer.alloc(64);
    const valid=actual.length===expected.length&&timingSafeEqual(actual,expected)&&!!account;
    if (!valid) throw new Error('Handle or password is incorrect.');
    const session=await this.createSession(account);
    return {account:this.publicAccount(account),session,banned:this.activeBan(account.id)};
  }

  authenticate(token) {
    if (typeof token!=='string'||token.length>256) return null;
    const tokenHash=digest(token), row=this.state.sessions.find(item=>item.tokenHash===tokenHash&&item.expiresAt>Date.now());
    const account=this.state.accounts.find(item=>item.id===row?.accountId);
    return account ? { account:this.publicAccount(account), admin:this.adminIds.has(account.id), banned:this.activeBan(account.id) } : null;
  }

  publicAccount(account) { const { passwordHash,salt,...safe }=account; return safe; }
  activeBan(accountId) { const ban=this.state.bans.find(item=>item.accountId===accountId&&(!item.expiresAt||item.expiresAt>Date.now())); return ban||null; }
  isBlocked(a,b) { return this.state.blocks.some(item=>item.ownerId===a&&item.targetId===b); }

  async awardMatch(accountId, won) {
    const account=this.state.accounts.find(item=>item.id===accountId); if(!account)return null;
    const xp=won?60:25, coins=won?35:10;
    account.profile.xp+=xp; account.profile.coins+=coins;
    account.profile[won?'wins':'losses']++;
    while(account.profile.xp>=account.profile.level*100){account.profile.xp-=account.profile.level*100;account.profile.level++;}
    this.log('progression.match-reward',null,accountId,{won,xp,coins}); await this.save();
    return {xp,coins,profile:account.profile};
  }

  report(actorId,targetId,category,reason) {
    if(!this.state.accounts.some(item=>item.id===targetId)||actorId===targetId)throw new Error('Target account is invalid.');
    const report={id:randomUUID(),actorId,targetId,category:String(category??'other').slice(0,32),reason:String(reason??'').trim().slice(0,500),createdAt:Date.now(),status:'open'};
    if(!report.reason)throw new Error('A report reason is required.');
    this.state.reports.push(report);this.log('moderation.report',actorId,targetId,{reportId:report.id});return report;
  }
  setBlock(actorId,targetId,blocked=true) {
    if(actorId===targetId||!this.state.accounts.some(item=>item.id===targetId))throw new Error('Target account is invalid.');
    this.state.blocks=this.state.blocks.filter(item=>item.ownerId!==actorId||item.targetId!==targetId);
    if(blocked)this.state.blocks.push({ownerId:actorId,targetId,createdAt:Date.now()});
    this.log(blocked?'moderation.block':'moderation.unblock',actorId,targetId,{});
  }
  setMute(actorId,targetId,muted=true) {
    if(actorId===targetId||!this.state.accounts.some(item=>item.id===targetId))throw new Error('Target account is invalid.');
    this.state.mutes=this.state.mutes.filter(item=>item.ownerId!==actorId||item.targetId!==targetId);
    if(muted)this.state.mutes.push({ownerId:actorId,targetId,createdAt:Date.now()});
    this.log(muted?'moderation.mute':'moderation.unmute',actorId,targetId,{});
  }
  ban(adminId,targetId,reason,expiresAt=null) {
    if(!this.adminIds.has(adminId))throw new Error('Admin permission is required.');
    if(!this.state.accounts.some(item=>item.id===targetId)||!String(reason??'').trim())throw new Error('A target account and reason are required.');
    const expiry=expiresAt===null?null:Number(expiresAt);
    if(expiry!==null&&(!Number.isFinite(expiry)||expiry<=Date.now()))throw new Error('Ban expiry must be a future timestamp.');
    const ban={id:randomUUID(),accountId:targetId,reason:String(reason).trim().slice(0,500),createdAt:Date.now(),expiresAt:expiry,issuedBy:adminId};
    this.state.bans=this.state.bans.filter(item=>item.accountId!==targetId);this.state.bans.push(ban);
    this.log('moderation.ban',adminId,targetId,{banId:ban.id,expiresAt:expiry});return ban;
  }
  unban(adminId,targetId) {
    if(!this.adminIds.has(adminId))throw new Error('Admin permission is required.');
    const count=this.state.bans.length;this.state.bans=this.state.bans.filter(item=>item.accountId!==targetId);
    this.log('moderation.unban',adminId,targetId,{removed:count-this.state.bans.length});return count!==this.state.bans.length;
  }
  appeal(accountId,reason) {
    if(!this.activeBan(accountId))throw new Error('There is no active ban to appeal.');
    const text=String(reason??'').trim().slice(0,1000);if(!text)throw new Error('An appeal reason is required.');
    const appeal={id:randomUUID(),accountId,reason:text,createdAt:Date.now(),status:'open'};this.state.appeals.push(appeal);this.log('moderation.appeal',accountId,accountId,{appealId:appeal.id});return appeal;
  }
  log(action,actorId,targetId,details) { this.state.logs.push({id:randomUUID(),action,actorId,targetId,details,createdAt:Date.now()}); }
}
