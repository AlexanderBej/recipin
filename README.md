# Recipin

React application built with Vite. Use Node 22.12+ on the Node 22 release line,
Node 24, or Node 26+, then install the locked dependencies with `npm ci`.

## Local configuration

Set the Firebase values listed in `.env.example` in `.env.local`. Vite exposes
`VITE_*` variables to the browser at build time; never put server credentials in them.
Keep the existing Firebase project, auth domain, and application values.
The storage bucket variable remains unused; image uploads are not enabled.

## Commands

- `npm start` or `npm run dev`: development server, normally http://localhost:5173.
- `npm run typecheck`: TypeScript verification without emitting files.
- `npm test`: run all smoke tests once.
- `npm run test:watch`: watch smoke tests while editing.
- `npm run build`: typecheck and create the production app in `dist`.
- `npm run preview`: serve the production build, normally http://localhost:4173.
- `npm run format`: format source files with Prettier.

The tests cover protected routes and grocery persistence using mocked Firebase
boundaries. Google popup login and real Firestore operations require manual verification.
Vite does not run ESLint as part of its build; standalone lint tooling is deferred.
Production uses Vite's default modern-browser target rather than CRA's Browserslist target.

## Netlify

`netlify.toml` sets `npm run build`, the `dist` publish directory, and Node 22.
Rename deployment variables from the previous `REACT_APP_` prefix to `VITE_`,
preserving every value, before deploying. Rebuild after changing environment variables.

`public/_redirects` is copied to `dist/_redirects` and sends SPA deep links such as
`/recipe/:id` to `index.html`. Other static hosts need an equivalent fallback.
The app assumes deployment at the domain root. Preview is for local verification,
not a production server.

Verify Firebase's authorized domains if deploying to a new hostname. Retain the
production origin to preserve browser-local groceries and authentication persistence.
The existing manifest and icons are preserved; no service worker or offline caching
is configured. Direct recipe URLs reach the app, but the existing detail page's
dependency on previously loaded Redux data is unchanged.
