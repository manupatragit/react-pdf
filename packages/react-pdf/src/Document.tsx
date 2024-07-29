'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import PropTypes from 'prop-types';
import makeEventProps from 'make-event-props';
import makeCancellable from 'make-cancellable-promise';
import clsx from 'clsx';
import invariant from 'tiny-invariant';
import debounce from 'lodash.debounce';
import warning from 'warning';
import { dequal } from 'dequal';
import pdfjs from './pdfjs.js';

import DocumentContext from './DocumentContext.js';

import Message from './Message.js';

import LinkService from './LinkService.js';
import PasswordResponses from './PasswordResponses.js';

import {
  cancelRunningTask,
  dataURItoByteString,
  displayCORSWarning,
  isArrayBuffer,
  isBlob,
  isBrowser,
  isDataURI,
  isPageInVew,
  loadFromFile,
} from './shared/utils.js';

import useResolver from './shared/hooks/useResolver.js';
import { eventProps, isClassName, isFile, isRef } from './shared/propTypes.js';
//@ts-ignore
import { EventBus } from './shared/eventBus.js';

import type { PDFDocumentProxy } from '@commutatus/pdfjs-dist';
import type { EventProps } from 'make-event-props';
import type {
  ClassName,
  DocumentCallback,
  ExternalLinkRel,
  ExternalLinkTarget,
  File,
  HighlightEditorColorsType,
  ImageResourcesPath,
  NodeOrRenderer,
  OnDocumentLoadError,
  OnDocumentLoadProgress,
  OnDocumentLoadSuccess,
  OnError,
  OnItemClickArgs,
  OnPasswordCallback,
  Options,
  PasswordResponse,
  RenderMode,
  ScrollPageIntoViewArgs,
  Source,
} from './shared/types.js';
import Page, { type PageProps } from './Page.js';
import { PDFFindController } from './shared/pdf_find_controller.js';
import { DownloadManager } from './shared/download_manager.js';

const { PDFDataRangeTransport } = pdfjs;

type OnItemClick = (args: OnItemClickArgs) => void;

type OnPassword = (callback: OnPasswordCallback, reason: PasswordResponse) => void;

type OnSourceError = OnError;

type OnSourceSuccess = () => void;

