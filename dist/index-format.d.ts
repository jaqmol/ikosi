export declare const extractIndex: (data: Uint8Array) => Map<string, [number, number]>;
export declare const decodeIndex: (indexData: Uint8Array) => Map<string, [number, number]>;
export declare const encodeIndex: (index: Map<string, [number, number]>) => any;
export declare const extractDataIndex: (data: Uint8Array) => Map<string, Uint8Array>;
