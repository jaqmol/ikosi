declare type JobDoneFn<T> = (e: Error | null, v?: T) => void;
declare type JobFn<T> = (done: JobDoneFn<T>) => void;
declare type ResolveFn<T> = (v?: T) => void;
declare type RejectFn = (e: Error) => void;
export declare const MakeJobSequence: <T>() => (job: JobFn<T>, resolve: ResolveFn<T>, reject: RejectFn) => void;
export {};
