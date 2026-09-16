#!/usr/bin/env node
/**
 * set-admin-password.js — change an admin account's login email or password.
 *
 * The admin dashboard has no "change password" screen and the API has no route
 * for it, so the only way to change these is to write directly to the database.
 * Passwords are stored as bcrypt hashes and checked with bcrypt.compare() at
 * login, so this hashes the new password the same way before saving it.
 *
 * Uses bcryptjs and the mongodb driver already in backend/node_modules —
 * nothing to install.
 *
 * Run from the backend folder:
 *
 *   node set-admin-password.js
 *       Lists the admin accounts (emails and roles only, never passwords).
 *
 *   node set-admin-password.js <email> <newPassword>
 *       Sets that account's password.
 *
 *   node set-admin-password.js <email> <newPassword> --new-email=<address>
 *       Sets the password and changes the login email at the same time.
 *
 * Note your new password will be visible in the shell history. After running
 * this, clear it with:   history -c
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function die(msg) {
  console.error(`\n${c.red('ERROR')}  ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (const a of argv) {
    const m = /^--([a-z-]+)=(.*)$/.exec(a);
    if (m) flags[m[1]] = m[2];
    else positional.push(a);
  }
  return {
    email: positional[0],
    password: positional[1],
    newEmail: flags['new-email'],
  };
}

// The connection string names the database (…/university_makran?…), so
// client.db() with no argument picks it up. The fallback is only for a URI
// that omits it — the very situation that put this data in `test` originally.
function dbFrom(client, uri) {
  const m = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(uri);
  return m && m[1] ? client.db(m[1]) : client.db('university_makran');
}

(async () => {
  const { email, password, newEmail } = parseArgs(process.argv.slice(2));

  if (!process.env.MONGO_URI) {
    die('MONGO_URI is not set. Run this from the backend folder, where .env lives.');
  }

  const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
  } catch (err) {
    die(`Could not connect to the database.\n        ${err.message}`);
  }

  try {
    const admins = dbFrom(client, process.env.MONGO_URI).collection('admins');

    // ---- no arguments: just show what exists -----------------------------
    if (!email) {
      const rows = await admins
        .find({}, { projection: { email: 1, name: 1, role: 1, createdAt: 1 } })
        .toArray();

      if (!rows.length) {
        console.log(`\n${c.yellow('No admin accounts found.')}\n`);
        return;
      }

      console.log(`\n${c.bold('Admin accounts')}\n`);
      for (const r of rows) {
        console.log(`  ${r.email}${r.name ? c.dim(`  (${r.name})`) : ''}${r.role ? c.dim(`  [${r.role}]`) : ''}`);
      }
      console.log(`\n${c.dim('To change one:')}  node set-admin-password.js <email> <newPassword>\n`);
      return;
    }

    if (!password) {
      die('Missing the new password.\n        Usage: node set-admin-password.js <email> <newPassword>');
    }
    if (password.length < 10) {
      die(`That password is ${password.length} characters. Use at least 10 — this account can read and change every student record.`);
    }

    const target = String(email).trim().toLowerCase();
    const existing = await admins.findOne({ email: target });
    if (!existing) {
      const all = await admins.find({}, { projection: { email: 1 } }).toArray();
      die(
        `No admin with the email "${target}".\n` +
          `        Accounts that exist: ${all.map((a) => a.email).join(', ') || '(none)'}`
      );
    }

    // Same cost factor the rest of the app uses for its bcrypt hashes.
    const hash = await bcrypt.hash(password, 10);
    const update = { password: hash };
    if (newEmail) update.email = String(newEmail).trim().toLowerCase();

    const res = await admins.updateOne({ _id: existing._id }, { $set: update });
    if (res.modifiedCount !== 1) die('The update did not apply. Nothing was changed.');

    console.log(`\n${c.green('Updated.')}`);
    console.log(`  login email : ${update.email || existing.email}`);
    console.log(`  password    : changed ${c.dim('(stored as a bcrypt hash)')}`);
    console.log(`\n${c.dim('Sign in at https://admin.uomp.edu.pk with the new details.')}`);
    console.log(`${c.dim('Then clear your shell history:')}  history -c\n`);
  } catch (err) {
    console.error(`\n${c.red('FAILED')}  ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
