import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import type { RecipeEntity } from '@api/models';
import { RECIPE_CATEGORIES } from '@api/types';
import type { AppDispatch } from '@api/types';
import { CATEGORY_META, MEASURING_UNITS_ALL, TAGS } from '@api/misc';
import { getRecipeForEditing } from '@api/services';
import { createRecipe, updateRecipe } from '@store/recipes-store';
import { selectAuthUserId } from '@store/auth-store';
import { BottomSheet } from '@shared/ui';
import RecipeLoadState from '../recipe-details/recipe-load-state.component';
import RecipePhoto from '../recipe-card/recipe-photo.component';
import {
  draftKey,
  editorChanges,
  emptyIngredient,
  formFromRecipe,
  newRecipeInput,
  readDraft,
  sectionLabels,
  sections,
  validateForm,
} from './editor.utils';
import type { EditorForm, EditorSection, RecipeDraft } from './editor.utils';
import '../recipe-card/recipe-card.styles.scss';
import '../recipe-card/recipes-collection.styles.scss';
import './recipe-editor.styles.scss';

export default function RecipeEditor() {
  const uid = useSelector(selectAuthUserId);
  const { id } = useParams();
  return uid ? <EditorLoader key={`${uid}:${id ?? 'new'}`} uid={uid} id={id} /> : null;
}
function EditorLoader({ uid, id }: { uid: string; id?: string }) {
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof getRecipeForEditing>>>();
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setStatus('loading');
    setLoaded(undefined);
    getRecipeForEditing(uid, id)
      .then((result) => {
        if (!active) return;
        setLoaded(result);
        setStatus(result ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [uid, id, attempt]);
  if (id && !loaded)
    return <RecipeLoadState status={status} retry={() => setAttempt((value) => value + 1)} />;
  return (
    <EditorSession
      key={attempt}
      uid={uid}
      recipe={loaded?.recipe}
      revision={loaded?.revision ?? null}
      reload={() => setAttempt((value) => value + 1)}
    />
  );
}
function EditorSession({
  uid,
  recipe,
  revision,
  reload,
}: {
  uid: string;
  recipe?: RecipeEntity;
  revision: string | null;
  reload: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const [initial] = useState(() => {
    const draft = readDraft(uid, recipe?.id);
    const base = draft?.base ?? formFromRecipe(recipe);
    return { draft, base, form: draft?.form ?? base };
  });
  const [form, setForm] = useState(initial.form);
  const requested = query.get('section');
  const section: EditorSection = sections.includes(requested as EditorSection)
    ? (requested as EditorSection)
    : (initial.draft?.section ?? 'basics');
  const [visited, setVisited] = useState<EditorSection[]>([section]);
  const [draftStatus, setDraftStatus] = useState(initial.draft ? 'Draft restored.' : '');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(!!initial.draft && initial.draft.revision !== revision);
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const alive = useRef(true);
  const draftFailed = useRef(false);
  const baseRef = useRef(initial.base);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (draftFailed.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const persist = (next: EditorForm, nextSection = section) => {
    const draft: RecipeDraft = {
      version: 1,
      uid,
      recipeId: recipe?.id ?? null,
      revision: initial.draft?.revision ?? revision,
      form: next,
      base: baseRef.current,
      section: nextSection,
    };
    const serialized = JSON.stringify(draft);
    try {
      localStorage.setItem(draftKey(uid, recipe?.id), serialized);
      draftFailed.current = false;
      setDraftStatus('Draft saved on this device.');
      return serialized;
    } catch {
      draftFailed.current = true;
      setDraftStatus(
        'Draft could not be saved on this device. Keep this page open until you save the recipe.',
      );
    }
  };
  const change = (next: EditorForm) => {
    setForm(next);
    persist(next);
    setError('');
  };
  const go = (next: EditorSection) => {
    persist(form, next);
    setVisited((previous) => (previous.includes(next) ? previous : [...previous, next]));
    setQuery({ section: next }, { replace: true });
  };
  const field = (name: keyof EditorForm, value: string) => change({ ...form, [name]: value });
  const discard = () => {
    try {
      localStorage.removeItem(draftKey(uid, recipe?.id));
    } catch {
      setError('Could not discard the saved draft. Try again when local storage is available.');
      return;
    }
    setDiscardOpen(false);
    if (recipe) reload();
    else {
      const empty = formFromRecipe();
      baseRef.current = empty;
      setForm(empty);
      setDraftStatus('Draft discarded.');
      setError('');
      setTag('');
      setQuery({ section: 'basics' }, { replace: true });
      setVisited(['basics']);
    }
    draftFailed.current = false;
  };
  const save = async () => {
    const validation = validateForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    if (conflict || saving) return;
    const savedDraft = persist(form);
    setSaving(true);
    setError('');
    try {
      const result = recipe
        ? await dispatch(
            updateRecipe({
              uid,
              id: recipe.id,
              expectedRevision: revision!,
              changes: editorChanges(form, baseRef.current, recipe),
            }),
          ).unwrap()
        : await dispatch(createRecipe(newRecipeInput(form, uid))).unwrap();
      let draftClearFailed = false;
      try {
        // Do not erase a newer draft opened in another editor while this save was in flight.
        if (savedDraft && localStorage.getItem(draftKey(uid, recipe?.id)) === savedDraft)
          localStorage.removeItem(draftKey(uid, recipe?.id));
      } catch {
        draftClearFailed = true;
      }
      if (!alive.current) return;
      navigate(`/recipe/${'recipe' in result ? result.recipe.id : result.id}`, {
        replace: true,
        state: { recipeSaved: true, draftClearFailed },
      });
    } catch (failure) {
      if (!alive.current) return;
      const detail = failure as { message?: string; conflict?: boolean };
      setError(
        typeof failure === 'string'
          ? failure
          : (detail?.message ?? 'Could not save this recipe. Try again.'),
      );
      if (detail?.conflict) setConflict(true);
    } finally {
      if (alive.current) setSaving(false);
    }
  };
  const move = <T,>(rows: T[], index: number, delta: number): T[] => {
    const next = [...rows];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  };
  const rowActions = (
    index: number,
    count: number,
    name: string,
    reorder: (delta: number) => void,
    remove: () => void,
  ) => (
    <div className="editor-row-actions">
      <button
        type="button"
        title={`Move ${name} up`}
        aria-label={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => reorder(-1)}
      >
        <FiArrowUp />
      </button>
      <button
        type="button"
        title={`Move ${name} down`}
        aria-label={`Move ${name} down`}
        disabled={index === count - 1}
        onClick={() => reorder(1)}
      >
        <FiArrowDown />
      </button>
      <button type="button" title={`Remove ${name}`} aria-label={`Remove ${name}`} onClick={remove}>
        <FiTrash2 />
      </button>
    </div>
  );
  const input = (
    name: 'title' | 'servings' | 'prepMinutes' | 'cookMinutes' | 'imageUrl',
    label: string,
    numeric = false,
  ) => (
    <label className="editor-field">
      {label}
      <input
        name={name}
        value={form[name]}
        inputMode={numeric ? 'decimal' : undefined}
        onChange={(event) => field(name, event.target.value)}
      />
    </label>
  );
  const index = sections.indexOf(section);
  return (
    <article className="recipes-page recipe-editor">
      <Link className="editor-back" to={recipe ? `/recipe/${recipe.id}` : '/recipes/library'}>
        <FiArrowLeft />
        {recipe ? 'Back to Recipe' : 'Back to Library'}
      </Link>
      <header className="editor-heading">
        <p className="recipes-eyebrow">{recipe ? 'Your recipe' : 'Something worth keeping'}</p>
        <h1>{recipe ? 'Edit recipe' : 'New recipe'}</h1>
      </header>
      <nav className="editor-sections" aria-label="Recipe editor sections">
        {sections.map((item, number) => (
          <button
            key={item}
            type="button"
            aria-current={section === item ? 'step' : undefined}
            disabled={saving}
            onClick={() => go(item)}
          >
            <span>
              {visited.includes(item) && item !== section ? (
                <FiCheck aria-label="Visited" />
              ) : (
                String(number + 1).padStart(2, '0')
              )}
            </span>
            {sectionLabels[number]}
          </button>
        ))}
      </nav>
      {conflict && (
        <p className="editor-warning" role="alert">
          This draft is based on an older recipe. Saving is blocked. Discard the draft to reload the
          latest version; copy any text you want to keep first.
        </p>
      )}
      {error && (
        <p className="editor-warning" role="alert">
          {error}
        </p>
      )}
      <fieldset className="editor-content" disabled={saving}>
        <legend>{sectionLabels[index]}</legend>
        {section === 'basics' && (
          <div className="editor-basics">
            {input('title', 'Title')}
            <label className="editor-field">
              Description
              <textarea
                rows={5}
                value={form.description}
                onChange={(event) => field('description', event.target.value)}
              />
            </label>
            <div className="editor-field-grid">
              <label className="editor-field">
                Category
                <select
                  value={form.category}
                  onChange={(event) => field('category', event.target.value)}
                >
                  <option value="">Unspecified</option>
                  {form.category &&
                    !RECIPE_CATEGORIES.includes(
                      form.category as (typeof RECIPE_CATEGORIES)[number],
                    ) && <option value={form.category}>{form.category} (existing)</option>}
                  {RECIPE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {CATEGORY_META[item].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-field">
                Difficulty
                <select
                  value={form.difficulty}
                  onChange={(event) => field('difficulty', event.target.value)}
                >
                  <option value="">Unspecified</option>
                  {form.difficulty &&
                    !['easy', 'intermediate', 'advanced'].includes(form.difficulty) && (
                      <option value={form.difficulty}>{form.difficulty} (existing)</option>
                    )}
                  {['easy', 'intermediate', 'advanced'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="editor-number-grid">
              {input('servings', 'Servings', true)}
              {input('prepMinutes', 'Prep minutes', true)}
              {input('cookMinutes', 'Cook minutes', true)}
            </div>
            <div className="editor-tags">
              <label className="editor-field">
                Tag
                <input
                  list="editor-tag-options"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (tag.trim() && !form.tags.includes(tag.trim()))
                        change({ ...form, tags: [...form.tags, tag.trim()] });
                      setTag('');
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="recipes-action"
                disabled={!tag.trim()}
                onClick={() => {
                  if (!form.tags.includes(tag.trim()))
                    change({ ...form, tags: [...form.tags, tag.trim()] });
                  setTag('');
                }}
              >
                <FiPlus />
                Add tag
              </button>
              <datalist id="editor-tag-options">
                {Object.values(TAGS)
                  .flat()
                  .map((item, i) => (
                    <option key={`${item.id}:${i}`} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </datalist>
            </div>
            <ul className="editor-tag-list">
              {form.tags.map((item, number) => (
                <li key={`${item}:${number}`}>
                  {item}
                  <button
                    type="button"
                    title={`Remove tag ${item}`}
                    aria-label={`Remove tag ${item}`}
                    onClick={() =>
                      change({ ...form, tags: form.tags.filter((_, i) => i !== number) })
                    }
                  >
                    <FiX />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {section === 'ingredients' && (
          <div className="editor-rows">
            {form.ingredients.map((row, number) => (
              <div key={row.key} className="editor-ingredient">
                <div className="editor-ingredient-fields">
                  {(['item', 'quantity', 'unit'] as const).map((name) => (
                    <label className="editor-field" key={name}>
                      {name === 'item'
                        ? `Ingredient ${number + 1}`
                        : name === 'quantity'
                          ? `Quantity ${number + 1}`
                          : `Unit ${number + 1}`}
                      <input
                        list={name === 'unit' ? 'editor-units' : undefined}
                        value={row[name]}
                        onChange={(event) =>
                          change({
                            ...form,
                            ingredients: form.ingredients.map((ingredient) =>
                              ingredient.key === row.key
                                ? { ...ingredient, [name]: event.target.value }
                                : ingredient,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                {rowActions(
                  number,
                  form.ingredients.length,
                  `ingredient ${number + 1}`,
                  (delta) =>
                    change({ ...form, ingredients: move(form.ingredients, number, delta) }),
                  () =>
                    change({
                      ...form,
                      ingredients: form.ingredients.filter(
                        (ingredient) => ingredient.key !== row.key,
                      ),
                    }),
                )}
              </div>
            ))}
            <datalist id="editor-units">
              {MEASURING_UNITS_ALL.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
            <button
              type="button"
              className="recipes-action"
              onClick={() =>
                change({ ...form, ingredients: [...form.ingredients, emptyIngredient()] })
              }
            >
              <FiPlus />
              Add ingredient
            </button>
          </div>
        )}
        {section === 'instructions' && (
          <div className="editor-rows">
            {form.steps.map((step, number) => (
              <div className="editor-instruction" key={number}>
                <label className="editor-field">
                  Step {number + 1}
                  <textarea
                    rows={5}
                    value={step}
                    onChange={(event) =>
                      change({
                        ...form,
                        steps: form.steps.map((value, i) =>
                          i === number ? event.target.value : value,
                        ),
                      })
                    }
                  />
                </label>
                {rowActions(
                  number,
                  form.steps.length,
                  `step ${number + 1}`,
                  (delta) => change({ ...form, steps: move(form.steps, number, delta) }),
                  () => change({ ...form, steps: form.steps.filter((_, i) => i !== number) }),
                )}
              </div>
            ))}
            <button
              type="button"
              className="recipes-action"
              onClick={() => change({ ...form, steps: [...form.steps, ''] })}
            >
              <FiPlus />
              Add step
            </button>
          </div>
        )}
        {section === 'presentation' && (
          <div className="editor-presentation">
            {input('imageUrl', 'Image URL')}
            <RecipePhoto src={form.imageUrl.trim()} title={form.title || 'Recipe preview'} eager />
          </div>
        )}
        {section === 'review' && (
          <div className="editor-review">
            {sections.slice(0, 4).map((item, number) => (
              <section key={item}>
                <div className="editor-review-heading">
                  <h2>{sectionLabels[number]}</h2>
                  <button type="button" className="recipe-text-action" onClick={() => go(item)}>
                    Edit {sectionLabels[number]}
                  </button>
                </div>
                {item === 'basics' && (
                  <>
                    <h3>{form.title.trim() || 'Untitled recipe'}</h3>
                    <p>{form.description || 'No description'}</p>
                    <p>
                      {[
                        form.category,
                        form.difficulty,
                        form.servings && `${form.servings} servings`,
                        form.prepMinutes && `${form.prepMinutes} min prep`,
                        form.cookMinutes && `${form.cookMinutes} min cook`,
                        ...form.tags,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No optional details'}
                    </p>
                  </>
                )}
                {item === 'ingredients' && (
                  <ul>
                    {form.ingredients
                      .filter((row) => row.item.trim())
                      .map((row) => (
                        <li key={row.key}>
                          {[row.quantity, row.unit, row.item].filter(Boolean).join(' ')}
                        </li>
                      ))}
                  </ul>
                )}
                {item === 'instructions' && (
                  <ol>
                    {form.steps
                      .filter((step) => step.trim())
                      .map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                  </ol>
                )}
                {item === 'presentation' && (
                  <RecipePhoto src={form.imageUrl.trim()} title={form.title || 'Recipe preview'} />
                )}
              </section>
            ))}
          </div>
        )}
      </fieldset>
      <footer className="editor-footer">
        <div className="editor-progress-actions">
          <button
            type="button"
            className="recipes-action"
            disabled={saving || index === 0}
            onClick={() => go(sections[index - 1])}
          >
            Back
          </button>
          {index < 4 ? (
            <button
              type="button"
              className="recipes-action recipes-action--primary"
              disabled={saving}
              onClick={() => go(sections[index + 1])}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="recipes-action recipes-action--primary"
              disabled={saving || conflict}
              onClick={save}
            >
              <FiSave />
              {saving ? 'Saving…' : 'Save Recipe'}
            </button>
          )}
        </div>
        <div className="editor-draft-actions">
          <button
            type="button"
            className="recipe-text-action"
            disabled={saving}
            onClick={() => persist(form)}
          >
            <FiSave />
            Save draft
          </button>
          <BottomSheet
            title="Discard draft?"
            open={discardOpen}
            onOpenChange={setDiscardOpen}
            className="editor-discard-sheet"
            trigger={
              <button type="button" className="recipe-text-action" disabled={saving}>
                <FiTrash2 />
                Discard draft
              </button>
            }
            footer={
              <div className="editor-progress-actions">
                <button
                  type="button"
                  className="recipes-action"
                  onClick={() => setDiscardOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="recipes-action recipes-action--primary"
                  onClick={discard}
                >
                  Confirm
                </button>
              </div>
            }
          >
            <p>Discard your local changes? This cannot be undone.</p>
          </BottomSheet>
        </div>
        <p role="status" className={draftFailed.current ? 'editor-warning' : 'editor-draft-status'}>
          {saving ? 'Saving recipe…' : draftStatus}
        </p>
      </footer>
    </article>
  );
}
