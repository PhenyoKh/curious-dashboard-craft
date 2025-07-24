import { Mark, mergeAttributes } from '@tiptap/core';

export interface NumberedHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    numberedHighlight: {
      setNumberedHighlight: (attributes: { category: string; id: string; number: number; color?: string }) => ReturnType;
      unsetNumberedHighlight: () => ReturnType;
    };
  }
}

export const NumberedHighlight = Mark.create<NumberedHighlightOptions>({
  name: 'numberedHighlight',

  inclusive: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      category: {
        default: undefined,
        parseHTML: element => element.getAttribute('data-highlight-category') ?? undefined,
        renderHTML: attributes => {
          if (!attributes.category) return {};
          return { 'data-highlight-category': attributes.category };
        },
      },
      id: {
        default: undefined,
        parseHTML: element => element.getAttribute('data-highlight-id') ?? undefined,
        renderHTML: attributes => {
          if (!attributes.id) return {};
          return { 'data-highlight-id': attributes.id };
        },
      },
      number: {
        default: undefined,
        parseHTML: element => element.getAttribute('data-highlight-number') ?? undefined,
        renderHTML: attributes => {
          if (!attributes.number) return {};
          return { 'data-highlight-number': attributes.number, 'data-number': attributes.number };
        },
      },
      color: {
        default: undefined,
        parseHTML: element => element.style.backgroundColor ?? undefined,
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { 'data-color': attributes.color };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-highlight-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Get color and number from data attributes
    const color = HTMLAttributes['data-color'];
    const number = HTMLAttributes['data-number'];
    
    console.log('🎨 Rendering with color:', color, 'number:', number, 'all attrs:', HTMLAttributes);

    const backgroundColor = color || '#ffff00';
    const styleString = `position: relative; padding: 2px 4px; border-radius: 3px; cursor: pointer; background-color: ${backgroundColor};`;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'numbered-highlight',
        style: styleString,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setNumberedHighlight:
        attributes =>
        ({ commands }) => {
          console.log('🔧 Setting highlight with attributes:', attributes);
          return commands.setMark(this.name, attributes);
        },
      unsetNumberedHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});