export type DocumentProps = {
  annotationEditorMode: number;
  setAnnotationEditorMode: any;
  annotationsList?: any;
  initialLinkNodesList?: any;
  bookmarkDestPageNumber?: any;
  children?: React.ReactNode;
  /**
   * Class name(s) that will be added to rendered element along with the default `react-pdf__Document`.
   *
   * @example 'custom-class-name-1 custom-class-name-2'
   * @example ['custom-class-name-1', 'custom-class-name-2']
   */
  className?: ClassName;
  /**
   * What the component should display in case of an error.
   *
   * @default 'Failed to load PDF file.'
   * @example 'An error occurred!'
   * @example <p>An error occurred!</p>
   * @example {this.renderError}
   */
  error?: NodeOrRenderer;
  /**
   * Link rel for links rendered in annotations.
   *
   * @default 'noopener noreferrer nofollow'
   */
  externalLinkRel?: ExternalLinkRel;
  /**
   * Link target for external links rendered in annotations.
   */
  externalLinkTarget?: ExternalLinkTarget;
  eventsRef?: any;
  /**
   * What PDF should be displayed.
   *
   * Its value can be an URL, a file (imported using `import … from …` or from file input form element), or an object with parameters (`url` - URL; `data` - data, preferably Uint8Array; `range` - PDFDataRangeTransport.
   *
   * **Warning**: Since equality check (`===`) is used to determine if `file` object has changed, it must be memoized by setting it in component's state, `useMemo` or other similar technique.
   *
   * @example 'https://example.com/sample.pdf'
   * @example importedPdf
   * @example { url: 'https://example.com/sample.pdf' }
   */
  file?: File;
  fileName?: string;
  /**
   * List of colors to be used with highlight editor
   *
   * @example [{ name: 'blue', hex: '#324ea8' }, { name: 'red', hex: '#a83242' }]
   */
  highlightEditorColors?: HighlightEditorColorsType;
  defaultHighlightColor?: string;
  defaultTextAnnotationColor?: string;
  defaultSquareFillColor?: string;
  defaultSquareOpacity?: string;
  /**
   * The path used to prefix the src attributes of annotation SVGs.
   *
   * @default ''
   * @example '/public/images/'
   */
  imageResourcesPath?: ImageResourcesPath;
  /**
   * A prop that behaves like [ref](https://reactjs.org/docs/refs-and-the-dom.html), but it's passed to main `<div>` rendered by `<Document>` component.
   *
   * @example (ref) => { this.myDocument = ref; }
   * @example this.ref
   * @example ref
   */
  inputRef?: React.Ref<HTMLDivElement>;
  /**
   * What the component should display while loading.
   *
   * @default 'Loading PDF…'
   * @example 'Please wait!'
   * @example <p>Please wait!</p>
   * @example {this.renderLoader}
   */
  loading?: NodeOrRenderer;
  /**
   * What the component should display in case of no data.
   *
   * @default 'No PDF file specified.'
   * @example 'Please select a file.'
   * @example <p>Please select a file.</p>
   * @example {this.renderNoData}
   */
  noData?: NodeOrRenderer;
  onAnnotationUpdate?: any;
  onChangeVisibleLinkNodeList?: any;
  onLinkNodeEvent?: any;
  /**
   * Function called when an outline item or a thumbnail has been clicked. Usually, you would like to use this callback to move the user wherever they requested to.
   *
   * @example ({ dest, pageIndex, pageNumber }) => alert('Clicked an item from page ' + pageNumber + '!')
   */
  onItemClick?: OnItemClick;
  onLinkNodeReady?: any;
  /**
   * Function called in case of an error while loading a document.
   *
   * @example (error) => alert('Error while loading document! ' + error.message)
   */
  onLoadError?: OnDocumentLoadError;
  /**
   * Function called, potentially multiple times, as the loading progresses.
   *
   * @example ({ loaded, total }) => alert('Loading a document: ' + (loaded / total) * 100 + '%')
   */
  onLoadProgress?: OnDocumentLoadProgress;
  /**
   * Function called when the document is successfully loaded.
   *
   * @example (pdf) => alert('Loaded a file with ' + pdf.numPages + ' pages!')
   */
  onLoadSuccess?: OnDocumentLoadSuccess;
  onPageChange?: any;
  /**
   * Function called when a password-protected PDF is loaded.
   *
   * @example (callback) => callback('s3cr3t_p4ssw0rd')
   */
  onPassword?: OnPassword;
  /**
   * Function called in case of an error while retrieving document source from `file` prop.
   *
   * @example (error) => alert('Error while retrieving document source! ' + error.message)
   */
  onSourceError?: OnSourceError;
  /**
   * Function called when document source is successfully retrieved from `file` prop.
   *
   * @example () => alert('Document source retrieved!')
   */
  onSourceSuccess?: OnSourceSuccess;
  /**
   * An object in which additional parameters to be passed to PDF.js can be defined. Most notably:
   * - `cMapUrl`;
   * - `httpHeaders` - custom request headers, e.g. for authorization);
   * - `withCredentials` - a boolean to indicate whether or not to include cookies in the request (defaults to `false`)
   *
   * For a full list of possible parameters, check [PDF.js documentation on DocumentInitParameters](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html#~DocumentInitParameters).
   *
   * **Note**: Make sure to define options object outside of your React component, and use `useMemo` if you can't.
   *
   * @example { cMapUrl: '/cmaps/' }
   */
  onUpdateGlobalAnnotationParams?: any;
  options?: Options;
  /**
   * Rendering mode of the document. Can be `"canvas"`, `"custom"`, `"none"` or `"svg"`. If set to `"custom"`, `customRenderer` must also be provided.
   *
   * **Warning**: SVG render mode is deprecated and will be removed in the future.
   *
   * @default 'canvas'
   * @example 'custom'
   */
  renderMode?: RenderMode;
  /**
   * Rotation of the document in degrees. If provided, will change rotation globally, even for the pages which were given `rotate` prop of their own. `90` = rotated to the right, `180` = upside down, `270` = rotated to the left.
   *
   * @example 90
   */
  rotate?: number | null;
  /**
   * Page width. If neither `height` nor `width` are defined, page will be rendered at the size defined in PDF. If you define `width` and `height` at the same time, `height` will be ignored. If you define `width` and `scale` at the same time, the width will be multiplied by a given factor.
   *
   * @example 300
   */
  width?: number;
} & EventProps<DocumentCallback | false | undefined>;

class Viewer {
  currentPageNumber = 1;
  onItemClick: OnItemClick | undefined;
  pages: MutableRefObject<HTMLDivElement[]>;

