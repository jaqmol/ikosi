import { MutableIkosiBackend, MutableIkosi } from "./types";
export declare const MakeMutableIkosiBackend: (buffer?: ArrayBuffer | undefined) => MutableIkosiBackend;
export declare const MakeMutableIkosi: (backend: MutableIkosiBackend) => MutableIkosi;
