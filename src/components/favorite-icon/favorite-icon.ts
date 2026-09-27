import { favoriteIconMarkup } from '../../assets/icons';
import { createInlineIconFactory } from '../../utils/create-inline-icon';
import './favorite-icon.scss';

export const createFavoriteIcon = createInlineIconFactory(favoriteIconMarkup, 'favorite-icon');
