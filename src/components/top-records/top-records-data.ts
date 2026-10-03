import { medalFirstImage, medalSecondImage, medalThirdImage } from '../../assets/images';

export const TOP_RECORDS_TITLE = 'Top Records';
export const POINTS_SUFFIX = 'pts';
export const TOP_RECORDS_EMPTY_TITLE = 'No records yet';
export const TOP_RECORDS_EMPTY_MESSAGE = 'Nobody has set a score in this game yet. Be the first!';

export const MEDAL_IMAGES: Readonly<Record<number, string>> = {
  1: medalFirstImage,
  2: medalSecondImage,
  3: medalThirdImage,
};
