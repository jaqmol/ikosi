import { MakeIkosi } from ".";
import { 
    loremIpsum,
    filterEven,
    filterOdd,
} from "./test-utils";

test('Ikosi simple test', async () => {
    const filepath = 'build/test-simple.icf';
    const ikosiA = await MakeIkosi(filepath);
    
    const valueA = Buffer.from(loremIpsum[0]);
    await ikosiA.set('a', valueA);

    const rereadValueABuff = await ikosiA.get('a');
    expect(rereadValueABuff).toBeDefined();
    if (rereadValueABuff) {
        const rereadValueA = rereadValueABuff.toString();
        expect(rereadValueA).toBe(loremIpsum[0]);
    }

    const ikosiB = await MakeIkosi(filepath);
    const rereadValueBBuff = await ikosiB.get('a');
    expect(rereadValueBBuff).toBeDefined();
    if (rereadValueBBuff) {
        const rereadValueB = rereadValueBBuff.toString();
        expect(rereadValueB).toBe(loremIpsum[0]);
    }
});