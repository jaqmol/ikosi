import { 
    loremIpsumIkosiStorageFormat, 
    keyFromIndex, 
    loremIpsum, 
    multiTypeAExpectations, 
    multiTypeAIkosiStorageFormat
} from "./test-utils";
import { decodeBytesToString } from "./text-encoding";
import { 
    MakeImmutableBackend,
    MakeImmutableIkosi,
} from "./immutable";

test('Multiple immutable backend deserialize and get tests', () => {
    const storageFormat = loremIpsumIkosiStorageFormat();
    const backend = MakeImmutableBackend(storageFormat);
    for (const [index, expectedSentence] of loremIpsum.entries()) {
        const sentenceBytes = backend.get(keyFromIndex(index));
        expect(sentenceBytes).toBeDefined();
        if (sentenceBytes) {
            const retrievedSentence = decodeBytesToString(sentenceBytes);
            expect(retrievedSentence).toBe(expectedSentence);
        }
    }
});

test('Multiple multi-type immutable deserialize and get tests', () => {
    const storageFormat = multiTypeAIkosiStorageFormat();
    const iko = MakeImmutableIkosi(MakeImmutableBackend(storageFormat));
    expect(iko.size()).toBe(4);
    const boolValue = iko.getBoolean('boolean');
    expect(boolValue).toBe(multiTypeAExpectations.boolean);
    const numValue = iko.getNumber('number');
    expect(numValue).toBe(multiTypeAExpectations.number);
    const strValue = iko.getString('string');
    expect(strValue).toBe(multiTypeAExpectations.string);
    const jsonValue = iko.getJSON('json');
    expect(jsonValue).toEqual(multiTypeAExpectations.json);
});