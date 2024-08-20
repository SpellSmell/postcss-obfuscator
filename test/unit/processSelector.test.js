const {processSelector} = require('../../utils');

test('process selector with similar css class names', () => {
    const selector = '.ui-tabs__button:not(.ui-tabs__button--grow)';

    const result = processSelector(selector);

    for (const key in result.jsonData) {
        const className = key.replace('.', '')
        const obfuscatedClassName = result.jsonData[key];

        expect(result.selector).not.toContain(className);
        expect(result.selector).toContain(obfuscatedClassName);
    }
});
