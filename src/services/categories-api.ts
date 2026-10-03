import { request, type ApiListResponse } from './api-client';
import type { CategoriesMeta, CategoryItem } from './categories-types';

export type CategoriesRequestOptions = {
  signal?: AbortSignal;
};

export type CategoriesResponse = ApiListResponse<CategoryItem[], CategoriesMeta>;

export function fetchCategories(
  options: CategoriesRequestOptions = {},
): Promise<CategoriesResponse> {
  return request<CategoryItem[], CategoriesMeta>('/api/categories', {
    signal: options.signal,
  });
}
