const Database = require('better-sqlite3');
const db = new Database('share_register.sqlite');
db.pragma('foreign_keys = ON');


db.exec(`
DROP VIEW IF EXISTS cap_table;
DROP VIEW IF EXISTS class_totals_view;
DROP TABLE IF EXISTS share_transactions;
DROP TABLE IF EXISTS shareholders;
DROP TABLE IF EXISTS share_classes;

CREATE TABLE share_classes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  code             TEXT NOT NULL UNIQUE,         -- e.g. ORD, PREF
  name             TEXT NOT NULL,                -- e.g. Ordinary Shares
  currency         TEXT NOT NULL DEFAULT 'ZAR',
  nominal_value    REAL NOT NULL DEFAULT 0.01,   -- par value
  authorized_shares INTEGER NOT NULL             -- total authorized
);

CREATE TABLE shareholders (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  type   TEXT NOT NULL CHECK (type IN ('INDIVIDUAL','COMPANY')),
  name   TEXT NOT NULL UNIQUE,
  email  TEXT
);

-- Transaction-based ledger:
-- ISSUE:   from_shareholder_id = NULL, to_shareholder_id != NULL
-- TRANSFER: both from & to are NOT NULL
-- CANCEL/BUYBACK: from_shareholder_id != NULL, to_shareholder_id = NULL
CREATE TABLE share_transactions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts                     TEXT NOT NULL DEFAULT (datetime('now')),
  share_class_id         INTEGER NOT NULL,
  type                   TEXT NOT NULL CHECK (type IN ('ISSUE','TRANSFER','CANCEL','BUYBACK')),
  from_shareholder_id    INTEGER,
  to_shareholder_id      INTEGER,
  quantity               INTEGER NOT NULL CHECK (quantity > 0),
  note                   TEXT,
  FOREIGN KEY (share_class_id) REFERENCES share_classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (from_shareholder_id) REFERENCES shareholders(id) ON DELETE SET NULL,
  FOREIGN KEY (to_shareholder_id) REFERENCES shareholders(id) ON DELETE SET NULL,
  CHECK (
    (type='ISSUE'    AND from_shareholder_id IS NULL AND to_shareholder_id IS NOT NULL) OR
    (type='TRANSFER' AND from_shareholder_id IS NOT NULL AND to_shareholder_id IS NOT NULL) OR
    (type IN ('CANCEL','BUYBACK') AND from_shareholder_id IS NOT NULL AND to_shareholder_id IS NULL)
  )
);

CREATE INDEX idx_tx_class ON share_transactions(share_class_id);
CREATE INDEX idx_tx_to ON share_transactions(to_shareholder_id);
CREATE INDEX idx_tx_from ON share_transactions(from_shareholder_id);

-- Per-class outstanding total (issues - cancellations; transfers net to 0)
CREATE VIEW class_totals_view AS
SELECT
  sc.id AS share_class_id,
  sc.code AS share_class,
  SUM(CASE WHEN tx.to_shareholder_id IS NOT NULL THEN tx.quantity ELSE 0 END)
  - SUM(CASE WHEN tx.from_shareholder_id IS NOT NULL THEN tx.quantity ELSE 0 END) AS total_outstanding
FROM share_classes sc
LEFT JOIN share_transactions tx ON tx.share_class_id = sc.id
GROUP BY sc.id;

-- Cap table per shareholder & class
CREATE VIEW cap_table AS
WITH tx_by_holder AS (
  SELECT
    sc.id  AS share_class_id,
    sc.code AS share_class,
    sh.id  AS shareholder_id,
    sh.name AS shareholder,
    SUM(CASE WHEN tx.to_shareholder_id   = sh.id THEN tx.quantity ELSE 0 END)
  - SUM(CASE WHEN tx.from_shareholder_id = sh.id THEN tx.quantity ELSE 0 END) AS shares
  FROM shareholders sh
  CROSS JOIN share_classes sc
  LEFT JOIN share_transactions tx
    ON tx.share_class_id = sc.id
   AND (tx.to_shareholder_id = sh.id OR tx.from_shareholder_id = sh.id)
  GROUP BY sc.id, sh.id
)
SELECT
  t.share_class,
  t.shareholder,
  t.shares,
  ROUND(100.0 * t.shares / NULLIF(ct.total_outstanding, 0), 4) AS pct_of_class
FROM tx_by_holder t
JOIN class_totals_view ct ON ct.share_class_id = t.share_class_id
WHERE t.shares <> 0
ORDER BY t.share_class, t.shares DESC;
`);

