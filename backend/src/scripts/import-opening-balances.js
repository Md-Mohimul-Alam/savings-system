/* Place in backend/src/scripts (models at ../models), or backend/scripts.
   Run from backend: node src/scripts/import-opening-balances.js
   Apply: node src/scripts/import-opening-balances.js --apply --admin-id=<admin User _id>
*/
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const Member = require('../models/Member');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Transaction = require('../models/Transaction');
const CashLock = mongoose.models.CashLock || mongoose.model('CashLock', new mongoose.Schema({
  _id: String, version: { type: Number, default: 0 },
}));
const scope = 'live';
const tag = 'opening-through-2025-v1';
// Accounting cutoff, not a claimed historical cash receipt date.
const cutoff = new Date('2025-12-31T23:59:59+06:00');
const membersExpected = [
  ['6aba8b7636300f5af4e0ccae', 'Fardin Ali Khan'],
  ['6aba8b89ee5f1b5f0cf50ee1', 'Mohammad Majed'],
  ['6abab679fc9caceb64ac2ea5', 'Eftekharul Islam'],
  ['6abab67e1f4d927448531262', 'SHAFAYATH HOSSAIN SHAOWN'],
  ['6aba8b8336300f5af4e0ccb0', 'Md. Eiftaher Uddin Farhad'],
  ['6abe4f6599011dab5776a12d', 'Mohammad saiful islam'],
  ['6ababde3f351d46281be38a3', 'Armanul Nahin'],
];
const openingTypes = ['OPENING_BALANCE', 'OPENING_CONTRIBUTION', 'OPENING_SAVINGS', 'OPENING_FINE'];
const idFor = key => new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`${scope}:${tag}:${key}`).digest('hex').slice(0, 24));
const cents = value => {
  const n = Number(value), p = Math.round(n * 100);
  if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(p) || Math.abs(n * 100 - p) > 0.000001) throw Error('Invalid stored money amount');
  return p;
};
const assert = (condition, message) => { if (!condition) throw Error(message); };
const apply = process.argv.includes('--apply');
const adminId = process.argv.find(a => a.startsWith('--admin-id='))?.slice(11);

