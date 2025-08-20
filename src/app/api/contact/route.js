import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE_NAME = 'contact_submissions.csv';

function toCsvValue(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function POST(request) {
  try {
    const { name, email, message } = await request.json();
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), FILE_NAME);
    const exists = fs.existsSync(filePath);
    const nowIso = new Date().toISOString();
    const row = [nowIso, name, email, message].map(toCsvValue).join(',') + '\n';

    if (!exists) {
      const header = ['timestamp', 'name', 'email', 'message'].join(',') + '\n';
      fs.writeFileSync(filePath, header + row, 'utf8');
    } else {
      fs.appendFileSync(filePath, row, 'utf8');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to save contact submission:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

