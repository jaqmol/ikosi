import { MutableBackend, MutableIkosi } from "./types";
export declare const MakeMutableBackend: (buffer?: ArrayBuffer | undefined) => MutableBackend;
export declare const MakeMutableIkosi: (backend: MutableBackend) => MutableIkosi;
