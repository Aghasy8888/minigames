import { medalFirstImage, medalSecondImage, medalThirdImage } from '../../assets/images';

export const TOP_RECORDS_TITLE = 'Top Records';
export const POINTS_SUFFIX = 'pts';

// Static mock stage: pins relative times to Figma ("2 days ago", …). Drop to use the current date.
export const RECORDS_REFERENCE_DATE = new Date('2026-08-30T23:59:00Z');

export const MEDAL_IMAGES: Readonly<Record<number, string>> = {
  1: medalFirstImage,
  2: medalSecondImage,
  3: medalThirdImage,
};
