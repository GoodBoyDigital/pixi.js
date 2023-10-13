declare module '*.worker.ts'
{
    class WorkerLoader extends Worker
    {
        constructor();

        static revokeObjectURL(): void;
    }

    export default WorkerLoader;
}
