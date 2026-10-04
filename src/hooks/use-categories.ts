import { gamesApi, type CategoriesMeta, type CategoryItem } from '../services/games-api-provider';
import { setDefaultCategory } from '../store/library-query-store';
import {
  LOAD_STATUS,
  useLoadState,
  type LoadState,
  type LoadStateController,
} from './use-load-state';

const { success } = LOAD_STATUS;

export type CategoriesState = LoadState<CategoryItem, CategoriesMeta>;

export type CategoriesController = LoadStateController<CategoryItem, CategoriesMeta>;

export function findDefaultCategory(categories: readonly CategoryItem[]): CategoryItem | undefined {
  return categories.find((category) => category.isDefault) ?? categories[0];
}

export function useCategories(): CategoriesController {
  const controller = useLoadState<CategoryItem, CategoriesMeta>({
    async load(signal) {
      const { data, meta } = await gamesApi.fetchCategories({ signal });
      return { items: data, meta };
    },
    fallbackErrorMessage: 'Categories are unavailable right now. Please try again.',
    retrySuccessMessage: 'Categories loaded',
  });

  const unsubscribe = controller.subscribe((state) => {
    if (state.status !== success) {
      return;
    }

    const { data } = state;
    setDefaultCategory(
      findDefaultCategory(data)?.slug,
      data.map(({ slug }) => slug),
    );
  });

  return {
    getState: controller.getState,
    subscribe: controller.subscribe,
    reload: controller.reload,
    destroy() {
      unsubscribe();
      controller.destroy();
    },
  };
}
