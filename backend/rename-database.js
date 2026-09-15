#!/usr/bin/env node
/**
 * rename-database.js — copy every collection from one database to another
 * inside the SAME Atlas cluster.
 *
 * Why this exists: the connection string in .env never named a database, so
 * Mongoose has been writing everything to MongoDB's default, `test`. MongoDB
 * has no "rename database" command — the only way to change the name is to
 * copy the collections across and drop the old ones afterwards.
 *
 * Uses the mongodb driver already present in backend/node_modules (a
 * dependency of mongoose), so there is nothing to install.
 *
 * Usage — run from the backend folder:
 *
 *   node rename-database.js check
 *       Lists collections and document counts in both databases side by side.
 *       Reads only. Start here, and run it again after the copy to verify.
 *
 *   node rename-database.js copy
 *       Copies test -> university_makran, indexes included. Refuses to run if
 *       the target already holds collections.
 *
 *   node rename-database.js copy --drop
 *       Same, but empties each target collection first. Use this to re-run a
 *       copy that went wrong.
 *
 * Options:
 *   --from=<name>   source database      (default: test)
 *   --to=<name>     destination database (default: university_makran)
 *
 * This script NEVER touches the source database. Dropping `test` once you are
 * satisfied is a separate, deliberate step you do by hand.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const command = argv.find((a) => !a.startsWith('--')) || 'check';
  const flag = (name, fallback) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    command,
    from: flag('from', 'test'),
    to: flag('to', 'university_makran'),
    drop: argv.includes('--drop'),
  };
}

const BATCH = 500;

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function die(message) {
  console.error(`\n${c.red('ERROR')}  ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Real, user-created collections only — no views, no system.* internals. */
async function listCollections(db) {
  const all = await db.listCollections({}, { nameOnly: false }).toArray();
  return all
    .filter((x) => x.type !== 'view' && !x.name.startsWith('system.'))
    .map((x) => x.name)
    .sort();
}

async function countsFor(db) {
  const names = await listCollections(db);
  const rows = [];
  for (const name of names) {
    rows.push([name, await db.collection(name).countDocuments()]);
  }
  return rows;
}

function printTable(title, rows) {
  console.log(`\n${c.bold(title)}`);
  if (!rows.length) {
    console.log(c.dim('  (no collections)'));
    return;
  }
  const w = Math.max(...rows.map((r) => r[0].length));
  let total = 0;
  for (const [name, n] of rows) {
    total += n;
    console.log(`  ${name.padEnd(w)}  ${String(n).padStart(8)}`);
  }
  console.log(c.dim(`  ${'total'.padEnd(w)}  ${String(total).padStart(8)}`));
}

/**
 * Index definitions come back with server-assigned fields that createIndexes
 * rejects on the way back in. Strip those, keep everything meaningful —
 * unique, sparse, partialFilterExpression, collation, expireAfterSeconds,
 * text weights — so the constraints on roll numbers, employee IDs and the
 * rest survive the copy.
 */
