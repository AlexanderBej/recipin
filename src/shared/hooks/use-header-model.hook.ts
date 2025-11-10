import { useMemo, useEffect } from 'react';
import { useLocation, matchRoutes } from 'react-router';
import { NAV_ITEMS } from '../../routes/routes';

export function useHeaderModel() {
  const location = useLocation();
  //   const navigate = useNavigate();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const match = useMemo(() => {
    // matchRoutes returns an array of matches (deep). We only need the last one.
    const routes = NAV_ITEMS.map((r) => ({ path: r.path }));
    const m = matchRoutes(routes as any, location);
    return m?.[m.length - 1] ?? null;
  }, [location]);

  const meta = useMemo(() => {
    if (!match) return null;
    const route = NAV_ITEMS.find((r) => r.path === (match.route as any).path) || null;
    return route;
  }, [match]);

  const params = useMemo<Record<string, string>>(() => (match?.params as any) || {}, [match]);

  const resolvedTitle = useMemo(() => {
    if (!meta) return 'Recipin'; // global fallback
    const t = meta.title;
    return typeof t === 'function' ? t({ params, query }) : t;
  }, [meta, params, query]);

  //   const showBack = useMemo(() => {
  //     if (!meta) return location.pathname !== '/'; // heuristic
  //     const sb = meta.showBack;
  //     if (typeof sb === 'function') return sb({ pathname: location.pathname });
  //     if (typeof sb === 'boolean') return sb;
  //     // default: show back when not at root-level paths
  //     return !['/', '/library'].includes(location.pathname);
  //   }, [meta, location.pathname]);

  //   const actions = useMemo(() => {
  //     if (!meta?.actions) return null;
  //     return typeof meta.actions === 'function' ? meta.actions({ params }) : meta.actions;
  //   }, [meta, params]);

  const docTitle = useMemo(() => {
    const base = resolvedTitle;
    const format = meta?.documentTitle || ((t: string) => `${t} • Recipin`);
    return format(base);
  }, [meta, resolvedTitle]);

  // Update document.title
  useEffect(() => {
    if (typeof window !== 'undefined') document.title = docTitle;
  }, [docTitle]);

  return {
    title: resolvedTitle,
    showBack: meta?.showBack,
    actions: meta?.actions,
    // goBack: () => navigate(-1),
  } as const;
}
