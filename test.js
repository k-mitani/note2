const fs = require('fs');
const path = require('path');

function main() {
    const bookspath = "C:\\w\\note2\\notebooks";
    let files = [];
    for (const booksDir of fs.readdirSync(bookspath).map(name => path.join(bookspath, name))) {
        for (const noteDir of fs.readdirSync(booksDir).map(name => path.join(booksDir, name))) {
            for (const jsonPath of fs.readdirSync(noteDir).map(name => path.join(noteDir, name))) {
                var json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                files.push(json);
            }
        }
    }

    const prefixes = [
        `<?xml version="1.0" encoding="UTF-8" standalone="no"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">`,
        `<?xml version="1.0" encoding="UTF-8" standalone="no"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿<en-note>`,
        `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">`,
        `<?xml version="1.0" encoding="UTF-8"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿<en-note>`,
        `<?xml version="1.0" encoding="UTF-8"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿👿<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">`,
        `<?xml version="1.0" encoding="UTF-8"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿👿<en-note>`,
        `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE  en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>`,
        `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE  en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">`,
        `<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>`,
        `<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml3.dtd"><en-note>`,
        `<?xml version="1.0" encoding="UTF-8"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">👿👿<en-note bgcolor="#FFFFFF">`,
        `<?xml version="1.0" encoding="UTF-8"?>👿<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"👿><en-note>`,
    ].map(str => str.replace(/👿/g, "\n"));

    let count = 0;
    let sss = "";
    for (const json of files) {
        let content = json.Content;

        for (const prefix of prefixes) {
            content = content.replaceAll(prefix, '');
        }

        content = content.trim();
        content = content.replace('<?xml version="1.0" encoding="UTF-8"?>', '');
        content = content.replace('</en-note>', '');
        content = content.replaceAll('\n', '👿');
        sss += content + "\n";
        count++;
    }

    fs.writeFileSync("C:\\w\\test2.txt", sss, 'utf8');
    console.log(count);
}

try {
    main();
} catch (error) {
    console.error(error);
}
