import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: async () => undefined
  }
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  writable: true,
  value: () => undefined
});
