export type SliderCardRole = 'peek' | 'secondary' | 'featured' | 'hidden';

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}

export function signedCircularDistance(
  index: number,
  featuredIndex: number,
  length: number,
): number {
  if (length <= 0) {
    return 0;
  }

  let distance = index - featuredIndex;

  if (distance > length / 2) {
    distance -= length;
  } else if (distance < -length / 2) {
    distance += length;
  }

  return distance;
}

export function sliderRoleFromDistance(distance: number): SliderCardRole {
  const absoluteDistance = Math.abs(distance);

  if (absoluteDistance === 0) {
    return 'featured';
  }

  if (absoluteDistance === 1) {
    return 'secondary';
  }

  if (absoluteDistance === 2) {
    return 'peek';
  }

  return 'hidden';
}

/** Flex order: hidden-left, peek, secondary, featured, secondary, peek, hidden-right. */
export function sliderOrderFromDistance(distance: number): number {
  if (distance <= -3) {
    return 0;
  }

  if (distance === -2) {
    return 1;
  }

  if (distance === -1) {
    return 2;
  }

  if (distance === 0) {
    return 3;
  }

  if (distance === 1) {
    return 4;
  }

  if (distance === 2) {
    return 5;
  }

  return 6;
}

export function isWrapRoleTransition(previousDistance: number, nextDistance: number): boolean {
  if (previousDistance === 0 || nextDistance === 0) {
    return false;
  }

  const crossedSides = Math.sign(previousDistance) !== Math.sign(nextDistance);
  const jumped = Math.abs(nextDistance - previousDistance) > 2;

  return crossedSides && jumped;
}
