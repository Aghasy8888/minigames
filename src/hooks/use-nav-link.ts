import { navigate } from '../store/navigation-store';
import { resolveNavTarget, type NavLinkTarget } from '../utils/nav-items';
import { hrefForPage } from '../utils/route-path';

function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Makes an anchor an SPA link; modified / middle clicks keep native new-tab behavior. */
export function useNavLink(
  link: HTMLAnchorElement,
  item: NavLinkTarget,
  onNavigate?: () => void,
): void {
  const target = resolveNavTarget(item);

  link.href = hrefForPage(target);

  if (item.page) {
    link.dataset.navPage = item.page;
  }

  link.addEventListener('click', (event) => {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    navigate(target);
    onNavigate?.();
  });
}
