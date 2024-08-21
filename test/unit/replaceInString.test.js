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
        const oldClassName = key.replace('.', '')
        expect(result).not.toContain(`\\"${oldClassName}`);
        expect(result).not.toContain(`${oldClassName}\\"`);
        expect(result).not.toContain(`${oldClassName} `);
        expect(result).not.toContain(` ${oldClassName}`);
    }
});

test('replace classes in js string', () => {
    let script = 'aClass(\'aClass\', \'.aClass\', "aClass", ".aClass");';
    script += 'bClass(\'b-class\', \'.b-class\', "b-class", ".b-class");';

    const jsonData = {
        '.aClass': '.aaa',
        '.b-class': '.bbb',
    };

    const result = replaceInString(jsonData, script, '.js');

    for (const key in jsonData) {
        const oldClassName = key.replace('.', '');
        const newClassName = jsonData[key].replace('.', '');

        expect(result).not.toContain(`'${oldClassName}'`);
        expect(result).not.toContain(`'.${oldClassName}'`);
        expect(result).not.toContain(`"${oldClassName}"`);
        expect(result).not.toContain(`".${oldClassName}"`);

        expect(result).toContain(`'${newClassName}'`);
        expect(result).toContain(`'.${newClassName}'`);
        expect(result).toContain(`"${newClassName}"`);
        expect(result).toContain(`".${newClassName}"`);
    }
});