function cleanIndexSpec(idx) {
  const { v, ns, textIndexVersion, '2dsphereIndexVersion': sphere, background, ...keep } = idx;
  return keep;
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

async function check(client, { from: FROM, to: TO }) {
  const src = await countsFor(client.db(FROM));
  const dst = await countsFor(client.db(TO));

  printTable(`${FROM}  (source)`, src);
  printTable(`${TO}  (destination)`, dst);

  if (!dst.length) {
    console.log(`\n${c.yellow('\u2192')} "${TO}" is empty. Run:  node rename-database.js copy\n`);
    return;
  }

  // Side-by-side comparison — the whole point of running this again after a copy.
  const srcMap = new Map(src);
  const dstMap = new Map(dst);
  const names = [...new Set([...srcMap.keys(), ...dstMap.keys()])].sort();
  const w = Math.max(...names.map((n) => n.length));

  console.log(`\n${c.bold('Comparison')}`);
  let ok = true;
  for (const name of names) {
    const a = srcMap.has(name) ? srcMap.get(name) : null;
    const b = dstMap.has(name) ? dstMap.get(name) : null;
    const same = a === b;
    if (!same) ok = false;
    console.log(
      `  ${same ? c.green('\u2713') : c.red('\u2717')} ${name.padEnd(w)}  ` +
        `${String(a === null ? '\u2014' : a).padStart(8)} \u2192 ${String(b === null ? '\u2014' : b).padStart(8)}`
    );
  }
  console.log(
    ok
      ? `\n${c.green('All counts match.')} Safe to point MONGO_URI at "${TO}".\n`
      : `\n${c.red('Counts differ.')} Re-run:  node rename-database.js copy --drop\n`
  );
  return ok;
}

async function copy(client, { from: FROM, to: TO, drop: DROP }) {
  const src = client.db(FROM);
  const dst = client.db(TO);

  const names = await listCollections(src);
  if (!names.length) {
    die(`"${FROM}" has no collections. Run "check" to see which databases hold data.`);
  }

  const existing = await listCollections(dst);
  if (existing.length && !DROP) {
    die(
      `"${TO}" already contains ${existing.length} collection(s).\n` +
        `        Copying again would duplicate every document.\n` +
        `        If the previous copy was wrong, re-run with --drop to replace them.`
    );
  }

  console.log(`\n${c.bold(`Copying ${FROM} \u2192 ${TO}`)}${DROP ? c.yellow('  (--drop)') : ''}\n`);

  const summary = [];

  for (const name of names) {
    const from = src.collection(name);
    const to = dst.collection(name);
    const expected = await from.countDocuments();

    if (DROP && existing.includes(name)) {
      await to.drop().catch(() => {});
    }

    // Create it even when empty, so an empty collection does not silently
    // vanish from the new database.
    await dst.createCollection(name).catch(() => {});

    let moved = 0;
    if (expected > 0) {
      const cursor = from.find({}, { batchSize: BATCH });
      let buffer = [];
      for await (const doc of cursor) {
        buffer.push(doc);
        if (buffer.length >= BATCH) {
          await to.insertMany(buffer, { ordered: false });
          moved += buffer.length;
          buffer = [];
          process.stdout.write(`\r  ${name}  ${moved}/${expected}   `);
        }
      }
      if (buffer.length) {
        await to.insertMany(buffer, { ordered: false });
        moved += buffer.length;
      }
    }

    // Indexes after the data: faster to build, and a unique index cannot
    // reject documents mid-copy.
    let indexCount = 0;
    const specs = (await from.indexes())
      .filter((i) => i.name !== '_id_')
      .map(cleanIndexSpec);
    if (specs.length) {
      try {
        await to.createIndexes(specs);
        indexCount = specs.length;
      } catch (err) {
        console.log(`\r  ${c.yellow('!')} ${name}: index copy failed \u2014 ${err.message}`);
      }
    }

    const actual = await to.countDocuments();
    const good = actual === expected;
    process.stdout.write(
      `\r  ${good ? c.green('\u2713') : c.red('\u2717')} ${name}  ` +
        `${actual}/${expected} docs, ${indexCount} index(es)${' '.repeat(14)}\n`
    );
    summary.push([name, expected, actual, good]);
  }

  const failed = summary.filter((r) => !r[3]);
  const totalFrom = summary.reduce((s, r) => s + r[1], 0);
  const totalTo = summary.reduce((s, r) => s + r[2], 0);

  console.log(
    `\n${failed.length === 0 ? c.green('Done.') : c.red('Finished with problems.')} ` +
      `${totalTo}/${totalFrom} documents across ${summary.length} collections.`
  );

  if (failed.length) {
    console.log(c.red(`\nThese did not match: ${failed.map((r) => r[0]).join(', ')}`));
    console.log('Re-run with --drop, then run "check" again.\n');
    process.exitCode = 1;
    return false;
  }

  console.log(`
${c.bold('Next:')}
  1. node rename-database.js check          ${c.dim('# confirm both sides match')}
  2. Edit .env \u2014 put the database name before the "?":
     ${c.dim('...mongodb.net/')}${c.green(TO)}${c.dim('?ssl=true&replicaSet=...')}
  3. npm run dev                            ${c.dim('# expect "MongoDB connected"')}
  4. Click through the admin dashboard and a student portal.

${c.dim(`"${FROM}" is untouched. Leave it for a couple of weeks, then drop it.`)}
`);
  return true;
}

// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!process.env.MONGO_URI) {
    die('MONGO_URI is not set. Run this from the backend folder, where .env lives.');
  }
  if (opts.from === opts.to) {
    die(`--from and --to are both "${opts.from}". Nothing to do.`);
  }
  if (!['check', 'copy'].includes(opts.command)) {
    die(`Unknown command "${opts.command}". Use "check" or "copy".`);
  }

  const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
  } catch (err) {
    die(
      `Could not connect to the cluster.\n        ${err.message}\n\n` +
        `        Usual causes: your current IP is not in Atlas Network Access,\n` +
        `        or the password in MONGO_URI is wrong or needs percent-encoding.`
    );
  }
  try {
    if (opts.command === 'check') await check(client, opts);
    else await copy(client, opts);
  } catch (err) {
    console.error(`\n${c.red('FAILED')}  ${err.message}\n`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main();
} else {
  // Exported so the logic can be unit-tested without a live cluster.
  module.exports = { parseArgs, cleanIndexSpec, listCollections, countsFor, check, copy };
}
