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
    key: 'library',
    path: '/',
    shortLabel: 'Library',
    title: 'Library',
    icon: PiBowlFoodFill,
    actions: ['search'],
  },
  {
    key: 'grocery',
    path: '/grocery',
    shortLabel: 'Groceries',
    showBack: true,
    title: 'Grocery List',
    icon: MdLocalGroceryStore,
  },
  {
    key: 'planner',
    path: '/planner',
    shortLabel: 'Planner',
    title: 'Planner',
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
    path: '/recipe/:id',
    shortLabel: 'Details',
    title: ({ params }) => 'Recipe details', // or fetch recipe name via store and override via prop
  },
  {
    key: 'create',
    path: '/create',
    shortLabel: 'Create',
    title: 'Create recipe',
    showBack: true,
  },
  {
    key: 'edit',
    path: '/create/:id',
    shortLabel: 'Edit',
    title: 'edit recipe',
  },
];