// --- Seed dummy data in a single transaction ---
const seed = db.transaction(() => {
    // Share classes
    const insClass = db.prepare(`
    INSERT INTO share_classes (code, name, currency, nominal_value, authorized_shares)
    VALUES (?, ?, ?, ?, ?)
  `);
    const ord = insClass.run('ORD', 'Ordinary Shares', 'ZAR', 0.01, 1_000_000).lastInsertRowid;
    const pref = insClass.run('PREF', 'Preference Shares', 'ZAR', 0.01, 200_000).lastInsertRowid;

    // Shareholders
    const insHolder = db.prepare(`INSERT INTO shareholders (type, name, email) VALUES (?, ?, ?)`);
    const alice = insHolder.run('INDIVIDUAL', 'Alice Ndlovu', 'alice@example.com').lastInsertRowid;
    const bob = insHolder.run('INDIVIDUAL', 'Bob Mokoena', 'bob@example.com').lastInsertRowid;
    const acme = insHolder.run('COMPANY', 'ACME Ventures (Pty) Ltd', 'ops@acme.vc').lastInsertRowid;

    // Transactions
    const insTx = db.prepare(`
    INSERT INTO share_transactions (ts, share_class_id, type, from_shareholder_id, to_shareholder_id, quantity, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    // ORD issues
    insTx.run('2024-01-01T09:00:00', ord, 'ISSUE', null, alice, 600_000, 'Founders allocation');
    insTx.run('2024-01-02T09:00:00', ord, 'ISSUE', null, bob, 200_000, 'Founders allocation');
    insTx.run('2024-01-03T09:00:00', ord, 'ISSUE', null, acme, 200_000, 'Seed round');

    // Transfer (Alice -> Bob)
    insTx.run('2024-06-01T10:00:00', ord, 'TRANSFER', alice, bob, 50_000, 'Secondary transfer');

    // PREF issue (to ACME)
    insTx.run('2024-02-01T09:00:00', pref, 'ISSUE', null, acme, 50_000, 'Preference allocation');

    return { ord, pref, alice, bob, acme };
});

const refs = seed();


const addShareClass = ({ code, name, currency = 'ZAR', nominalValue = 0.01, authorizedShares = 0 }) => {
    const stmt = db.prepare(`
    INSERT INTO share_classes (code, name, currency, nominal_value, authorized_shares)
    VALUES (?, ?, ?, ?, ?)
  `);
    const info = stmt.run(code, name, currency, nominalValue, authorizedShares);
    return info.lastInsertRowid;
}

const addShareholder = ({ type, name, email }) => {
    const stmt = db.prepare(`
    INSERT INTO shareholders (type, name, email)
    VALUES (?, ?, ?)
  `);
    const info = stmt.run(type, name, email);
    return info.lastInsertRowid;
}

const addTransaction = ({ ts = new Date().toISOString(), shareClassId, type, fromShareholderId = null, toShareholderId = null, quantity, note }) => {
    const stmt = db.prepare(`
    INSERT INTO share_transactions (ts, share_class_id, type, from_shareholder_id, to_shareholder_id, quantity, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    const info = stmt.run(ts, shareClassId, type, fromShareholderId, toShareholderId, quantity, note);
    return info.lastInsertRowid;
}

const getShareClasses = () => {
    return db.prepare(`SELECT * FROM share_classes ORDER BY id`).all();
}

const getShareholders = () => {
    return db.prepare(`SELECT * FROM shareholders ORDER BY id`).all();
}

const getCapTable = () => {
    return db.prepare(`SELECT * FROM cap_table`).all();
}

const getClassTotals = () => {
    return db.prepare(`SELECT * FROM class_totals_view`).all();
}

const getTransactions = () => {
    return db.prepare(`
    SELECT
      tx.id, tx.ts, sc.code AS share_class, tx.type,
      hf.name AS from_holder, ht.name AS to_holder, tx.quantity, tx.note
    FROM share_transactions tx
    JOIN share_classes sc ON sc.id = tx.share_class_id
    LEFT JOIN shareholders hf ON hf.id = tx.from_shareholder_id
    LEFT JOIN shareholders ht ON ht.id = tx.to_shareholder_id
    ORDER BY tx.ts ASC, tx.id ASC
  `).all();
}

module.exports = {
    addShareClass,
    addShareholder,
    addTransaction,
    getShareClasses,
    getShareholders,
    getCapTable,
    getClassTotals,
    getTransactions
};