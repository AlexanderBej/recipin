export interface GroceryItem {
  id: string; // unique local id
  name: string; // 'flour'
  quantity?: string; // 500
  unit?: string; // 'g', 'ml', 'pcs'
  checked: boolean; // true if already bought
  sourceRecipeId?: string[]; // recipes that needed it
  notes?: string; // optional (brand, substitutions)
}

export interface GroceryRecipe {
  recipeId: string;
  title: string;
  items: GroceryItem[];
}
