const {replaceInString} = require('../../utils');

test('replace classes in html string', () => {
    const content = '<div class=\\"a-class b-class c-class\\"><div class=\"a-class\"><div class="a-class"></div>a-class<div><div class=\\"a-class\\"></div><div class=\\"b-class a-class c-class\\"><div class=\\"c-class a-class b-class\\"><div class=\\"c-class b-class a-class\\"></div></div>';

    const jsonData = {
        '.a-class': '.aaa',
        '.b-class': '.bbb',
        '.c-class': '.ccc',
    };

    const result = replaceInString(jsonData, content, '.js');

    for (const key in jsonData) {
        const className = key.replace('.', '')
        expect(result).not.toContain(`\\"${className}`);
        expect(result).not.toContain(`${className}\\"`);
        expect(result).not.toContain(`${className} `);
        expect(result).not.toContain(` ${className}`);
    }
});
