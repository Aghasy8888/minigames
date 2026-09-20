export const SLIDER_SECTION_TITLE = 'New Games' as const;

export const SLIDER_DESKTOP_SLUGS = [
  'organized-inside',
  'islanders-new-shores',
  'vacation-cafe-simulator',
  'winter-burrow',
  'camper-van-make-it-home',
] as const;

export type SliderCardRole = 'peek' | 'secondary' | 'featured';

export const SLIDER_CARD_ROLES: readonly SliderCardRole[] = [
  'peek',
  'secondary',
  'featured',
  'secondary',
  'peek',
] as const;
