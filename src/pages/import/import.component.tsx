import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { selectAuthUserId } from '@store/auth-store';
import { addRecipePair } from '@api/services';
import { CreateRecipeInput } from '@api/types';

import './import.styles.scss';

const Import: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const uid = useSelector(selectAuthUserId);

  const parse = (): any[] => {
    if (!raw.trim()) return [];
    try {
      // try JSON array
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j : [j];
    } catch {
      // try JSON Lines
      return raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    }
  };

  const onImport = async () => {
    if (!uid) {
      setLog((l) => [...l, 'Sign in first.']);
      return;
    }

    const rawItems = parse();
    if (!rawItems.length) {
      setLog((l) => [...l, 'Nothing to import.']);
      return;
    }

    // Ensure each imported recipe has everything CreateRecipeInput needs
    const items: CreateRecipeInput[] = rawItems.map((r: any) => ({
      ...r,
      authorId: uid,
      // fallbacks if missing in JSON
      tags: r.tags ?? [],
      difficulty: r.difficulty ?? null,
      imageUrl: r.imageUrl ?? null,
      isPublic: r.isPublic ?? false,
    }));

    let success = 0;
    let failure = 0;

    // sequential is fine for a one-time import; keeps logs ordered
    for (const data of items) {
      try {
        await addRecipePair(data);
        success++;
      } catch (e: any) {
        console.error('Import error for recipe:', data.title, e);
        failure++;
        setLog((l) => [...l, `Error importing "${data.title ?? 'Untitled'}": ${e?.message ?? e}`]);
      }
    }

    setLog((l) => [...l, `Import finished. Success: ${success}, Failed: ${failure}.`]);
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h2>Import recipes</h2>
      <p>Paste JSON array or JSON Lines (one recipe per line).</p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='[ { "title": "...", ... }, ... ]'
        style={{ width: '100%', height: 240, fontFamily: 'monospace' }}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={onImport}>Import</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{log.join('\n')}</pre>
    </div>
  );
};

export default Import;
