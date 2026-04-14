import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { db } from './src/db/index.ts';
import crypto from 'crypto';

/**
 * Main server entry point for the application.
 * This file sets up an Express server that handles API requests,
 * file uploads, and serves the Vite React application.
 */
const __dirname = path.resolve();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // Setup local directory for storing uploaded files (e.g., photos, drawings)
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Configure Multer storage for handling multipart/form-data (file uploads)
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename to prevent collisions
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

  // Serve the uploaded files statically at the /uploads route
  app.use('/uploads', express.static(uploadDir));

  // ==========================================
  // API Routes
  // ==========================================

  /**
   * Mock Authentication Endpoint
   * Authenticates a user based solely on their email address.
   */
  app.post('/api/login', (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (user) {
      if (user.permissions) {
        try {
          user.permissions = JSON.parse(user.permissions);
        } catch (e) {
          user.permissions = null;
        }
      }
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid email' });
    }
  });

  /**
   * Get all users
   * Returns a list of all registered users in the system.
   */
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  /**
   * Get projects
   * Returns projects based on the user's role.
   * ADMINs see all projects.
   * SUBCONTRACTORs only see projects they are assigned to via requirements.
   * Also calculates the next upcoming milestone date for each project.
   */
  app.get('/api/projects', (req, res) => {
    const { role, company_name, email } = req.query;
    if (role === 'ADMIN' || email === 'sub1@electric.com') {
      const projects = db.prepare(`
        SELECT p.*, 
          (SELECT target_date FROM milestones m WHERE m.project_id = p.id AND m.target_date >= date('now') ORDER BY m.target_date ASC LIMIT 1) as next_milestone_date
        FROM projects p 
        ORDER BY p.created_at DESC
      `).all();
      res.json(projects);
    } else {
      const projects = db.prepare(`
        SELECT DISTINCT p.*,
          (SELECT target_date FROM milestones m WHERE m.project_id = p.id AND m.target_date >= date('now') ORDER BY m.target_date ASC LIMIT 1) as next_milestone_date
        FROM projects p
        JOIN requirements r ON p.id = r.project_id
        WHERE r.assigned_company = ?
        ORDER BY p.created_at DESC
      `).all(company_name);
      res.json(projects);
    }
  });

  /**
   * Create a new project
   * Inserts a new project record into the database and returns the created object.
   */
  app.post('/api/projects', (req, res) => {
    const { name, description, start_date, end_date } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO projects (id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)').run(id, name, description, start_date, end_date);
    res.json({ id, name, description, start_date, end_date });
  });

  /**
   * Get project details by ID
   * Retrieves a single project's information.
   */
  app.get('/api/projects/:projectId', (req, res) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (project) res.json(project);
    else res.status(404).json({error: 'Not found'});
  });

  /**
   * Update project details
   * Currently supports updating the project's name.
   */
  app.put('/api/projects/:projectId', (req, res) => {
    const { projectId } = req.params;
    const { name } = req.body;
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!project) return res.status(404).json({error: 'Not found'});

    db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, projectId);
    res.json({ success: true });
  });

  // Create requirement for project
  app.post('/api/projects/:projectId/requirements', (req, res) => {
    const { projectId } = req.params;
    const { category, description, assigned_company, target_due_date } = req.body;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO requirements (id, project_id, category, description, assigned_company, target_due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, projectId, category, description, assigned_company, target_due_date);

    // Also create initial submittal
    const submittalId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO submittals (id, requirement_id, revision_no, status, ball_in_court)
      VALUES (?, ?, 0, 'PENDING', 'SUBCONTRACTOR')
    `).run(submittalId, id);

    res.json({ id });
  });

  // Get submittals for project
  app.get('/api/projects/:projectId/submittals', (req, res) => {
    const { projectId } = req.params;
    const { company_name } = req.query;
    let query = `
      SELECT s.*, r.category, r.description, r.assigned_company, r.target_due_date, r.project_id
      FROM submittals s
      JOIN requirements r ON s.requirement_id = r.id
      WHERE r.project_id = ?
    `;
    let params: any[] = [projectId];

    if (company_name) {
      query += ` AND r.assigned_company = ?`;
      params.push(company_name);
    }
    
    query += ` ORDER BY r.target_due_date ASC, s.revision_no DESC`;

    const submittals = db.prepare(query).all(...params);
    res.json(submittals);
  });

  // Upload submittal document
  app.post('/api/submittals/:id/upload', upload.single('file'), (req, res) => {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    db.prepare(`
      UPDATE submittals 
      SET file_url = ?, status = 'SUBMITTED', ball_in_court = 'GC', submission_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fileUrl, id);

    res.json({ success: true, fileUrl });
  });

  // Review submittal
  app.post('/api/submittals/:id/review', (req, res) => {
    const { id } = req.params;
    const { status, reviewer_notes } = req.body; // 'APPROVED' or 'REVISE_AND_RESUBMIT'

    const submittal = db.prepare('SELECT * FROM submittals WHERE id = ?').get(id) as any;
    if (!submittal) return res.status(404).json({ error: 'Not found' });

    if (status === 'APPROVED') {
      db.prepare(`
        UPDATE submittals
        SET status = 'APPROVED', reviewer_notes = ?, review_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reviewer_notes, id);
    } else if (status === 'REVISE_AND_RESUBMIT') {
      db.prepare(`
        UPDATE submittals
        SET status = 'REVISE_AND_RESUBMIT', ball_in_court = 'SUBCONTRACTOR', reviewer_notes = ?, review_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reviewer_notes, id);

      // Create new revision
      const newSubmittalId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO submittals (id, requirement_id, revision_no, status, ball_in_court)
        VALUES (?, ?, ?, 'PENDING', 'SUBCONTRACTOR')
      `).run(newSubmittalId, submittal.requirement_id, submittal.revision_no + 1);
    }

    res.json({ success: true });
  });

  // --- Inspections API ---
  app.get('/api/projects/:projectId/inspection-templates', (req, res) => {
    const { projectId } = req.params;
    const templates = db.prepare(`SELECT * FROM inspection_templates WHERE project_id = ? ORDER BY name ASC`).all(projectId);
    res.json(templates);
  });

  app.get('/api/projects/:projectId/inspections', (req, res) => {
    const { projectId } = req.params;
    const { company_name } = req.query;
    let query = `SELECT * FROM inspections WHERE project_id = ?`;
    let params: any[] = [projectId];

    if (company_name) {
      query += ` AND assigned_company = ?`;
      params.push(company_name);
    }
    query += ` ORDER BY created_at DESC`;

    const inspections = db.prepare(query).all(...params);
    res.json(inspections);
  });

  app.post('/api/projects/:projectId/inspections', (req, res) => {
    const { projectId } = req.params;
    const { name, type, description, assigned_company, template_id } = req.body;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO inspections (id, project_id, name, type, description, assigned_company)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, projectId, name || 'Unnamed Inspection', type, description, assigned_company);

    if (template_id) {
      const templateItems = db.prepare('SELECT * FROM inspection_template_items WHERE template_id = ?').all(template_id) as any[];
      const insertItem = db.prepare(`
        INSERT INTO inspection_items (id, inspection_id, description, assigned_company, ball_in_court)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const insertMany = db.transaction((items: any[]) => {
        for (const item of items) {
          insertItem.run(crypto.randomUUID(), id, item.description, assigned_company, 'SUBCONTRACTOR');
        }
      });
      
      insertMany(templateItems);
    }

    res.json({ id });
  });

  app.put('/api/inspections/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE inspections SET status = ?, resolved_at = COALESCE(resolved_at, ?) WHERE id = ?
    `).run(status, resolvedAt, id);

    res.json({ success: true });
  });

  // --- Inspection Items API ---
  app.get('/api/inspections/:inspectionId/items', (req, res) => {
    const { inspectionId } = req.params;
    const items = db.prepare(`SELECT * FROM inspection_items WHERE inspection_id = ? ORDER BY created_at ASC`).all(inspectionId) as any[];
    
    if (items.length > 0) {
      const itemIds = items.map(i => i.id);
      const placeholders = itemIds.map(() => '?').join(',');
      const photos = db.prepare(`SELECT * FROM inspection_item_photos WHERE inspection_item_id IN (${placeholders})`).all(...itemIds) as any[];
      
      items.forEach(item => {
        item.photos = photos.filter(p => p.inspection_item_id === item.id);
      });
    }
    
    res.json(items);
  });

  app.post('/api/inspections/:inspectionId/items', upload.single('file'), (req, res) => {
    const { inspectionId } = req.params;
    const { description, assigned_company, ball_in_court, uploaded_by, tag, location } = req.body;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO inspection_items (id, inspection_id, description, assigned_company, ball_in_court)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, inspectionId, description, assigned_company, ball_in_court || 'GC');

    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`;
      const photoId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO inspection_item_photos (id, inspection_item_id, file_url, uploaded_by, tag, location)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(photoId, id, fileUrl, uploaded_by || 'Unknown', tag || null, location || null);
    }

    res.json({ id });
  });

  app.post('/api/inspection_items/:itemId/photos', upload.single('file'), (req, res) => {
    const { itemId } = req.params;
    const { uploaded_by, tag, location } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO inspection_item_photos (id, inspection_item_id, file_url, uploaded_by, tag, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, itemId, fileUrl, uploaded_by || 'Unknown', tag || null, location || null);

    res.json({ success: true, fileUrl, id });
  });

  app.put('/api/inspection_items/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, ball_in_court } = req.body;
    
    if (status) {
      const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;
      db.prepare(`
        UPDATE inspection_items SET status = ?, resolved_at = COALESCE(resolved_at, ?) WHERE id = ?
      `).run(status, resolvedAt, id);
    }
    
    if (ball_in_court) {
      db.prepare(`
        UPDATE inspection_items SET ball_in_court = ? WHERE id = ?
      `).run(ball_in_court, id);
    }

    res.json({ success: true });
  });

  app.put('/api/inspection_items/:id', (req, res) => {
    const { id } = req.params;
    const { description, assigned_company, status, ball_in_court } = req.body;
    const resolvedAt = status === 'RESOLVED' ? new Date().toISOString() : null;
    
    db.prepare(`
      UPDATE inspection_items 
      SET description = ?, assigned_company = ?, status = ?, ball_in_court = ?, resolved_at = COALESCE(resolved_at, ?)
      WHERE id = ?
    `).run(description, assigned_company, status, ball_in_court, resolvedAt, id);

    res.json({ success: true });
  });

  app.delete('/api/inspection_items/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM inspection_item_photos WHERE inspection_item_id = ?').run(id);
    db.prepare('DELETE FROM inspection_items WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // --- Milestones API ---
  app.get('/api/projects/:projectId/milestones', (req, res) => {
    const { projectId } = req.params;
    const milestones = db.prepare(`SELECT * FROM milestones WHERE project_id = ? ORDER BY target_date ASC`).all(projectId);
    res.json(milestones);
  });

  app.post('/api/projects/:projectId/milestones', upload.single('certificate'), (req, res) => {
    const { projectId } = req.params;
    const { name } = req.body;
    
    let deliverables = [];
    if (req.body.deliverables) {
      try {
        deliverables = typeof req.body.deliverables === 'string' 
          ? JSON.parse(req.body.deliverables) 
          : req.body.deliverables;
      } catch (e) {
        console.error("Error parsing deliverables", e);
      }
    }
    
    const certificate_url = req.file ? `/uploads/${req.file.filename}` : null;
    const milestoneId = crypto.randomUUID();
    
    const createMilestone = db.transaction((data) => {
      db.prepare(`
        INSERT INTO milestones (id, project_id, name, certificate_url)
        VALUES (?, ?, ?, ?)
      `).run(milestoneId, projectId, data.name, data.certificate_url);

      if (data.deliverables && Array.isArray(data.deliverables)) {
        for (const delivItem of data.deliverables) {
          const delivId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO milestone_deliverables (id, milestone_id, description, ball_in_court, status)
            VALUES (?, ?, ?, ?, ?)
          `).run(delivId, milestoneId, delivItem.description, delivItem.ball_in_court || 'GC', 'PENDING');
        }
      }
      return milestoneId;
    });

    try {
      createMilestone({ name, deliverables, certificate_url });
      res.json({ id: milestoneId });
    } catch (err) {
      console.error("Error creating milestone with deliverables", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/milestones/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      db.prepare('UPDATE milestones SET name = ? WHERE id = ?').run(name, id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating milestone:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete('/api/milestones/:id', (req, res) => {
    const { id } = req.params;
    const deleteMilestone = db.transaction(() => {
      db.prepare('DELETE FROM milestone_deliverables WHERE milestone_id = ?').run(id);
      db.prepare('DELETE FROM milestones WHERE id = ?').run(id);
    });
    deleteMilestone();
    res.json({ success: true });
  });

  app.get('/api/milestones/:milestoneId/deliverables', (req, res) => {
    const { milestoneId } = req.params;
    const deliverables = db.prepare(`SELECT * FROM milestone_deliverables WHERE milestone_id = ? ORDER BY created_at ASC`).all(milestoneId);
    res.json(deliverables);
  });

  app.post('/api/milestones/:milestoneId/deliverables', (req, res) => {
    try {
      const { milestoneId } = req.params;
      const { description, ball_in_court, status } = req.body;
      const id = crypto.randomUUID();
      
      db.prepare(`
        INSERT INTO milestone_deliverables (id, milestone_id, description, ball_in_court, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, milestoneId, description, ball_in_court || 'GC', status || 'PENDING');

      res.json({ id });
    } catch (err) {
      console.error("ERROR IN POST DELIVERABLES", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/milestone_deliverables/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { description, status, ball_in_court, userId, userName } = req.body;
      
      const old = db.prepare('SELECT * FROM milestone_deliverables WHERE id = ?').get(id) as any;
      if (!old) return res.status(404).json({ error: 'Not found' });

      db.prepare(`
        UPDATE milestone_deliverables SET description = COALESCE(?, description), status = COALESCE(?, status), ball_in_court = COALESCE(?, ball_in_court) WHERE id = ?
      `).run(description, status, ball_in_court, id);

      // Log changes
      if (status && status !== old.status) {
        db.prepare(`
          INSERT INTO milestone_activity (id, milestone_id, user_id, user_name, activity_type, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), old.milestone_id, userId, userName, 'STATUS_CHANGE', `Changed status of "${old.description}" from ${old.status} to ${status}`);
      }
      if (ball_in_court && ball_in_court !== old.ball_in_court) {
        db.prepare(`
          INSERT INTO milestone_activity (id, milestone_id, user_id, user_name, activity_type, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), old.milestone_id, userId, userName, 'BIC_CHANGE', `Changed ball in court of "${old.description}" from ${old.ball_in_court} to ${ball_in_court}`);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating deliverable:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/milestone_deliverables/:id/upload', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { userId, userName } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const deliv = db.prepare('SELECT * FROM milestone_deliverables WHERE id = ?').get(id) as any;
    
    db.prepare('UPDATE milestone_deliverables SET file_url = ? WHERE id = ?').run(fileUrl, id);
    
    if (deliv) {
      db.prepare(`
        INSERT INTO milestone_activity (id, milestone_id, user_id, user_name, activity_type, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), deliv.milestone_id, userId, userName, 'FILE_UPLOAD', `Uploaded file for "${deliv.description}"`);
    }
    
    res.json({ success: true, fileUrl });
  });

  app.get('/api/milestones/:milestoneId/activity', (req, res) => {
    const { milestoneId } = req.params;
    const activity = db.prepare(`SELECT * FROM milestone_activity WHERE milestone_id = ? ORDER BY created_at DESC`).all(milestoneId);
    res.json(activity);
  });

  app.delete('/api/milestone_deliverables/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM milestone_deliverables WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // --- Milestone Templates API ---
  app.get('/api/milestone-templates', (req, res) => {
    const templates = db.prepare(`SELECT * FROM milestone_templates ORDER BY name ASC`).all();
    res.json(templates);
  });

  app.get('/api/milestone-templates/:id/deliverables', (req, res) => {
    const { id } = req.params;
    const deliverables = db.prepare(`SELECT * FROM milestone_template_deliverables WHERE template_id = ?`).all(id);
    res.json(deliverables);
  });

  app.post('/api/milestone-templates', (req, res) => {
    const { name, description, deliverables } = req.body;
    const templateId = crypto.randomUUID();

    const createTemplate = db.transaction((data) => {
      db.prepare(`
        INSERT INTO milestone_templates (id, name, description)
        VALUES (?, ?, ?)
      `).run(templateId, data.name, data.description);

      if (data.deliverables && Array.isArray(data.deliverables)) {
        for (const deliv of data.deliverables) {
          db.prepare(`
            INSERT INTO milestone_template_deliverables (id, template_id, description, ball_in_court)
            VALUES (?, ?, ?, ?)
          `).run(crypto.randomUUID(), templateId, deliv.description, deliv.ball_in_court || 'GC');
        }
      }
    });

    try {
      createTemplate({ name, description, deliverables });
      res.json({ id: templateId });
    } catch (err) {
      console.error("Error creating milestone template:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete('/api/milestone-templates/:id', (req, res) => {
    const { id } = req.params;
    const deleteTemplate = db.transaction(() => {
      db.prepare('DELETE FROM milestone_template_deliverables WHERE template_id = ?').run(id);
      db.prepare('DELETE FROM milestone_templates WHERE id = ?').run(id);
    });
    deleteTemplate();
    res.json({ success: true });
  });

  // --- Photos API ---
  app.get('/api/projects/:projectId/photo-folders', (req, res) => {
    const { projectId } = req.params;
    const folders = db.prepare(`SELECT * FROM photo_folders WHERE project_id = ? ORDER BY created_at DESC`).all(projectId);
    res.json(folders);
  });

  app.post('/api/projects/:projectId/photo-folders', (req, res) => {
    const { projectId } = req.params;
    const { name, created_by } = req.body;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO photo_folders (id, project_id, name, created_by)
      VALUES (?, ?, ?, ?)
    `).run(id, projectId, name, created_by);

    res.json({ id });
  });

  app.get('/api/photo-folders/:folderId/photos', (req, res) => {
    const { folderId } = req.params;
    const photos = db.prepare(`SELECT * FROM photos WHERE folder_id = ? ORDER BY uploaded_at DESC`).all(folderId);
    res.json(photos);
  });

  app.post('/api/photo-folders/:folderId/photos', upload.single('file'), (req, res) => {
    const { folderId } = req.params;
    const { uploaded_by } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO photos (id, folder_id, file_url, uploaded_by)
      VALUES (?, ?, ?, ?)
    `).run(id, folderId, fileUrl, uploaded_by);

    res.json({ success: true, fileUrl, id });
  });

  // --- Drawings API ---
  app.get('/api/projects/:projectId/drawings', (req, res) => {
    const { projectId } = req.params;
    const drawings = db.prepare(`SELECT * FROM drawing_sets WHERE project_id = ? ORDER BY uploaded_at DESC`).all(projectId);
    res.json(drawings);
  });

  app.post('/api/projects/:projectId/drawings', upload.single('file'), (req, res) => {
    const { projectId } = req.params;
    const { name, uploaded_by, is_current } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const id = crypto.randomUUID();
    const isCurrentInt = is_current === 'true' ? 1 : 0;

    if (isCurrentInt) {
      // Archive the previously current drawing set
      db.prepare(`UPDATE drawing_sets SET is_current = 0, is_archived = 1 WHERE project_id = ? AND is_current = 1`).run(projectId);
    }
    
    db.prepare(`
      INSERT INTO drawing_sets (id, project_id, name, file_url, uploaded_by, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, projectId, name, fileUrl, uploaded_by, isCurrentInt);

    res.json({ success: true, fileUrl, id });
  });

  app.put('/api/drawings/:id/status', (req, res) => {
    const { id } = req.params;
    const { is_current, is_archived } = req.body;

    const drawing = db.prepare('SELECT project_id FROM drawing_sets WHERE id = ?').get(id) as any;
    if (!drawing) return res.status(404).json({ error: 'Not found' });

    if (is_current) {
      db.prepare(`UPDATE drawing_sets SET is_current = 0, is_archived = 1 WHERE project_id = ? AND is_current = 1`).run(drawing.project_id);
      db.prepare(`UPDATE drawing_sets SET is_current = 1, is_archived = 0 WHERE id = ?`).run(id);
    } else if (is_archived !== undefined) {
      db.prepare(`UPDATE drawing_sets SET is_archived = ?, is_current = 0 WHERE id = ?`).run(is_archived ? 1 : 0, id);
    }

    res.json({ success: true });
  });

  // --- Contacts API ---
  app.get('/api/projects/:projectId/contacts', (req, res) => {
    const { projectId } = req.params;
    const contacts = db.prepare(`SELECT * FROM contacts WHERE project_id = ? ORDER BY company_name ASC, name ASC`).all(projectId) as any[];
    contacts.forEach(c => {
      if (c.permissions) {
        try {
          c.permissions = JSON.parse(c.permissions);
        } catch (e) {
          c.permissions = null;
        }
      }
    });
    res.json(contacts);
  });

  app.post('/api/projects/:projectId/contacts', (req, res) => {
    const { projectId } = req.params;
    const { name, email, phone, company_name, project_role, permissions } = req.body;
    const id = crypto.randomUUID();
    const permissionsStr = permissions ? JSON.stringify(permissions) : null;
    
    db.prepare(`
      INSERT INTO contacts (id, project_id, name, email, phone, company_name, project_role, permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, name, email, phone, company_name, project_role, permissionsStr);

    res.json({ id });
  });

  app.put('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, company_name, project_role, permissions } = req.body;
    const permissionsStr = permissions ? JSON.stringify(permissions) : null;
    
    const oldContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
    if (!oldContact) return res.status(404).json({ error: 'Not found' });

    db.prepare(`
      UPDATE contacts 
      SET name = ?, email = ?, phone = ?, company_name = ?, project_role = ?, permissions = ?
      WHERE id = ?
    `).run(name, email, phone, company_name, project_role, permissionsStr, id);

    if (oldContact.is_invited) {
      db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, company_name = ?, role = ?, permissions = ?
        WHERE email = ?
      `).run(name, email, company_name, project_role, permissionsStr, oldContact.email);
    }

    res.json({ success: true });
  });

  app.post('/api/contacts/:id/invite', (req, res) => {
    const { id } = req.params;
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
    if (!contact) return res.status(404).json({ error: 'Not found' });

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(contact.email);
    if (!existingUser) {
      const userId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, email, name, company_name, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, contact.email, contact.name, contact.company_name, contact.project_role, contact.permissions);
    } else {
      db.prepare(`UPDATE users SET role = ?, permissions = ? WHERE email = ?`).run(contact.project_role, contact.permissions, contact.email);
    }

    db.prepare('UPDATE contacts SET is_invited = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // --- Procurement API ---
  app.get('/api/projects/:projectId/procurement', (req, res) => {
    const { projectId } = req.params;
    const { company_name } = req.query;
    let query = `SELECT * FROM procurement_items WHERE project_id = ?`;
    let params: any[] = [projectId];

    if (company_name) {
      query += ` AND assigned_company = ?`;
      params.push(company_name);
    }
    query += ` ORDER BY created_at DESC`;

    const items = db.prepare(query).all(...params);
    res.json(items);
  });

  app.post('/api/projects/:projectId/procurement', (req, res) => {
    const { projectId } = req.params;
    const { item_name, expected_delivery_date, assigned_company } = req.body;
    const id = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO procurement_items (id, project_id, item_name, expected_delivery_date, assigned_company)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, projectId, item_name, expected_delivery_date, assigned_company);

    res.json({ id });
  });

  app.put('/api/procurement/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    db.prepare(`
      UPDATE procurement_items SET status = ? WHERE id = ?
    `).run(status, id);

    res.json({ success: true });
  });

  // --- Forum API ---
  app.get('/api/projects/:projectId/forum/posts', (req, res) => {
    const { projectId } = req.params;
    const posts = db.prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) as reply_count
      FROM forum_posts p
      WHERE p.project_id = ?
      ORDER BY p.created_at DESC
    `).all(projectId);
    res.json(posts);
  });

  app.post('/api/projects/:projectId/forum/posts', (req, res) => {
    const { projectId } = req.params;
    const { user_id, user_name, title, content, file_url } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO forum_posts (id, project_id, user_id, user_name, title, content, file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectId, user_id, user_name, title, content, file_url);
    res.json({ id });
  });

  app.get('/api/forum/posts/:postId/replies', (req, res) => {
    const { postId } = req.params;
    const replies = db.prepare(`
      SELECT * FROM forum_replies WHERE post_id = ? ORDER BY created_at ASC
    `).all(postId);
    res.json(replies);
  });

  app.post('/api/forum/posts/:postId/replies', (req, res) => {
    const { postId } = req.params;
    const { user_id, user_name, content, file_url } = req.body;
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO forum_replies (id, post_id, user_id, user_name, content, file_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, postId, user_id, user_name, content, file_url);
    res.json({ id });
  });

  app.post('/api/forum/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ fileUrl });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
