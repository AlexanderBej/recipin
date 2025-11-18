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
import { TagDef } from '@api/models';

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

export const TAGS: Record<TagCategory, TagDef[]> = {
  cuisine: [
    { id: 'indian', label: 'Indian' },
    { id: 'italian', label: 'Italian' },
    { id: 'middle-eastern', label: 'Middle Eastern' },
    { id: 'mexican', label: 'Mexican' },
    { id: 'thai', label: 'Thai' },
    { id: 'asian', label: 'Asian' },
    { id: 'japanese', label: 'Japanese' },
    { id: 'greek', label: 'Greek' },
    { id: 'french', label: 'French' },
    { id: 'american', label: 'American' },
    { id: 'korean', label: 'Korean' },
    { id: 'spanish', label: 'Spanish' },
    { id: 'mediterranean', label: 'Mediterranean' },
    { id: 'romanian', label: 'Romanian' },
    { id: 'cuban', label: 'Cuban' },
    { id: 'russian', label: 'Russian' },
    { id: 'indonesian', label: 'Indonesian' },
    { id: 'north-african', label: 'North African' },
  ],
  dietary: [
    { id: 'vegan', label: 'Vegan' },
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'gluten-free', label: 'Gluten Free' },
    { id: 'dairy-free', label: 'Dairy Free' },
    { id: 'keto', label: 'Keto' },
    { id: 'salad', label: 'Salad' },
    { id: 'low-carb', label: 'Low Carb' },
    { id: 'paleo', label: 'Paleo' },
    { id: 'nut-free', label: 'Nut Free' },
    { id: 'protein', label: 'Protein' },
  ],
  method: [
    { id: 'baked', label: 'Baked' },
    { id: 'fried', label: 'Fried' },
    { id: 'grilled', label: 'Grilled' },
    { id: 'steamed', label: 'Steamed' },
    { id: 'raw', label: 'Raw' },
    { id: 'roasted', label: 'Roasted' },
    { id: 'air-fryer', label: 'Air Fryer' },
    { id: 'slow-cooker', label: 'Slow Cooker' },
    { id: 'home-made', label: 'Home Made' },
  ],
  occasion: [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'brunch', label: 'Brunch' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'quick-meal', label: 'Quick Meal' },
    { id: 'comfort-food', label: 'Comfort Food' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'dinner-party', label: 'Dinner Party' },
    { id: 'holiday', label: 'Holiday' },
    { id: 'meal-prep', label: 'Meal Prep' },
    { id: 'kids-friendly', label: 'Kids Friendly' },
  ],
  time: [
    { id: '15-minute', label: '15 Minute' },
    { id: '30-minute', label: '30 Minute' },
    { id: '1-hour', label: '1 Hour' },
    { id: 'one-pot', label: 'One Pot' },
  ],

  specific: [
    { id: 'coconut', label: 'Coconut' },
    { id: 'tostones', label: 'Tostones' },
    { id: 'potatoes', label: 'Potatoes' },
    { id: 'garlic', label: 'Garlic' },
  ],
};

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
