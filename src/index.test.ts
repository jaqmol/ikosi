import { MakeIkosi } from ".";
import { 
    loremIpsum,
    filterEven,
    filterOdd,
} from "./test-utils";

test('Ikosi', async () => {
    const ikosi = await MakeIkosi('build/test-a.icf');
    await ikosi.set(`k:a`, Buffer.from(loremIpsum[0]));
    await ikosi.set(`k:b`, Buffer.from(loremIpsum[1]));
    await ikosi.delete(`k:b`);
    await ikosi.set(`k:c`, Buffer.from(loremIpsum[2]));
    await ikosi.set(`k:d`, Buffer.from(loremIpsum[3]));
    await ikosi.delete(`k:d`);
    await ikosi.set(`k:e`, Buffer.from(loremIpsum[4]));
});