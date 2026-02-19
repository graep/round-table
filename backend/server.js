import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
import express from 'express';
import cors from 'cors';
import { loadPersonas } from './personas-loader.mjs';
import { evaluate } from './evaluate.mjs';
import { runDebate } from './debate.mjs';
import { createPersonaForRole } from './research-persona.mjs';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/personas', async (_req, res) => {
  try {
    const personas = await loadPersonas();
    res.json(personas);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load personas' });
  }
});

app.post('/api/personas/create', async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!role || typeof role !== 'string') {
      return res.status(400).json({ error: 'role (string) is required' });
    }
    const persona = await createPersonaForRole(role);
    res.json(persona);
  } catch (e) {
    console.error('Create persona error:', e);
    const detail = e?.message || 'Unknown error';
    const safeDetail = detail.includes('sk-') ? 'Check API key in backend/.env' : detail;
    res.status(500).json({ error: 'Failed to create persona', detail: safeDetail });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { idea, personaIds } = req.body || {};
    if (!idea || !Array.isArray(personaIds) || personaIds.length === 0) {
      return res.status(400).json({ error: 'idea and non-empty personaIds required' });
    }
    const all = await loadPersonas();
    const selected = all.filter((p) => personaIds.includes(p.id));
    if (selected.length === 0) {
      return res.status(400).json({ error: 'No matching personas found' });
    }
    const result = await evaluate(idea, selected);
    res.json(result);
  } catch (e) {
    console.error('Evaluate error:', e);
    const detail = e?.message || 'Unknown error';
    const safeDetail = detail.includes('sk-') ? 'Check API key in backend/.env' : detail;
    res.status(500).json({ error: 'Evaluation failed', detail: safeDetail });
  }
});

app.post('/api/debate', async (req, res) => {
  try {
    const { idea, phase1TakeText, targetRole, targetPersonaId, respondentPersonaIds } = req.body || {};
    if (!idea || typeof phase1TakeText !== 'string' || !targetRole || !Array.isArray(respondentPersonaIds)) {
      return res.status(400).json({ error: 'idea, phase1TakeText, targetRole, and respondentPersonaIds (array) required' });
    }
    const all = await loadPersonas();
    const respondents = all.filter((p) => respondentPersonaIds.includes(p.id));
    if (respondents.length === 0) {
      return res.status(400).json({ error: 'No matching respondent personas found' });
    }
    const result = await runDebate(idea, phase1TakeText, targetRole, respondents);
    res.json(result);
  } catch (e) {
    console.error('Debate error:', e);
    const detail = e?.message || 'Unknown error';
    const safeDetail = detail.includes('sk-') ? 'Check API key in backend/.env' : detail;
    res.status(500).json({ error: 'Debate failed', detail: safeDetail });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const hasKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
  console.log(`Round Table API at http://localhost:${PORT}`);
  console.log('  GET  /api/personas');
  console.log('  POST /api/personas/create');
  console.log('  POST /api/evaluate');
  console.log('  POST /api/debate');
  console.log(`  OpenAI: ${hasKey ? 'configured' : 'NOT configured — add OPENAI_API_KEY to backend/.env'}`);
});
