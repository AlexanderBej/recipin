export interface Recipe {
  id?: string;
  authorId: string;
  title: string;
  description?: string;
  ingredients: { quantity?: string; unit?: string; item: string; notes?: string }[];
  steps: string[];
  tags: string[];
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
  isPublic?: boolean;
}
