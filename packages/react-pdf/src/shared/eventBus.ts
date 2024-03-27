/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @typedef {Object} WaitOnEventOrTimeoutParameters
 * @property {Object} target - The event target, can for example be:
 *   `window`, `document`, a DOM element, or an {EventBus} instance.
 * @property {string} name - The name of the event.
 * @property {number} delay - The delay, in milliseconds, after which the
 *   timeout occurs (if the event wasn't already dispatched).
 */

/**
 * Simple event bus for an application. Listeners are attached using the `on`
 * and `off` methods. To raise an event, the `dispatch` method shall be used.
 */
export class EventBus {
  #listeners = Object.create(null);

  /**
   * @param {string} eventName
   * @param {function} listener
   * @param {Object} [options]
   */
  on(eventName: any, listener: any, options: any = null) {
    console.log('on called', { eventName, listener });
    this._on(eventName, listener, {
      external: true,
      once: options?.once,
    });
  }

  /**
   * @param {string} eventName
   * @param {function} listener
   * @param {Object} [options]
   */
  off(eventName: any, listener: any, options: any = null) {
    console.log('on called', { eventName, listener });
    this._off(eventName, listener, {
      external: true,
      once: options?.once,
    });
  }

  /**
   * @param {string} eventName
   * @param {Object} data
   */
  dispatch(eventName: any, data: any) {
    const eventListeners = this.#listeners[eventName];
    if (!eventListeners || eventListeners.length === 0) {
      return;
    }
    let externalListeners;
    // Making copy of the listeners array in case if it will be modified
    // during dispatch.
    for (const { listener, external, once } of eventListeners.slice(0)) {
      if (once) {
        this._off(eventName, listener);
      }
      if (external) {
        externalListeners ||= [];
        externalListeners.push(listener);
        continue;
      }
      listener(data);
    }
    // Dispatch any "external" listeners *after* the internal ones, to give the
    // viewer components time to handle events and update their state first.
    if (externalListeners) {
      for (const listener of externalListeners) {
        listener(data);
      }
      externalListeners = null;
    }
  }

  /**
   * @ignore
   */
  _on(eventName: any, listener: any, options: any = null) {
    const eventListeners = (this.#listeners[eventName] ||= []);
    eventListeners.push({
      listener,
      external: options?.external === true,
      once: options?.once === true,
    });
  }

  /**
   * @ignore
   */
  _off(eventName: any, listener: any, options: any = null) {
    const eventListeners = this.#listeners[eventName];
    if (!eventListeners) {
      return;
    }
    for (let i = 0, ii = eventListeners.length; i < ii; i++) {
      if (eventListeners[i].listener === listener) {
        eventListeners.splice(i, 1);
        return;
      }
    }
  }
}
