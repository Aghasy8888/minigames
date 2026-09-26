import categoriesSeed from '../../mocks/categories.json';

export type CategoryItem = {
  slug: string;
  label: string;
  isDefault: boolean;
};

export type CategoriesSeedResponse = {
  data: CategoryItem[];
  meta: {
    totalItems: number;
    description: string;
  };
};

export const categories = (categoriesSeed as CategoriesSeedResponse).data;

export const DEFAULT_CATEGORY = categories.find((category) => category.isDefault) ?? categories[0];
