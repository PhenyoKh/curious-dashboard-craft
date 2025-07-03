
class SelectionCache {
  private cachedEditor: HTMLElement | null = null;
  private cachedSelection: Selection | null = null;
  private lastQueryTime = 0;
  private readonly CACHE_DURATION = 100; // Cache for 100ms

  getEditor(): HTMLElement | null {
    const now = Date.now();
    if (!this.cachedEditor || now - this.lastQueryTime > this.CACHE_DURATION) {
      this.cachedEditor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      this.lastQueryTime = now;
    }
    return this.cachedEditor;
  }

  getSelection(): Selection | null {
    const now = Date.now();
    if (!this.cachedSelection || now - this.lastQueryTime > this.CACHE_DURATION) {
      this.cachedSelection = window.getSelection();
      this.lastQueryTime = now;
    }
    return this.cachedSelection;
  }

  invalidate(): void {
    this.cachedEditor = null;
    this.cachedSelection = null;
    this.lastQueryTime = 0;
  }

  focusEditor(): boolean {
    const editor = this.getEditor();
    if (editor) {
      editor.focus();
      return true;
    }
    return false;
  }
}

export const selectionCache = new SelectionCache();
