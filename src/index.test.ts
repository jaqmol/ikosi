import { MakeIkosi } from ".";
import { 
    loremIpsum,
    filterEven,
    filterOdd,
} from "./test-utils";

test('Ikosi', async () => {
    const ikosi = await MakeIkosi('build/test-a.icf');
    
    const keysAndValues = loremIpsum.map<[string, Buffer]>((sentence, i) => [
        `k:${String.fromCharCode(97 + i)}`,
        Buffer.from(sentence),
    ]);

    await Promise.all(keysAndValues.map(args => ikosi.set(...args)));
    

    // for (let i = 0; i < loremIpsum.length; i++) {
    //     const sentence = loremIpsum[i];
    //     const key = `k:${String.fromCharCode(97 + i)}`;
    //     const value = Buffer.from(sentence);
    //     return ikosi.set(key, value);
    // }
    // await Promise.all(loremIpsum.map((s, i) => {
        
    //     return ikosi.set(key, value);
    // }));
});