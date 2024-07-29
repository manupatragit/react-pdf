import invariant from 'tiny-invariant';
import pdfjs from '../pdfjs.js';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DummyL10n } from '../shared/dummyL10n.js';
import clsx from 'clsx';
import useDocumentContext from '../shared/hooks/useDocumentContext.js';
import usePageContext from '../shared/hooks/usePageContext.js';

export default function AnnotationEditorLayer() {
  const annotationEditorLayerRef = useRef<any>(null);
  const documentContext = useDocumentContext();
  const pageContext = usePageContext();
  const [annotationEditorLayer, setAnnotationEditorLayer] = useState(null);

  invariant(pageContext, 'Unable to find Page context.');

  const mergedProps = { ...documentContext, ...pageContext };
  const {
    annotationEditorUiManager,
    annotationLayer,
    page,
    pageIndex,
    registerAnnotationEditorLayer,
    rotate,
    scale = 1,
    textLayerRef,
    drawLayer,
  } = mergedProps;
  invariant(page, 'Attempted to load page annotations, but no page was specified.');

  const viewport = useMemo(
    () => page.getViewport({ scale, rotation: rotate }),
    [page, rotate, scale],
  );

  function getAnnotationEditorLayer() {
    const clonedViewport = viewport.clone({ dontFlip: true });

    const newAnnotationEditorLayer = new pdfjs.AnnotationEditorLayer({
      uiManager: annotationEditorUiManager,
      div: annotationEditorLayerRef.current,
      pageIndex: pageIndex,
      viewport: clonedViewport,
      annotationLayer: annotationLayer,
      textLayer: { div: (textLayerRef as any)?.current },
      drawLayer,
      l10n: new DummyL10n(),
    });

    newAnnotationEditorLayer.render({
      viewport: clonedViewport,
      div: annotationEditorLayerRef.current,
      annotations: null,
      // TODO: Correct value
      intent: 'display',
    });

    setAnnotationEditorLayer(newAnnotationEditorLayer);
    if (registerAnnotationEditorLayer) {
      registerAnnotationEditorLayer(pageIndex, newAnnotationEditorLayer);
    }
  }

  useEffect(() => {
    if (annotationEditorUiManager && viewport && annotationLayer && textLayerRef && drawLayer) {
      if (annotationEditorLayer) {
        const clonedViewport = viewport.clone({ dontFlip: true });
        (annotationEditorLayer as any).update({ viewport: clonedViewport });
      } else {
        getAnnotationEditorLayer();
      }
    }
  }, [annotationEditorUiManager, viewport, annotationLayer, textLayerRef, drawLayer]);

  return (
    <div
      className={clsx('react-pdf__Page__annotationEditorLayer', 'annotationEditorLayer')}
      ref={annotationEditorLayerRef}
    />
  );
}