  constructor({
    onItemClick,
    pages,
  }: {
    onItemClick?: OnItemClick;
    pages: MutableRefObject<HTMLDivElement[]>;
  }) {
    this.onItemClick = onItemClick;
    this.pages = pages;
  }

  // Handling jumping to internal links target
  scrollPageIntoView(args: ScrollPageIntoViewArgs) {
    const { dest, pageNumber, pageIndex = pageNumber - 1 } = args;
    this.currentPageNumber = 1;

    // First, check if custom handling of onItemClick was provided
    if (this.onItemClick) {
      this.onItemClick({ dest, pageIndex, pageNumber });
      return;
    }

    // If not, try to look for target page within the <Document>.
    const page = this.pages.current[pageIndex];

    if (page) {
      // Scroll to the page automatically
      page.scrollIntoView();
      return;
    }

    warning(
      false,
      `An internal link leading to page ${pageNumber} was clicked, but neither <Document> was provided with onItemClick nor it was able to find the page within itself. Either provide onItemClick to <Document> and handle navigating by yourself or ensure that all pages are rendered within <Document>.`,
    );
  }
}

const defaultOnPassword: OnPassword = (callback, reason) => {
  switch (reason) {
    case PasswordResponses.NEED_PASSWORD: {
      // eslint-disable-next-line no-alert
      const password = prompt('Enter the password to open this PDF file.');
      callback(password);
      break;
    }
    case PasswordResponses.INCORRECT_PASSWORD: {
      // eslint-disable-next-line no-alert
      const password = prompt('Invalid password. Please try again.');
      callback(password);
      break;
    }
    default:
  }
};

function isParameterObject(file: File): file is Source {
  return (
    typeof file === 'object' &&
    file !== null &&
    ('data' in file || 'range' in file || 'url' in file)
  );
}

const getHighlightColorsString = (highlightEditorColors?: HighlightEditorColorsType) => {
  const colorsString = highlightEditorColors
    ? highlightEditorColors
        .map(({ name, hex }) => {
          return name + '=' + hex;
        })
        .join(',')
    : 'yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F';

  return colorsString;
};

/**
 * Loads a document passed using `file` prop.
 */
