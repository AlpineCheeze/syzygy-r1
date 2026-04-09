import { db } from './src/db/index.ts';
const milestone = db.prepare('SELECT id FROM milestones LIMIT 1').get();
if (milestone) {
  console.log('Milestone ID:', milestone.id);
  fetch(`http://localhost:3000/api/milestones/${milestone.id}/deliverables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Test', ball_in_court: 'GC' })
  }).then(r => r.text().then(t => console.log(r.status, t))).catch(console.error);
} else {
  console.log('No milestones found');
}
