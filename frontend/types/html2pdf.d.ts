declare module 'html2pdf.js' {
  function html2pdf(): html2pdf.Html2PdfInstance;
  namespace html2pdf {
    interface Html2PdfInstance {
      from(element: HTMLElement | string): Html2PdfInstance;
      set(options: Record<string, unknown>): Html2PdfInstance;
      output(type: 'blob'): Promise<Blob>;
      output(type: string): Promise<unknown>;
      save(): Promise<void>;
      toPdf(): Html2PdfInstance;
      get(type: string): Promise<unknown>;
    }
  }
  export = html2pdf;
}
