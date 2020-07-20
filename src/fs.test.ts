import fs from "fs";
import { promisify } from "util";
import { loremIpsum } from "./test-utils";

test('FS Random Position writing', async () => {
    let fd = await promisify(fs.open)('build/fs-test-a.txt', 'w');
    await promisify(fs.close)(fd);
    fd = await promisify(fs.open)('build/fs-test-a.txt', 'r+');
    const headerNull = Buffer.from('····················\n');
    await promisify(fs.write)(
        fd, headerNull, 0, headerNull.length, 0,
    );
    let offset = headerNull.length;
    const promises = loremIpsum
        .map(s => Buffer.from(`${s}\n`))
        .map(b => {
            const position = offset;
            offset += b.length;
            return promisify(fs.write)(fd, b, 0, b.length, position);
        });
    await Promise.all(promises);
    const headerOverwrite = Buffer.from(`${1337}`);
    await promisify(fs.write)(
        fd, headerOverwrite, 0, headerOverwrite.length, 0,
    );
    await promisify(fs.close)(fd);
});