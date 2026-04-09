import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

/**
 * Database Initialization and Schema Management
 * 
 * This file sets up the SQLite database connection and defines the initial schema.
 * It also handles migrations (adding new tables/columns as the app evolves)
 * and seeds the database with default data if it's empty.
 */

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
export const db = new Database(dbPath);

// ==========================================
// Base Schema Initialization
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    company_name TEXT,
    role TEXT CHECK(role IN ('ADMIN', 'SUBCONTRACTOR'))
  );

  CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    category TEXT,
    description TEXT,
    assigned_company TEXT,
    target_due_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submittals (
    id TEXT PRIMARY KEY,
    requirement_id TEXT,
    revision_no INTEGER DEFAULT 0,
    file_url TEXT,
    status TEXT CHECK(status IN ('PENDING', 'SUBMITTED', 'REVISE_AND_RESUBMIT', 'APPROVED')),
    ball_in_court TEXT CHECK(ball_in_court IN ('SUBCONTRACTOR', 'GC')),
    reviewer_notes TEXT,
    submission_date TEXT,
    review_date TEXT,
    FOREIGN KEY(requirement_id) REFERENCES requirements(id)
  );
`);

// ==========================================
// Migrations
// ==========================================

/**
 * Migration: Projects
 * Adds the projects table and relates requirements to projects.
 */
const hasProjects = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get();
if (!hasProjects) {
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      start_date TEXT,
      end_date TEXT
    );
  `);
  
  try {
    db.exec(`ALTER TABLE requirements ADD COLUMN project_id TEXT REFERENCES projects(id);`);
  } catch (e) {
    // Ignore if column already exists
  }

  const defaultProjectId = crypto.randomUUID();
  db.prepare("INSERT INTO projects (id, name, description, start_date, end_date) VALUES (?, ?, ?, date('now', '-1 month'), date('now', '+5 months'))").run(
    defaultProjectId, 
    'Initial Project', 
    'Default project for existing submittals'
  );
  
  db.prepare('UPDATE requirements SET project_id = ? WHERE project_id IS NULL').run(defaultProjectId);
} else {
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN start_date TEXT;`);
    db.exec(`ALTER TABLE projects ADD COLUMN end_date TEXT;`);
    db.exec(`UPDATE projects SET start_date = date('now', '-1 month'), end_date = date('now', '+5 months') WHERE start_date IS NULL;`);
  } catch (e) {
    // Ignore if column already exists
  }
}

// Migration for inspections and milestones
const hasInspections = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inspections'").get();
if (!hasInspections) {
  db.exec(`
    CREATE TABLE inspections (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      type TEXT CHECK(type IN ('OBSERVATION', 'PUNCH_LIST')),
      description TEXT,
      assigned_company TEXT,
      status TEXT CHECK(status IN ('OPEN', 'RESOLVED', 'CLOSED')) DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    CREATE TABLE inspection_items (
      id TEXT PRIMARY KEY,
      inspection_id TEXT REFERENCES inspections(id),
      description TEXT,
      assigned_company TEXT,
      status TEXT CHECK(status IN ('OPEN', 'RESOLVED', 'CLOSED')) DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    CREATE TABLE milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      target_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE milestone_requirements (
      id TEXT PRIMARY KEY,
      milestone_id TEXT REFERENCES milestones(id),
      description TEXT,
      assigned_company TEXT,
      status TEXT CHECK(status IN ('PENDING', 'COMPLETED')) DEFAULT 'PENDING',
      completed_at TEXT
    );
  `);
} else {
  try {
    db.exec(`ALTER TABLE inspections ADD COLUMN name TEXT;`);
    db.exec(`UPDATE inspections SET name = 'Legacy Inspection' WHERE name IS NULL;`);
  } catch (e) {
    // Ignore if column already exists
  }
  
  const hasInspectionItems = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inspection_items'").get();
  if (!hasInspectionItems) {
    db.exec(`
      CREATE TABLE inspection_items (
        id TEXT PRIMARY KEY,
        inspection_id TEXT REFERENCES inspections(id),
        description TEXT,
        assigned_company TEXT,
        status TEXT CHECK(status IN ('OPEN', 'RESOLVED', 'CLOSED')) DEFAULT 'OPEN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT
      );
    `);
  }
}

// Migration for milestone activity
const hasMilestoneActivity = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='milestone_activity'").get();
if (!hasMilestoneActivity) {
  db.exec(`
    CREATE TABLE milestone_activity (
      id TEXT PRIMARY KEY,
      milestone_id TEXT REFERENCES milestones(id),
      user_id TEXT,
      user_name TEXT,
      activity_type TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Migration for milestone certificate
try {
  db.exec(`ALTER TABLE milestones ADD COLUMN certificate_url TEXT;`);
} catch (e) {
  // Ignore if column already exists
}

// Migration for milestone deliverables
const hasMilestoneDeliverables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='milestone_deliverables'").get();
if (!hasMilestoneDeliverables) {
  db.exec(`
    CREATE TABLE milestone_deliverables (
      id TEXT PRIMARY KEY,
      milestone_id TEXT REFERENCES milestones(id),
      description TEXT,
      ball_in_court TEXT,
      file_url TEXT,
      status TEXT CHECK(status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
} else {
  try {
    db.exec(`ALTER TABLE milestone_deliverables ADD COLUMN milestone_id TEXT REFERENCES milestones(id);`);
  } catch (e) {
    // Ignore if column already exists
  }
}

// Migration for inspection templates and ball in court
const hasTemplates = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inspection_templates'").get();
if (!hasTemplates) {
  db.exec(`
    CREATE TABLE inspection_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      type TEXT CHECK(type IN ('OBSERVATION', 'PUNCH_LIST')),
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE inspection_template_items (
      id TEXT PRIMARY KEY,
      template_id TEXT REFERENCES inspection_templates(id),
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

try {
  db.exec(`ALTER TABLE inspection_items ADD COLUMN ball_in_court TEXT CHECK(ball_in_court IN ('SUBCONTRACTOR', 'GC')) DEFAULT 'GC';`);
} catch (e) {
  // Ignore if column already exists
}

// Migration to update inspections status check constraint for REVIEW and remove CLOSED
const hasReviewStatusInspections = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inspections'").get() as { sql: string };
if (hasReviewStatusInspections && (!hasReviewStatusInspections.sql.includes("'REVIEW'") || hasReviewStatusInspections.sql.includes("'CLOSED'"))) {
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    CREATE TABLE inspections_new (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      type TEXT CHECK(type IN ('OBSERVATION', 'PUNCH_LIST')),
      description TEXT,
      assigned_company TEXT,
      status TEXT CHECK(status IN ('OPEN', 'REVIEW', 'RESOLVED')) DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    INSERT INTO inspections_new SELECT id, project_id, name, type, description, assigned_company, CASE WHEN status = 'CLOSED' THEN 'RESOLVED' ELSE status END, created_at, resolved_at FROM inspections;
    DROP TABLE inspections;
    ALTER TABLE inspections_new RENAME TO inspections;
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
}

// Migration to update inspection_items status check constraint for REVIEW
const hasReviewStatus = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='inspection_items'").get() as { sql: string };
if (hasReviewStatus && !hasReviewStatus.sql.includes("'REVIEW'")) {
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    CREATE TABLE inspection_items_new (
      id TEXT PRIMARY KEY,
      inspection_id TEXT REFERENCES inspections(id),
      description TEXT,
      assigned_company TEXT,
      status TEXT CHECK(status IN ('OPEN', 'REVIEW', 'RESOLVED')) DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      ball_in_court TEXT CHECK(ball_in_court IN ('SUBCONTRACTOR', 'GC')) DEFAULT 'GC'
    );
    INSERT INTO inspection_items_new SELECT id, inspection_id, description, assigned_company, CASE WHEN status = 'CLOSED' THEN 'RESOLVED' ELSE status END, created_at, resolved_at, ball_in_court FROM inspection_items;
    DROP TABLE inspection_items;
    ALTER TABLE inspection_items_new RENAME TO inspection_items;
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
}

// Migration for inspection item photos
const hasItemPhotos = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inspection_item_photos'").get();
if (!hasItemPhotos) {
  db.exec(`
    CREATE TABLE inspection_item_photos (
      id TEXT PRIMARY KEY,
      inspection_item_id TEXT REFERENCES inspection_items(id),
      file_url TEXT,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      tag TEXT CHECK(tag IN ('issue', 'solution')),
      location TEXT
    );
  `);
} else {
  try {
    db.exec(`ALTER TABLE inspection_item_photos ADD COLUMN tag TEXT CHECK(tag IN ('issue', 'solution'));`);
    db.exec(`ALTER TABLE inspection_item_photos ADD COLUMN location TEXT;`);
  } catch (e) {
    // Ignore if columns already exist
  }
}

// Migration for photos
const hasPhotos = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='photo_folders'").get();
if (!hasPhotos) {
  db.exec(`
    CREATE TABLE photo_folders (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE photos (
      id TEXT PRIMARY KEY,
      folder_id TEXT REFERENCES photo_folders(id),
      file_url TEXT,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Migration for drawings
const hasDrawings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drawing_sets'").get();
if (!hasDrawings) {
  db.exec(`
    CREATE TABLE drawing_sets (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      file_url TEXT,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_current INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0
    );
  `);
}

// Migration for contacts
const hasContacts = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'").get();
if (!hasContacts) {
  db.exec(`
    CREATE TABLE contacts (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT,
      email TEXT,
      phone TEXT,
      company_name TEXT,
      project_role TEXT CHECK(project_role IN ('ADMIN', 'SUBCONTRACTOR')) DEFAULT 'SUBCONTRACTOR',
      is_invited INTEGER DEFAULT 0,
      permissions TEXT
    );
  `);
} else {
  try {
    db.exec(`ALTER TABLE contacts ADD COLUMN permissions TEXT;`);
  } catch (e) {
    // Ignore if column already exists
  }
}

try {
  db.exec(`ALTER TABLE users ADD COLUMN permissions TEXT;`);
} catch (e) {
  // Ignore if column already exists
}

// Migration for procurement
const hasProcurement = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='procurement_items'").get();
if (!hasProcurement) {
  db.exec(`
    CREATE TABLE procurement_items (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      item_name TEXT,
      status TEXT CHECK(status IN ('PENDING', 'ORDERED', 'IN_TRANSIT', 'DELIVERED', 'INSTALLED')) DEFAULT 'PENDING',
      expected_delivery_date TEXT,
      assigned_company TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Rename existing template if it exists
try {
  db.prepare("UPDATE inspection_templates SET name = 'Construction Observations' WHERE name = 'Safety Observation'").run();
} catch (e) {
  // Ignore
}
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, email, name, company_name, role) VALUES (?, ?, ?, ?, ?)');
  insertUser.run(crypto.randomUUID(), 'admin@gc.com', 'Admin User', 'General Contractor Inc.', 'ADMIN');
  insertUser.run(crypto.randomUUID(), 'sub1@electric.com', 'Electric Sub', 'Sparky Electric', 'SUBCONTRACTOR');
  insertUser.run(crypto.randomUUID(), 'sub2@plumbing.com', 'Plumbing Sub', 'Pipe Masters', 'SUBCONTRACTOR');
}

// Seed templates and test inspection
const templateCount = db.prepare('SELECT COUNT(*) as count FROM inspection_templates').get() as { count: number };
if (templateCount.count === 0) {
  const defaultProject = db.prepare('SELECT id FROM projects LIMIT 1').get() as { id: string } | undefined;
  if (defaultProject) {
    const templateId1 = crypto.randomUUID();
    db.prepare('INSERT INTO inspection_templates (id, project_id, name, type, description) VALUES (?, ?, ?, ?, ?)').run(
      templateId1, defaultProject.id, 'Standard Punchlist', 'PUNCH_LIST', 'Standard end-of-project punchlist items'
    );
    db.prepare('INSERT INTO inspection_template_items (id, template_id, description) VALUES (?, ?, ?)').run(crypto.randomUUID(), templateId1, 'Check paint finish on all walls');
    db.prepare('INSERT INTO inspection_template_items (id, template_id, description) VALUES (?, ?, ?)').run(crypto.randomUUID(), templateId1, 'Verify all outlets are functional');
    db.prepare('INSERT INTO inspection_template_items (id, template_id, description) VALUES (?, ?, ?)').run(crypto.randomUUID(), templateId1, 'Ensure doors latch properly');

    const templateId2 = crypto.randomUUID();
    db.prepare('INSERT INTO inspection_templates (id, project_id, name, type, description) VALUES (?, ?, ?, ?, ?)').run(
      templateId2, defaultProject.id, 'Construction Observations', 'OBSERVATION', 'Routine safety walk items'
    );
    db.prepare('INSERT INTO inspection_template_items (id, template_id, description) VALUES (?, ?, ?)').run(crypto.randomUUID(), templateId2, 'Check for proper PPE usage');
    db.prepare('INSERT INTO inspection_template_items (id, template_id, description) VALUES (?, ?, ?)').run(crypto.randomUUID(), templateId2, 'Verify fall protection is in place');

    // Test Inspection Sandbox
    const testInspectionId = crypto.randomUUID();
    db.prepare('INSERT INTO inspections (id, project_id, name, type, description, assigned_company) VALUES (?, ?, ?, ?, ?, ?)').run(
      testInspectionId, defaultProject.id, 'Test Inspection Sandbox', 'PUNCH_LIST', 'A place to test inspection items', 'General Contractor Inc.'
    );
    db.prepare('INSERT INTO inspection_items (id, inspection_id, description, assigned_company, ball_in_court) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), testInspectionId, 'Test item 1 - Needs fixing', 'Sparky Electric', 'SUBCONTRACTOR'
    );
    db.prepare('INSERT INTO inspection_items (id, inspection_id, description, assigned_company, ball_in_court) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), testInspectionId, 'Test item 2 - Under review', 'General Contractor Inc.', 'GC'
    );
  }
}