const Document = forwardRef(function Document(
  {
    annotationsList,
    initialLinkNodesList,
    annotationEditorMode = pdfjs.AnnotationEditorType.NONE,
    setAnnotationEditorMode,
    bookmarkDestPageNumber,
    children,
    className,
    error = 'Failed to load PDF file.',
    eventsRef: eventsRefProp,
    externalLinkRel,
    externalLinkTarget,
    file,
    fileName: downloadFileName,
    highlightEditorColors,
    defaultHighlightColor,
    defaultTextAnnotationColor,
    defaultSquareFillColor,
    defaultSquareOpacity,
    inputRef,
    imageResourcesPath,
    loading = 'Loading PDF…',
    noData = 'No PDF file specified.',
    onAnnotationUpdate,
    onChangeVisibleLinkNodeList,
    onLinkNodeEvent,
    onItemClick,
    onLinkNodeReady,
    onLoadError: onLoadErrorProps,
    onLoadProgress,
    onLoadSuccess: onLoadSuccessProps,
    onPageChange: onPageChangeProps,
    onPassword = defaultOnPassword,
    onSourceError: onSourceErrorProps,
    onSourceSuccess: onSourceSuccessProps,
    onUpdateGlobalAnnotationParams,
    options,
    renderMode,
    rotate,
    width,
    ...otherProps
  }: DocumentProps,
  ref,
) {
  const [sourceState, sourceDispatch] = useResolver<Source | null>();
  const { value: source, error: sourceError } = sourceState;
  const [pdfState, pdfDispatch] = useResolver<PDFDocumentProxy>();
  const { value: pdf, error: pdfError } = pdfState;
  const [annotationEditorUiManagerState, annotationEditorUiManagerDispatch] = useResolver<any>();
  const { value: annotationEditorUiManager, error: annotationEditorUiManagerError } =
    annotationEditorUiManagerState;
  const eventBus = useRef(new EventBus());
  const defaultInputRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = inputRef || defaultInputRef;
  const [globalScale, setGlobalScale] = useState<null | number>(null);
  const linkService = useRef(new LinkService());
  const findController = useRef(
    new PDFFindController({
      linkService: linkService.current,
      eventBus: eventBus.current,
      updateMatchesCountOnProgress: true,
    }),
  );
  const pages = useRef<HTMLDivElement[]>([]);
  const annotationEditorLayers = useRef<any>([]);
  const prevFile = useRef<File>();
  const prevOptions = useRef<Options>();
  const [currentPage, setCurrentPage] = useState(1);
  const [canLoadAnnotations, setCanLoadAnnotations] = useState(false);
  const downloadManager = useRef(new DownloadManager());
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  useEffect(
    function initializeEventsRef() {
      if (eventsRefProp) {
        eventsRefProp.current = {};
      }
    },
    [eventsRefProp],
  );

  useEffect(() => {
    if (globalScale && (mainContainerRef as any)?.current) {
      eventBus.current.dispatch('scalechanging', {
        source: (mainContainerRef as any).current,
        scale: globalScale,
        presetValue: 'auto',
      });
    }
  }, [globalScale, mainContainerRef]);

  useEffect(
    function detectAnnotationAndLinkNodeUpdate() {
      if (!(eventBus && onLinkNodeEvent)) {
        return;
      }

      const handleLinkNodeEvent = ({ details }: any) => {
        onLinkNodeEvent(details);
      };
      eventBus.current._on('com_linkNodeForMarginNodeChanged', handleLinkNodeEvent);

      return () => {
        eventBus.current._off('com_linkNodeForMarginNodeChanged', handleLinkNodeEvent);
      };
    },
    [eventBus, onAnnotationUpdate],
  );

  useEffect(
    function detectAnnotationUpdate() {
      if (!(eventBus && onAnnotationUpdate)) {
        return;
      }

      const onAnnotationDelete = (...args: any) => {
        onAnnotationUpdate(...args, { type: 'delete' });
      };

      const onAnnotationUpdateWrapper = (...args: any) => {
        onAnnotationUpdate(...args, { type: 'update' });
      };

      eventBus.current._on('com_annotationupdated', onAnnotationUpdateWrapper);
      eventBus.current._on('com_annotationdeleted', onAnnotationDelete);

      return () => {
        eventBus.current._off('com_annotationupdated', onAnnotationUpdateWrapper);
        eventBus.current._off('com_annotationdeleted', onAnnotationDelete);
      };
    },
    [eventBus, onAnnotationUpdate],
  );

  useEffect(() => {
    if (file && file !== prevFile.current && isParameterObject(file)) {
      warning(
        !dequal(file, prevFile.current),
        `File prop passed to <Document /> changed, but it's equal to previous one. This might result in unnecessary reloads. Consider memoizing the value passed to "file" prop.`,
      );

      prevFile.current = file;
    }
  }, [file]);

  // Detect non-memoized changes in options prop
  useEffect(() => {
    if (options && options !== prevOptions.current) {
      warning(
        !dequal(options, prevOptions.current),
        `Options prop passed to <Document /> changed, but it's equal to previous one. This might result in unnecessary reloads. Consider memoizing the value passed to "options" prop.`,
      );

      prevOptions.current = options;
    }
  }, [options]);

  const viewer = useRef(new Viewer({ onItemClick, pages }));

  useImperativeHandle(
    ref,
    () => ({
      linkService,
      pages,
      viewer,
    }),
    [],
  );

  /**
   * Called when a document source is resolved correctly
   */
  function onSourceSuccess() {
    if (onSourceSuccessProps) {
      onSourceSuccessProps();
    }
  }

  /**
   * Called when a document source failed to be resolved correctly
   */
  function onSourceError() {
    if (!sourceError) {
      // Impossible, but TypeScript doesn't know that
      return;
    }

    warning(false, sourceError.toString());

    if (onSourceErrorProps) {
      onSourceErrorProps(sourceError);
    }
  }

  function resetSource() {
    sourceDispatch({ type: 'RESET' });
  }

  useEffect(resetSource, [file, sourceDispatch]);

  const findDocumentSource = useCallback(async (): Promise<Source | null> => {
    if (!file) {
      return null;
    }

    // File is a string
    if (typeof file === 'string') {
      if (isDataURI(file)) {
        const fileByteString = dataURItoByteString(file);
        return { data: fileByteString };
      }

      displayCORSWarning();
      return { url: file };
    }

    // File is PDFDataRangeTransport
    if (file instanceof PDFDataRangeTransport) {
      // @ts-ignore
      return { range: file };
    }

    // File is an ArrayBuffer
    if (isArrayBuffer(file)) {
      return { data: file };
    }

    /**
     * The cases below are browser-only.
     * If you're running on a non-browser environment, these cases will be of no use.
     */
    if (isBrowser) {
      // File is a Blob
      if (isBlob(file)) {
        const data = await loadFromFile(file);

        return { data };
      }
    }

    // At this point, file must be an object
    invariant(
      typeof file === 'object',
      'Invalid parameter in file, need either Uint8Array, string or a parameter object',
    );

    invariant(
      isParameterObject(file),
      'Invalid parameter object: need either .data, .range or .url',
    );

    // File .url is a string
    if ('url' in file && typeof file.url === 'string') {
      if (isDataURI(file.url)) {
        const { url, ...otherParams } = file;
        const fileByteString = dataURItoByteString(url);
        return { data: fileByteString, ...otherParams };
      }

      displayCORSWarning();
    }

    return file;
  }, [file]);

  useEffect(() => {
    const cancellable = makeCancellable(findDocumentSource());

    cancellable.promise
      .then((nextSource) => {
        sourceDispatch({ type: 'RESOLVE', value: nextSource });
      })
      .catch((error) => {
        sourceDispatch({ type: 'REJECT', error });
      });

    return () => {
      cancelRunningTask(cancellable);
    };
  }, [findDocumentSource, sourceDispatch]);

  useEffect(
    () => {
      if (typeof source === 'undefined') {
        return;
      }

      if (source === false) {
        onSourceError();
        return;
      }

      onSourceSuccess();
    },
    // Ommitted callbacks so they are not called every time they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source],
  );

  useEffect(
    function updateDefaultHighlightColor() {
      if (defaultHighlightColor && annotationEditorUiManager) {
        annotationEditorUiManager.updateParams(
          pdfjs.AnnotationEditorParamsType.HIGHLIGHT_COLOR,
          defaultHighlightColor,
        );
      }
    },
    [defaultHighlightColor, annotationEditorUiManager],
  );

  useEffect(
    function updateDefaultSquareOpacity() {
      if (defaultSquareOpacity && annotationEditorUiManager) {
        annotationEditorUiManager.updateParams(
          pdfjs.AnnotationEditorParamsType.SQUARE_OPACITY,
          defaultSquareOpacity,
        );
      }
    },
    [defaultSquareOpacity, annotationEditorUiManager],
  );

  useEffect(
    function updateDefaultSquareFillColor() {
      if (defaultSquareFillColor && annotationEditorUiManager) {
        annotationEditorUiManager.updateParams(
          pdfjs.AnnotationEditorParamsType.SQUARE_COLOR,
          defaultSquareFillColor,
        );
      }
    },
    [defaultSquareFillColor, annotationEditorUiManager],
  );

  useEffect(
    function updatedefaultTextAnnotationColor() {
      if (defaultTextAnnotationColor && annotationEditorUiManager) {
        annotationEditorUiManager.updateParams(
          pdfjs.AnnotationEditorParamsType.TEXT_COLOR,
          defaultTextAnnotationColor,
        );
      }
    },
    [defaultTextAnnotationColor, annotationEditorUiManager],
  );

  useEffect(
    function loadAnnotations() {
      if (!(canLoadAnnotations && annotationsList)) {
        return;
      }

      // TODO: Is there a case where this can run multiple times?
      annotationEditorUiManager.loadAnnotations({ annotationsList });
    },
    [canLoadAnnotations, annotationsList],
  );

  useEffect(
    function loadInitialLinkNodesList() {
      if (!(canLoadAnnotations && initialLinkNodesList)) {
        return;
      }

      // TODO: Is there a case where this can run multiple times?
      annotationEditorUiManager.parseLinkNodesFromJSON({ linkNodesList: initialLinkNodesList });
    },
    [canLoadAnnotations, initialLinkNodesList],
  );

  useEffect(
    function bindOnLinkNodeReady() {
      if (!(onLinkNodeReady && eventBus && annotationEditorUiManager)) {
        return;
      }

      eventBus.current._on('com_linkNodeReady', onLinkNodeReady);
      eventsRefProp.current.linkToLinkNode = (targetId: string) => {
        annotationEditorUiManager.createLinkNode(targetId);
      };

      return () => {
        eventBus.current._off('com_linkNodeReady', onLinkNodeReady);
      };
    },
    [onLinkNodeReady, annotationEditorUiManager],
  );

  useEffect(
    function signalPageChange() {
      viewer.current.currentPageNumber = currentPage;

      if (onPageChangeProps) {
        onPageChangeProps(currentPage);
      }

      // TODO: Send 'pagechanging' event
    },
    [onPageChangeProps, currentPage],
  );

  useEffect(
    function setupTwoWayAnnotationModeSignal() {
      // All annotation editor layers have loaded
      if (!(canLoadAnnotations && setAnnotationEditorMode && annotationEditorUiManager)) {
        return;
      }

      eventsRefProp.current.updateMode = (mode: number) => {
        annotationEditorUiManager.updateMode(mode, null, false);
      };

      const handler = ({ mode }: any) => {
        setAnnotationEditorMode(mode);
      };

      eventBus.current._on('switchannotationeditormode', handler);

      return () => {
        eventBus.current._off('switchannotationeditormode', handler);
      };
    },
    [canLoadAnnotations, setAnnotationEditorMode, annotationEditorUiManager],
  );

  useEffect(
    function attachScrollHandler() {
      if (!(mainContainerRef && pages)) {
        return;
      }

      const detectCurrentPageOnScroll = debounce(() => {
        if (!((mainContainerRef as any) && pages.current?.length)) {
          return;
        }

        for (let i = 0; i < pages.current?.length; i++) {
          const page = pages.current[i];
          if (isPageInVew((mainContainerRef as any).current.scrollTop, page)) {
            setCurrentPage(i + 1);
            return;
          }
        }
      }, 1000);

      (mainContainerRef as any).current.addEventListener('scroll', detectCurrentPageOnScroll);

      return () => {
        (mainContainerRef as any)?.current?.removeEventListener(
          'scroll',
          detectCurrentPageOnScroll,
        );
      };
    },
    [mainContainerRef, pages],
  );

  useEffect(
    function moveToBookmarkPageNumber() {
      if (!bookmarkDestPageNumber) {
        return;
      }

      linkService.current.goToPage(bookmarkDestPageNumber);
    },
    [bookmarkDestPageNumber],
  );

  useEffect(
    function updateGlobalParams() {
      if (!(annotationEditorUiManager && eventBus.current && onUpdateGlobalAnnotationParams)) {
        return;
      }

      const handler = ({ params }: any) => {
        onUpdateGlobalAnnotationParams({ params });
      };

      eventBus.current._on('com_updateglobalparams', handler);

      return () => {
        eventBus.current._off('com_updateglobalparams', handler);
      };
    },
    [annotationEditorUiManager],
  );

  function createAnnotationEditorUiManager() {
    const colorPickerOptions = getHighlightColorsString(highlightEditorColors);
    const uiManager = new pdfjs.AnnotationEditorUIManager(
      (mainContainerRef as any).current,
      (mainContainerRef as any).current,
      null,
      eventBus.current,
      pdf,
      false,
      colorPickerOptions,
    );

    eventBus.current._on('switchannotationeditorparams', ({ type, value }: any) => {
      uiManager.updateParams(type, value);
    });

    annotationEditorUiManagerDispatch({ type: 'RESOLVE', value: uiManager });
  }

  const enableSearch = (document: PDFDocumentProxy) => {
    if (!(eventsRefProp && document)) {
      return;
    }

    findController.current.setDocument(document);

    const dispatchSearchEvent = (searchString: string, type: string = '', findPrev = false) => {
      eventBus.current.dispatch('find', {
        source: 'react-pdf-document',
        type,
        query: searchString || '',
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: findPrev,
        matchDiacritics: false,
      });
    };

    const search = (searchTerm: string) => {
      dispatchSearchEvent(searchTerm);
    };

    const findNext = (searchTerm: string) => {
      dispatchSearchEvent(searchTerm, 'again', false);
    };

    const findPrevious = (searchTerm: string) => {
      dispatchSearchEvent(searchTerm, 'again', true);
    };

    const onFindBarClosed = () => {
      eventBus.current.dispatch('findbarclose', { source: 'react-pdf-document' });
    };

    eventsRefProp.current.search = search;
    eventsRefProp.current.findNext = findNext;
    eventsRefProp.current.findPrevious = findPrevious;
    eventsRefProp.current.onFindBarClosed = onFindBarClosed;
  };

  useEffect(
    function bindMarginNodesEvents() {
      if (eventsRefProp.current?.onSelectedMarginNodeChange || !annotationEditorUiManager) {
        return;
      }

      const onSelectedMarginNodeChange = (id: string) => {
        annotationEditorUiManager.onLinkNodeTargetChanging({ id });
      };

      eventsRefProp.current.onSelectedMarginNodeChange = onSelectedMarginNodeChange;
      if (onChangeVisibleLinkNodeList) {
        eventBus.current._on('com_visibleLinkNodesChanged', onChangeVisibleLinkNodeList);
      }

      () => {
        eventBus.current._off('com_visibleLinkNodesChanged', onChangeVisibleLinkNodeList);
      };
    },
    [annotationEditorUiManager],
  );

  useEffect(
    function enableDownload() {
      if (!(eventsRefProp && pdf)) {
        return;
      }

      const url = downloadFileName || 'annotated.pdf';
      const filename = url;

      const download = async () => {
        try {
          const data = await pdf.getData();
          const blob = new Blob([data], { type: 'application/pdf' });

          await downloadManager.current.download(blob, url, filename);
        } catch {
          // When the PDF document isn't ready, or the PDF file is still
          // downloading, simply download using the URL.
          await downloadManager.current.downloadUrl(url, filename);
        }
      };

      const saveWithAnnotations = async () => {
        if (isSaveInProgress) {
          return;
        }

        setIsSaveInProgress(true);

        try {
          const data = await pdf.saveDocument();
          const blob = new Blob([data], { type: 'application/pdf' });
          await downloadManager.current.download(blob, url, filename);
        } catch (reason: any) {
          // When the PDF document isn't ready, or the PDF file is still
          // downloading, simply fallback to a "regular" download.
          console.error(`Error when saving the document: ${reason?.message}`);
          await download();
        } finally {
          setIsSaveInProgress(false);
        }
      };

      const downloadWithAnnotations = () => {
        if (pdf?.annotationStorage.size > 0) {
          saveWithAnnotations();
        } else {
          download();
        }
      };

      eventsRefProp.current.downloadWithAnnotations = downloadWithAnnotations;
    },
    [pdf, isSaveInProgress, eventsRefProp],
  );

  /**
   * Called when a document is read successfully
   */
  function onLoadSuccess() {
    if (!pdf) {
      // Impossible, but TypeScript doesn't know that
      return;
    }

    if (onLoadSuccessProps) {
      onLoadSuccessProps(pdf);
    }

    pages.current = new Array(pdf.numPages);
    annotationEditorLayers.current = new Array(pdf.numPages);
    linkService.current.setDocument(pdf);
    createAnnotationEditorUiManager();
    enableSearch(pdf);
  }

  /**
   * Called when a document failed to read successfully
   */
  function onLoadError() {
    if (!pdfError) {
      // Impossible, but TypeScript doesn't know that
      return;
    }

    warning(false, pdfError.toString());

    if (onLoadErrorProps) {
      onLoadErrorProps(pdfError);
    }
  }

  function resetDocument() {
    pdfDispatch({ type: 'RESET' });
  }

  useEffect(resetDocument, [pdfDispatch, source]);

  function loadDocument() {
    if (!source) {
      return;
    }

    const documentInitParams = options
      ? {
          ...source,
          ...options,
        }
      : source;

    const destroyable = pdfjs.getDocument(documentInitParams);
    if (onLoadProgress) {
      destroyable.onProgress = onLoadProgress;
    }
    if (onPassword) {
      destroyable.onPassword = onPassword;
    }
    const loadingTask = destroyable;

    loadingTask.promise
      .then((nextPdf: any) => {
        pdfDispatch({ type: 'RESOLVE', value: nextPdf });
      })
      .catch((error: any) => {
        if (loadingTask.destroyed) {
          return;
        }

        pdfDispatch({ type: 'REJECT', error });
      });

    return () => {
      loadingTask.destroy();
    };
  }

  useEffect(
    loadDocument,
    // Ommitted callbacks so they are not called every time they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, pdfDispatch, source],
  );

  useEffect(
    () => {
      if (typeof pdf === 'undefined') {
        return;
      }

      if (pdf === false) {
        onLoadError();
        return;
      }

      onLoadSuccess();
    },
    // Ommitted callbacks so they are not called every time they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pdf],
  );

  function setupLinkService() {
    linkService.current.setViewer(viewer.current);
    linkService.current.setExternalLinkRel(externalLinkRel);
    linkService.current.setExternalLinkTarget(externalLinkTarget);
  }

  useEffect(setupLinkService, [externalLinkRel, externalLinkTarget]);

  function registerPage(pageIndex: number, ref: HTMLDivElement) {
    pages.current[pageIndex] = ref;
  }

  function registerAnnotationEditorLayer(pageIndex: number, ref: HTMLDivElement) {
    annotationEditorLayers.current[pageIndex] = ref;
    setCanLoadAnnotations(
      annotationEditorUiManager &&
        pages.current.length > 0 &&
        pages.current.length == annotationEditorLayers.current.filter(Boolean).length,
    );
  }

  const childContext = useMemo(
    () => ({
      annotationEditorUiManager,
      annotationEditorMode,
      eventBus: eventBus.current,
      findController: findController.current,
      imageResourcesPath,
      linkService: linkService.current,
      onItemClick,
      pdf,
      registerAnnotationEditorLayer,
      registerPage,
      renderMode,
      rotate,
      setGlobalScale,
    }),
    [
      annotationEditorUiManager,
      annotationEditorMode,
      imageResourcesPath,
      onItemClick,
      pdf,
      renderMode,
      rotate,
      setGlobalScale,
    ],
  );

  const eventProps = useMemo(() => makeEventProps(otherProps, () => pdf), [otherProps, pdf]);

  function renderChildren() {
    const pagesList = new Array(pages.current.length).fill(0);

    return (
      <DocumentContext.Provider value={childContext}>
        {pagesList.map((_, pageIndex) => {
          const pageNumber = pageIndex + 1;
          const pageProps: PageProps = {
            pageNumber,
          };

          if (width) {
            pageProps.width = width;
          }

          return <Page key={pageNumber} {...pageProps} />;
        })}
      </DocumentContext.Provider>
    );
  }

  function renderContent() {
    if (!file) {
      return <Message type="no-data">{typeof noData === 'function' ? noData() : noData}</Message>;
    }

    if (pdf === undefined || pdf === null) {
      return (
        <Message type="loading">{typeof loading === 'function' ? loading() : loading}</Message>
      );
    }

    if (pdf === false) {
      return <Message type="error">{typeof error === 'function' ? error() : error}</Message>;
    }

    return renderChildren();
  }

  return (
    <div
      className={clsx('react-pdf__Document', className)}
      ref={mainContainerRef}
      style={{
        ['--scale-factor' as string]: '1',
      }}
      {...eventProps}
    >
      {renderContent()}
    </div>
  );
});

