import { IconType } from 'react-icons';
import { LuEggFried } from 'react-icons/lu';
import { MdOutlineLunchDining } from 'react-icons/md';
import { MdOutlineDinnerDining } from 'react-icons/md';
import { LuApple } from 'react-icons/lu';
import { FaLeaf } from 'react-icons/fa';
import { MdOutlineSoupKitchen } from 'react-icons/md';
import { LuSalad } from 'react-icons/lu';
import { LuWheat } from 'react-icons/lu';
import { PiBreadBold } from 'react-icons/pi';
import { LuCroissant } from 'react-icons/lu';
import { CiBowlNoodles } from 'react-icons/ci';
import { FaBowlRice } from 'react-icons/fa6';
import { TbMeat } from 'react-icons/tb';
import { IoFishOutline } from 'react-icons/io5';
import { LuCarrot } from 'react-icons/lu';
import { GiTomato } from 'react-icons/gi';
import { CiIceCream } from 'react-icons/ci';
import { MdOutlineCake } from 'react-icons/md';
import { MdOutlineCookie } from 'react-icons/md';
import { RiDrinks2Fill } from 'react-icons/ri';
import { GiKetchup } from 'react-icons/gi';
import { GiCoolSpices } from 'react-icons/gi';

import { RatingCategory, RecipeCategory, TagCategory } from '@api/types';

export const CATEGORY_META: Record<
  RecipeCategory,
  { label: string; icon: IconType; color: string }
> = {
  breakfast: { label: 'Breakfast', icon: LuEggFried, color: '#FBBF24' }, // amber-400
  lunch: { label: 'Lunch', icon: MdOutlineLunchDining, color: '#F59E0B' }, // amber-500
  dinner: { label: 'Dinner', icon: MdOutlineDinnerDining, color: '#F87171' }, // red-400
  snacks: { label: 'Snacks', icon: LuApple, color: '#FB923C' }, // orange-400
  appetizers: { label: 'Appetizers', icon: FaLeaf, color: '#4ADE80' }, // green-400
  'soups-stews': { label: 'Soups & Stews', icon: MdOutlineSoupKitchen, color: '#60A5FA' }, // blue-400
  salads: { label: 'Salads', icon: LuSalad, color: '#34D399' }, // emerald-400
  sides: { label: 'Sides', icon: LuWheat, color: '#A3E635' }, // lime-400
  'flatbreads-breads': { label: 'Flatbreads & Breads', icon: PiBreadBold, color: '#FCD34D' },
  'pastries-doughs': { label: 'Pastries & Doughs', icon: LuCroissant, color: '#F9A8D4' },
  'pasta-noodles': { label: 'Pasta & Noodles', icon: CiBowlNoodles, color: '#F97316' },
  'rice-grains': { label: 'Rice & Grains', icon: FaBowlRice, color: '#84CC16' },
  'meat-dishes': { label: 'Meat Dishes', icon: TbMeat, color: '#F87171' },
  'seafood-dishes': { label: 'Seafood Dishes', icon: IoFishOutline, color: '#38BDF8' },
  'vegetarian-mains': { label: 'Vegetarian Mains', icon: LuCarrot, color: '#22C55E' },
  'vegan-mains': { label: 'Vegan Mains', icon: GiTomato, color: '#16A34A' },
  desserts: { label: 'Desserts', icon: CiIceCream, color: '#F472B6' },
  'cakes-muffins': { label: 'Cakes & Muffins', icon: MdOutlineCake, color: '#FB7185' },
  'cookies-bars': { label: 'Cookies & Bars', icon: MdOutlineCookie, color: '#FDBA74' },
  'drinks-smoothies': { label: 'Drinks & Smoothies', icon: RiDrinks2Fill, color: '#60A5FA' },
  'sauces-condiments': { label: 'Sauces & Condiments', icon: GiKetchup, color: '#FBBF24' },
  'spice-mixes-marinades': {
    label: 'Spice Mixes & Marinades',
    icon: GiCoolSpices,
    color: '#FACC15',
  },
};

export const TAGS = {
  cuisine: [
    'Indian',
    'Italian',
    'Middle Eastern',
    'Mexican',
    'Thai',
    'Japanese',
    'Greek',
    'French',
    'American',
    'Korean',
    'Spanish',
    'Mediterranean',
  ],
  dietary: [
    'Vegan',
    'Vegetarian',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Low-Carb',
    'Paleo',
    'Nut-Free',
  ],
  method: ['Baked', 'Fried', 'Grilled', 'Steamed', 'Raw', 'Roasted', 'Air Fryer', 'Slow Cooker'],
  occasion: [
    'Breakfast',
    'Brunch',
    'Dinner Party',
    'Holiday',
    'Quick Meal',
    'Meal Prep',
    'Kids Friendly',
  ],
  time: ['15-Minute', '30-Minute', 'One-Pot'],
} satisfies Record<TagCategory, readonly string[]>;

export const MAIN_TAGS = ['Italian', 'Low-Carb', '30-Minute', 'Air Fryer'];

export const MEASURING_UNITS = {
  volume: ['mL', 'L', 'tsp', 'tbsp', 'fl oz', 'cup', 'pint', 'quart', 'gallon'],
  weight: ['g', 'kg', 'oz', 'lb'],
  count: ['piece', 'slice', 'clove', 'leaf', 'pinch', 'dash'],
  temperature: ['°C', '°F'],
} as const;

export const MEASURING_UNITS_ALL = [
  'mL',
  'L',
  'tsp',
  'tbsp',
  'fl oz',
  'cup',
  'pint',
  'quart',
  'gallon',
  'g',
  'kg',
  'oz',
  'lb',
  'piece',
  'slice',
  'clove',
  'leaf',
  'pinch',
  'dash',
];

export const RATING_CATEGORIES: RatingCategory[] = [
  'taste',
  'ease',
  'health',
  'presentation',
  'value',
];
export const MAX_PER_CATEGORY = 5;
export const MAX_TOTAL = RATING_CATEGORIES.length * MAX_PER_CATEGORY;
