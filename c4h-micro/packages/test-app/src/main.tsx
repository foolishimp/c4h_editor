import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import TestApp from './App';

const lifecycles = singleSpaReact({
  React,
  ReactDOM,            // use react-dom (has .render) so TS matches
  rootComponent: TestApp,
  // optional: supply DOM element getter
  domElementGetter: () => document.getElementById('root')!,
  errorBoundary(err, info, props) {
    return <div>Error loading Test App</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