const isFunctionOrNode = PropTypes.oneOfType([PropTypes.func, PropTypes.node]);

Document.propTypes = {
  ...eventProps,
  children: PropTypes.node,
  className: isClassName,
  error: isFunctionOrNode,
  externalLinkRel: PropTypes.string,
  externalLinkTarget: PropTypes.oneOf(['_self', '_blank', '_parent', '_top'] as const),
  //@ts-ignore
  file: isFile,
  imageResourcesPath: PropTypes.string,
  inputRef: isRef,
  loading: isFunctionOrNode,
  noData: isFunctionOrNode,
  onItemClick: PropTypes.func,
  onLoadError: PropTypes.func,
  onLoadProgress: PropTypes.func,
  onLoadSuccess: PropTypes.func,
  onPassword: PropTypes.func,
  onSourceError: PropTypes.func,
  onSourceSuccess: PropTypes.func,
  options: PropTypes.shape({
    canvasFactory: PropTypes.any,
    canvasMaxAreaInBytes: PropTypes.number,
    cMapPacked: PropTypes.bool,
    CMapReaderFactory: PropTypes.any,
    cMapUrl: PropTypes.string,
    disableAutoFetch: PropTypes.bool,
    disableFontFace: PropTypes.bool,
    disableRange: PropTypes.bool,
    disableStream: PropTypes.bool,
    docBaseUrl: PropTypes.string,
    enableXfa: PropTypes.bool,
    filterFactory: PropTypes.any,
    fontExtraProperties: PropTypes.bool,
    httpHeaders: PropTypes.object,
    isEvalSupported: PropTypes.bool,
    isOffscreenCanvasSupported: PropTypes.bool,
    length: PropTypes.number,
    maxImageSize: PropTypes.number,
    ownerDocument: PropTypes.any,
    password: PropTypes.string,
    pdfBug: PropTypes.bool,
    rangeChunkSize: PropTypes.number,
    StandardFontDataFactory: PropTypes.any,
    standardFontDataUrl: PropTypes.string,
    stopAtErrors: PropTypes.bool,
    useSystemFonts: PropTypes.bool,
    useWorkerFetch: PropTypes.bool,
    verbosity: PropTypes.number,
    withCredentials: PropTypes.bool,
    worker: PropTypes.any,
  }),
  rotate: PropTypes.number,
};

export default Document;
