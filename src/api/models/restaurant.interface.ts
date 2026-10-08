export interface RestaurantImage {
  id: string;
  url: string;
  provider?: 'imagekit';
  fileId?: string;
  filePath?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
}

export interface RestaurantDish {
  id: string;
  name: string;
  notes?: string;
  images: string[];
  photos?: RestaurantImage[];
}

export interface RestaurantOrderLink {
  id?: string;
  label: string;
  url: string;
}

// UI timestamps are milliseconds; Firestore stores server Timestamp values.
export interface Restaurant {
  id: string;
  authorId: string;
  name: string;
  imageUrl?: string;
  photos?: RestaurantImage[];
  cuisine?: string;
  category?: string;
  rating?: number;
  notes?: string;
  tags: string[];
  favorite: boolean;
  blacklisted: boolean;
  orderLinks: RestaurantOrderLink[];
  dishes: RestaurantDish[];
  createdAt: number | null;
  updatedAt: number | null;
}
