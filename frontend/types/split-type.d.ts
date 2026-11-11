declare module 'split-type' {
  export interface SplitTypeOptions {
    split?: string;
    types?: string;
    tagName?: string;
    lineClass?: string;
    wordClass?: string;
    charClass?: string;
    splitClass?: string;
    absolute?: boolean;
  }

  export default class SplitType {
    lines: HTMLElement[] | null;
    words: HTMLElement[] | null;
    chars: HTMLElement[] | null;
    elements: HTMLElement[];

    constructor(target: string | Element | Element[] | NodeList, options?: SplitTypeOptions);
    split(options?: SplitTypeOptions): void;
    revert(): void;
    static create(target: string | Element | Element[] | NodeList, options?: SplitTypeOptions): SplitType;
    static clearData(): void;
    static setDefaults(options: SplitTypeOptions): void;
    static revert(target: string | Element | Element[] | NodeList): void;
  }
}
