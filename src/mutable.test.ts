import {
    MakeMutableIkosiBackend,
    MakeMutableIkosi,
} from "./mutable";

import {  
    encodeStringToBytes,
    decodeBytesToString,
} from "./text-encoding";

import {  
    loremIpsum,
    loremIpsumIkosiStorageFormat,
    keyFromIndex,
} from "./test-utils";

test('Singular mutable backend set test', () => {
    const iko = MakeMutableIkosiBackend();
    const sentenceBytes = encodeStringToBytes(loremIpsum[0]);
    iko.set('a', sentenceBytes);
    const retrievedSentenceBytes = iko.get('a');
    expect(retrievedSentenceBytes).toBeDefined();
    if (retrievedSentenceBytes) {
        const retrievedSentence = decodeBytesToString(retrievedSentenceBytes);
        expect(retrievedSentence).toBe(loremIpsum[0]);
    }
});

test('Multiple mutable backend set tests', () => {
    const iko = MakeMutableIkosiBackend();
    for (const [index, sentence] of loremIpsum.entries()) {
        const sentenceBytes = encodeStringToBytes(sentence);
        iko.set(keyFromIndex(index), sentenceBytes);
    }
    for (const [index, expectedSentence] of loremIpsum.entries()) {
        const sentenceBytes = iko.get(keyFromIndex(index));
        expect(sentenceBytes).toBeDefined();
        if (sentenceBytes) {
            const retrievedSentence = decodeBytesToString(sentenceBytes);
            expect(retrievedSentence).toBe(expectedSentence);
        }
    }
});

test('Singular mutable backend serialize test', () => {
    const ikoA = MakeMutableIkosiBackend();
    const sentenceBytes = encodeStringToBytes(loremIpsum[0]);
    ikoA.set('a', sentenceBytes);
    const storageFormat = ikoA.serialize();
    const ikoB = MakeMutableIkosiBackend(storageFormat);
    const retrievedSentenceBytes = ikoB.get('a');
    expect(retrievedSentenceBytes).toBeDefined();
    if (retrievedSentenceBytes) {
        const retrievedSentence = decodeBytesToString(retrievedSentenceBytes);
        expect(retrievedSentence).toBe(loremIpsum[0]);
    }
});

test('Multiple mutable backend serialize tests', () => {
    const storageFormat = loremIpsumIkosiStorageFormat();
    const iko = MakeMutableIkosiBackend(storageFormat);
    for (const [index, expectedSentence] of loremIpsum.entries()) {
        const sentenceBytes = iko.get(keyFromIndex(index));
        expect(sentenceBytes).toBeDefined();
        if (sentenceBytes) {
            const retrievedSentence = decodeBytesToString(sentenceBytes);
            expect(retrievedSentence).toBe(expectedSentence);
        }
    }
});

test('Mutable ikosi types test', () => {
    const ikoA = MakeMutableIkosi(MakeMutableIkosiBackend());
    
    ikoA.setBoolean('boolean', true);
    let retrievedBool = ikoA.getBoolean('boolean');
    expect(retrievedBool).toBe(true);
    ikoA.setBoolean('boolean', false);
    retrievedBool = ikoA.getBoolean('boolean');
    expect(retrievedBool).toBe(false);

    ikoA.setNumber('number', 12000);
    let retrievedNum = ikoA.getNumber('number');
    expect(retrievedNum).toBe(12000);
    ikoA.setNumber('number', 64000000);
    retrievedNum = ikoA.getNumber('number');
    expect(retrievedNum).toBe(64000000);

    ikoA.setString('string', 'lorem ipsum');
    let retrievedStr = ikoA.getString('string');
    expect(retrievedStr).toBe('lorem ipsum');
    ikoA.setString('string', 'ipsum lorem');
    retrievedStr = ikoA.getString('string');
    expect(retrievedStr).toBe('ipsum lorem');

    type JSONTestType = [boolean, number, string, ];
    ikoA.setJSON<JSONTestType>('json', [true, 12000, 'lorem ipsum']);
    let retrievedJson = ikoA.getJSON<JSONTestType>('json');
    expect(retrievedJson).toEqual([true, 12000, 'lorem ipsum']);
    ikoA.setJSON<JSONTestType>('json', [false, 64000000, 'ipsum lorem']);
    retrievedJson = ikoA.getJSON('json');
    expect(retrievedJson).toEqual([false, 64000000, 'ipsum lorem']);

    const storageFormat = ikoA.serialize();
    const ikoB = MakeMutableIkosi(MakeMutableIkosiBackend(storageFormat));

    retrievedBool = ikoB.getBoolean('boolean');
    expect(retrievedBool).toBe(false);
    retrievedNum = ikoB.getNumber('number');
    expect(retrievedNum).toBe(64000000);
    retrievedStr = ikoB.getString('string');
    expect(retrievedStr).toBe('ipsum lorem');
    retrievedJson = ikoB.getJSON('json');
    expect(retrievedJson).toEqual([false, 64000000, 'ipsum lorem']);
});