async function inspect(session) {
  const query = model => model.session(session || null);
  const members = await query(Member.find({ _id: { $in: membersExpected.map(([id]) => id) }, dataScope: scope }));
  assert(members.length === 7, 'Expected all seven supplied member IDs in live data. No changes made.');
  const openings = await query(Transaction.find({ dataScope: scope, type: { $in: openingTypes } }));
  const expectedIds = new Set([...membersExpected.map(([id]) => String(idFor(id))), String(idFor('fine'))]);
  assert(openings.every(e => expectedIds.has(String(e._id))), 'Existing opening ledger entries require reconciliation; refusing to duplicate or replace them.');
  assert(openings.length === 0 || openings.length === 8, 'Partial opening import detected; reconcile before continuing.');
  const done = openings.length === 8;
  const records = await query(Contribution.find({ member: { $in: members.map(m => m._id) }, dataScope: scope }).select('member paidAmount'));
  const rows = [];
  for (const [id, name] of membersExpected) {
    const m = members.find(item => String(item._id) === id);
    assert(m.membershipStatus === 'active', `${name} is not active; reconcile membership first.`);
    const currentOpening = cents(m.openingContribution || 0);
    assert(currentOpening === (done ? 1804000 : 0), `${name}: existing opening savings conflict; no changes made.`);
    const monthly = records.filter(c => String(c.member) === id).reduce((sum, c) => sum + cents(c.paidAmount || 0), 0);
    const current = cents(m.totalContribution || 0);
    assert(Number.isSafeInteger(monthly) && current === monthly + currentOpening,
      `${name}: member total does not match contribution records plus opening savings. Reconcile first.`);
    assert(Number.isSafeInteger(current + (done ? 0 : 1804000)), 'Total exceeds supported range');
    rows.push({ member: name, memberCode: m.memberCode, existingSavings: current / 100, openingToAdd: done ? 0 : 18040, resultingSavings: current / 100 + (done ? 0 : 18040) });
    if (done) {
      const e = openings.find(e => String(e._id) === String(idFor(id)));
      assert(e && e.type === 'OPENING_CONTRIBUTION' && e.direction === 'IN' && cents(e.amount) === 1804000 && String(e.member) === id && e.referenceType === 'OpeningBalanceImport' && String(e.referenceId) === String(idFor('batch')) && new Date(e.transactionDate).getTime() === cutoff.getTime(), 'Existing imported savings ledger entry was changed.');
      assert(m.openingBalanceDate && new Date(m.openingBalanceDate).getTime() === cutoff.getTime(), 'Existing opening cutoff differs.');
    }
  }
  if (done) {
    const e = openings.find(e => String(e._id) === String(idFor('fine')));
    assert(e && e.type === 'OPENING_FINE' && e.direction === 'IN' && cents(e.amount) === 206000 && !e.member && e.referenceType === 'OpeningBalanceImport' && String(e.referenceId) === String(idFor('batch')) && new Date(e.transactionDate).getTime() === cutoff.getTime(), 'Existing opening fine entry differs.');
  }
  return { done, members, rows };
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  assert(uri, 'Missing MONGO_URI / MONGODB_URI in backend/.env');
  await mongoose.connect(uri);
  for (const field of ['openingContribution', 'openingBalanceDate', 'totalContribution']) assert(Member.schema.path(field), `Member model missing ${field}`);
  const types = Transaction.schema.path('type')?.enumValues || [];
  assert(types.includes('OPENING_CONTRIBUTION') && types.includes('OPENING_FINE'), 'Update Transaction model to allow OPENING_CONTRIBUTION and OPENING_FINE');
  const preview = await inspect(null);
  console.table(preview.rows);
  console.log('Opening savings: 126280 BDT; shared opening fines: 2060 BDT; opening fund: 128340 BDT.');
  if (preview.done) { console.log('Already imported and verified. Nothing changed.'); return; }
  if (!apply) { console.log('DRY RUN: nothing written. Review database, members and totals, then rerun with --apply --admin-id=<admin User _id>.'); return; }
  assert(/^[a-f\d]{24}$/i.test(adminId || ''), 'Supply --admin-id=<admin User _id>');
  const admin = await User.findOne({ _id: adminId, role: 'admin', status: 'active', dataScope: scope, isDemo: { $ne: true } });
  assert(admin, 'An active live admin is required');
  try { await CashLock.updateOne({ _id: scope }, { $setOnInsert: { version: 0 } }, { upsert: true }); }
  catch (e) { if (e.code !== 11000) throw e; }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await CashLock.updateOne({ _id: scope }, { $inc: { version: 1 } }, { session });
      const state = await inspect(session);
      if (state.done) return;
      for (const m of state.members) {
        m.openingContribution = 18040;
        m.openingBalanceDate = cutoff;
        m.totalContribution = (cents(m.totalContribution || 0) + 1804000) / 100;
        await m.save({ session });
        await Transaction.create([{
          _id: idFor(String(m._id)), type: 'OPENING_CONTRIBUTION', direction: 'IN', amount: 18040,
          member: m._id, referenceType: 'OpeningBalanceImport', referenceId: idFor('batch'),
          description: `${tag}: accumulated personal savings Aug 2021–Dec 2025; accounting opening balance`,
          transactionDate: cutoff, createdBy: admin._id, dataScope: scope,
        }], { session });
      }
      await Transaction.create([{
        _id: idFor('fine'), type: 'OPENING_FINE', direction: 'IN', amount: 2060, member: null,
        referenceType: 'OpeningBalanceImport', referenceId: idFor('batch'),
        description: `${tag}: total shared fines collected through Dec 2025; accounting opening balance`,
        transactionDate: cutoff, createdBy: admin._id, dataScope: scope,
      }], { session });
      assert((await inspect(session)).done, 'Import verification failed');
    });
  } finally { await session.endSession(); }
  console.log('Opening balances committed and verified. Existing monthly contributions preserved.');
}
main().catch(error => { console.error('Import stopped:', error.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
