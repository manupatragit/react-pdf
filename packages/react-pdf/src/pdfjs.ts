//@ts-ignore
const pdfjsModule = await import('pdfjs-dist/build/pdf.min.mjs');

const pdfjs = (
  'default' in pdfjsModule ? pdfjsModule['default'] : pdfjsModule
) as typeof pdfjsModule;

export default pdfjs;
