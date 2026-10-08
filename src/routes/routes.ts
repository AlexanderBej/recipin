import { IconType } from 'react-icons';
import { PiBowlFoodFill } from 'react-icons/pi';
import { MdLocalGroceryStore } from 'react-icons/md';
import { FaClipboardList } from 'react-icons/fa';

type TitleResolver = (ctx: { params: Record<string, string>; query: URLSearchParams }) => string;
export type NavAction = 'search' | 'edit' | 'favor';

export type NavItem = {
  key: string;
  path: string;
  shortLabel: string;
  showBack?: boolean;
  actions?: NavAction[];
  title: string | TitleResolver;
  documentTitle?: (title: string) => string;
  icon?: IconType;
  world?: 'recipes';
};

// type RouteMeta = {
// path: string; // same pattern used in your Route definitions
// title: string | TitleResolver;
// showBack?: boolean | ((ctx: { pathname: string }) => boolean);
// actions?: React.ReactNode | ((ctx: { params: Record<string, string> }) => React.ReactNode);
// // Optional: override document title format
// documentTitle?: (title: string) => string;
// };

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'cooking',
    path: '/recipe/:id/cook',
    world: 'recipes',
    shortLabel: 'Cooking',
    title: 'Cooking Mode',
  },
  {
    key: 'hub',
    path: '/',
    shortLabel: 'Food Hub',
    title: 'Food Hub',
    documentTitle: () => 'Food Hub',
  },
  {
    key: 'discovery',
    path: '/recipes',
    world: 'recipes',
    shortLabel: 'Discover',
    title: 'Recipes',
  },
  {
    key: 'library',
    path: '/recipes/library',
    world: 'recipes',
    shortLabel: 'Library',
    title: 'Recipe Library',
    icon: PiBowlFoodFill,
    actions: ['search'],
  },
  {
    key: 'grocery',
    world: 'recipes',
    path: '/grocery',
    shortLabel: 'Groceries',
    showBack: true,
    title: 'Grocery List',
    icon: MdLocalGroceryStore,
  },
  {
    key: 'planner',
    world: 'recipes',
    path: '/planner',
    shortLabel: 'Planner',
    title: 'Planner',
    showBack: true,
    icon: FaClipboardList,
  },
  {
    key: 'profile',
    path: '/profile',
    shortLabel: 'Profile',
    showBack: true,
    title: 'Profile / Settings',
  },
  {
    key: 'recipe',
    world: 'recipes',
    path: '/recipe/:id',
    shortLabel: 'Details',
    title: 'Recipe details',
    showBack: true,
    actions: ['edit'],
  },
  {
    key: 'create',
    world: 'recipes',
    path: '/recipes/new',
    shortLabel: 'Create',
    title: 'Create recipe',
    showBack: true,
  },
  {
    key: 'edit',
    world: 'recipes',
    path: '/recipe/:id/edit',
    shortLabel: 'Edit',
    title: 'edit recipe',
    showBack: true,
  },
  {
    key: 'import',
    world: 'recipes',
    path: '/import',
    shortLabel: 'Import',
    title: 'Bulk import',
    showBack: true,
  },
];
