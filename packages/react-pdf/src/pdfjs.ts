//@ts-ignore
const pdfjsModule = await import('pdfjs-dist/webpack.mjs');

const pdfjs = (
  'default' in pdfjsModule ? pdfjsModule['default'] : pdfjsModule
) as typeof pdfjsModule;

export default pdfjs;
