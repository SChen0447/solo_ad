export interface Recipe {
  id: number;
  title: string;
  ingredients: string[];
  steps: string[];
  coverImage: string;
  likes: number;
  createdAt: string;
  isFavorite?: boolean;
}

export interface RecipeCreateDTO {
  title: string;
  ingredients: string[];
  steps: string[];
  coverImage: string;
}

export interface RecipeUpdateDTO extends Partial<RecipeCreateDTO> {}

export interface RecipeListResponse {
  data: Recipe[];
  total: number;
}
