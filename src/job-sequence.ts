
type JobDoneFn<T> = (e: Error|null, v ?:T) => void;
type JobFn<T> = (done: JobDoneFn<T>) => void;
type ResolveFn<T> = (v ?:T) => void;
type RejectFn = (e :Error) => void;
type Job<T> = [JobFn<T>, ResolveFn<T>, RejectFn];
type JobsArray<T> = Job<T>[];

export const MakeJobSequence = <T>() => {
    const jobs :JobsArray<T> = [];
    let idling = true;
    const next = () => {
        if (idling && jobs.length) {
            const [job, resolve, reject] = jobs.splice(0, 1)[0];
            try {
                idling = false;
                job((e: Error|null, v ?:T) => {
                    if (e) reject(e);
                    else resolve(v);
                    idling = true;
                    setTimeout(next, 0);
                });
            } catch(e) {
                reject(e);
            }
        }
    };
    return (job :JobFn<T>, resolve: ResolveFn<T>, reject: RejectFn) => {
        jobs.push([job, resolve, reject]);
        setTimeout(next, 0);
    };
};