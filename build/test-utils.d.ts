export declare const filterEven: <T = any>(_: T, index: number) => boolean;
export declare const filterOdd: <T = any>(_: T, index: number) => boolean;
export declare const loremIpsum: string[];
export declare const loremIpsumIkosiStorageFormat: () => ArrayBuffer;
export declare type JSONTestType = [boolean, number, string];
export declare const multiTypeAExpectations: {
    boolean: boolean;
    number: number;
    string: string;
    json: (string | number | boolean)[];
};
export declare const multiTypeBExpectations: {
    boolean: boolean;
    number: number;
    string: string;
    json: (string | number | boolean)[];
};
export declare const multiTypeAIkosiStorageFormat: () => ArrayBuffer;
export declare const multiTypeBIkosiStorageFormat: () => ArrayBuffer;
export declare const keyFromIndex: (index: number) => string;
