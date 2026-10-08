import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FiCheck, FiEdit2, FiRefreshCw, FiX } from 'react-icons/fi';

export default function RestaurantInlineText({
  label,
  value,
  save,
  multiline = false,
  heading,
  placeholder = 'Not added',
  compact = false,
  maxLength,
}: {
  label: string;
  value: string;
  save: (value: string, expected: string) => Promise<string>;
  multiline?: boolean;
  heading?: 'h1' | 'h3';
  placeholder?: string;
  compact?: boolean;
  maxLength?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const draftRef = useRef(value);
  const baseline = useRef(value);
  const saving = useRef(false);
  const queued = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!editing && !saving.current) {
      baseline.current = value;
      draftRef.current = value;
      setDraft(value);
    }
  }, [value, editing]);
  const persist = async () => {
    if (saving.current) {
      queued.current = true;
      return;
    }
    if (draftRef.current === baseline.current) return;
    saving.current = true;
    setStatus('saving');
    setError('');
    try {
      do {
        queued.current = false;
        const submitted = draftRef.current;
        const saved = await save(submitted, baseline.current);
        if (!alive.current) return;
        baseline.current = saved;
        if (draftRef.current === submitted) {
          draftRef.current = saved;
          setDraft(saved);
          setStatus('saved');
        } else setStatus('idle');
      } while (queued.current && draftRef.current !== baseline.current);
    } catch (cause) {
      if (alive.current) {
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
      }
    } finally {
      saving.current = false;
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void persist();
  };
  const Display = heading ?? 'p';
  return (
    <div className={`notebook-inline${heading ? ` notebook-inline--${heading}` : ''}`}>
      {!editing ? (
        <div className="notebook-inline__display">
          {!compact && (
            <Display className={value ? '' : 'restaurant-muted'}>{value || placeholder}</Display>
          )}
          <button
            className="restaurant-icon"
            title={`Edit ${label.toLocaleLowerCase()}`}
            aria-label={`Edit ${label.toLocaleLowerCase()}`}
            onClick={() => {
              baseline.current = value;
              draftRef.current = value;
              setDraft(value);
              setEditing(true);
              setStatus('idle');
            }}
          >
            {compact ? (
              <>
                <FiEdit2 />
                <span>{label}</span>
              </>
            ) : (
              <FiEdit2 />
            )}
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) void persist();
          }}
        >
          <label>
            {label}
            {multiline ? (
              <textarea
                autoFocus
                value={draft}
                maxLength={maxLength}
                onChange={(event) => {
                  setDraft(event.target.value);
                  draftRef.current = event.target.value;
                }}
              />
            ) : (
              <input
                autoFocus
                value={draft}
                maxLength={maxLength}
                onChange={(event) => {
                  setDraft(event.target.value);
                  draftRef.current = event.target.value;
                }}
              />
            )}
          </label>
          <div className="notebook-inline__actions">
            <button
              className="restaurant-icon"
              type="submit"
              disabled={status === 'saving'}
              title={`Save ${label.toLocaleLowerCase()}`}
              aria-label={`Save ${label.toLocaleLowerCase()}`}
            >
              <FiCheck />
            </button>
            <button
              className="restaurant-icon"
              type="button"
              disabled={status === 'saving'}
              title="Use latest value"
              aria-label={`Use latest ${label.toLocaleLowerCase()}`}
              onClick={() => {
                baseline.current = value;
                draftRef.current = value;
                setDraft(value);
                setEditing(false);
                setStatus('idle');
                setError('');
              }}
            >
              <FiX />
            </button>
            <span role="status">
              {status === 'saving'
                ? 'Saving…'
                : draft !== baseline.current
                  ? 'Unsaved'
                  : status === 'saved'
                    ? 'Saved'
                    : ''}
            </span>
          </div>
          {error && (
            <div role="alert" className="restaurant-error">
              <p>{error}</p>
              <button className="restaurant-action" type="button" onClick={() => void persist()}>
                <FiRefreshCw />
                Retry save
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
