declare module 'html2pdf.js' {
  export interface Html2PdfImageOptions {
    type?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  }

  export interface Html2PdfHtml2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    letterRendering?: boolean;
    logging?: boolean;
    windowWidth?: number;
    [key: string]: unknown;
  }

  export interface Html2PdfJsPdfOptions {
    unit?: 'pt' | 'mm' | 'cm' | 'in';
    format?: string | number[];
    orientation?: 'portrait' | 'landscape';
    [key: string]: unknown;
  }

  export interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: Html2PdfImageOptions;
    html2canvas?: Html2PdfHtml2CanvasOptions;
    jsPDF?: Html2PdfJsPdfOptions;
    pagebreak?: { mode?: string | string[]; before?: string[]; after?: string[]; avoid?: string[] };
  }

  export interface Html2PdfWorker {
    from(element: HTMLElement | string, type?: 'element' | 'string' | 'canvas' | 'img'): Html2PdfWorker;
    set(options: Html2PdfOptions): Html2PdfWorker;
    toContainer(): Html2PdfWorker;
    toCanvas(): Html2PdfWorker;
    toImg(): Html2PdfWorker;
    toPdf(): Html2PdfWorker;
    save(filename?: string): Promise<void>;
    output(type?: string, options?: unknown): Promise<unknown>;
    outputPdf(type?: 'blob' | 'datauristring' | 'arraybuffer' | 'dataurlstring'): Promise<Blob | string | ArrayBuffer>;
    then<T>(onFulfilled: (value: Html2PdfWorker) => T): Promise<T>;
  }

  function html2pdf(): Html2PdfWorker;
  function html2pdf(
    element: HTMLElement | string,
    options?: Html2PdfOptions
  ): Html2PdfWorker;

  export default html2pdf;
}
