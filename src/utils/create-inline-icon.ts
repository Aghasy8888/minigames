/**
 * Builds a factory for inline SVG icons from raw markup (`*.svg?raw`).
 * Painted shapes are switched to `currentColor`, so the icon takes the CSS `color` of its context.
 */
export function createInlineIconFactory(markup: string, className: string): () => SVGSVGElement {
  let iconTemplate: SVGSVGElement | undefined;

  function getIconTemplate(): SVGSVGElement {
    if (!iconTemplate) {
      const template = document.createElement('template');
      template.innerHTML = markup.trim();

      const svg = template.content.querySelector('svg');
      if (!svg) {
        throw new Error(`Icon markup for "${className}" must contain an <svg> element`);
      }

      for (const shape of svg.querySelectorAll('[fill]:not([fill="none"])')) {
        shape.setAttribute('fill', 'currentColor');
      }

      svg.classList.add(className);
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      iconTemplate = svg;
    }

    return iconTemplate;
  }

  return () => getIconTemplate().cloneNode(true) as SVGSVGElement;
}
