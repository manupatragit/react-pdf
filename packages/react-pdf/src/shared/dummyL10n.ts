class DummyL10n {
  async getLanguage() {
    return 'en-us';
  }

  async getDirection() {
    return 'ltr';
  }

  async get(key: any) {
    return key;
  }

  async translate(element: any) {
    return element;
  }
}

export { DummyL10n };
