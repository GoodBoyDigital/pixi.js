import { BaseImageResource } from './BaseImageResource';

type VideoFrame = any;

/**
 * Resource type for VideoFrame.
 * @memberof PIXI
 */
export class VideoFrameResource extends BaseImageResource
{
    /**
     * @param source - Image element to use
     */
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(source: VideoFrame)
    {
        super(source);
    }

    /**
     * Used to auto-detect the type of resource.
     * @param {*} source - The source object
     * @returns {boolean} `true` if source is an VideoFrame
     */
    static test(source: unknown): source is VideoFrame
    {
        return !!(window as any).VideoFrame && source instanceof (window as any).VideoFrame;
    }
}
