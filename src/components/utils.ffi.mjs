export function focusRootById(root, element_id) {
  requestAnimationFrame(() => {
    const shadowRoot = document.querySelector(root)?.shadowRoot;
    const element = shadowRoot?.getElementById(element_id);
    if (element) {
      element.focus();
    } else if (!element) {
      focusRootById(root, element_id);
    }
  });

  return null;
}
