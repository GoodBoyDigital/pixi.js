// VideoSource.ts

import { ExtensionType } from '../../../../../extensions/Extensions';
import { Ticker } from '../../../../../ticker/Ticker';
import { detectVideoAlphaMode } from '../../../../../utils/browser/detectVideoAlphaMode';
import { TextureSource } from './TextureSource';

import type { ExtensionMetadata } from '../../../../../extensions/Extensions';
import type { Dict } from '../../../../../utils/types';
import type { ALPHA_MODES } from '../const';
import type { TextureSourceOptions } from './TextureSource';

type VideoResource = HTMLVideoElement;

/**
 * Options for video sources.
 * @memberof rendering
 */
export interface VideoSourceOptions extends TextureSourceOptions<VideoResource>
{
    /** If true, the video will start loading immediately. */
    autoLoad?: boolean;
    /** If true, the video will start playing as soon as it is loaded. */
    autoPlay?: boolean;
    /** The number of times a second to update the texture from the video. Leave at 0 to update at every render. */
    updateFPS?: number;
    /** If true, the video will be loaded with the `crossorigin` attribute. */
    crossorigin?: boolean | string;
    /** If true, the video will loop when it ends. */
    loop?: boolean;
    /** If true, the video will be muted. */
    muted?: boolean;
    /** If true, the video will play inline. */
    playsinline?: boolean;
    /** If true, the video will be preloaded. */
    preload?: boolean;
    /** The time in milliseconds to wait for the video to preload before timing out. */
    preloadTimeoutMs?: number;
    /** The alpha mode of the video. */
    alphaMode?: ALPHA_MODES;
}

export interface VideoResourceOptionsElement
{
    src: string;
    mime: string;
}

/**
 * A source for video-based textures.
 * @memberof rendering
 */
export class VideoSource extends TextureSource<VideoResource>
{
    public static extension: ExtensionMetadata = ExtensionType.TextureSource;

    /** The default options for video sources. */
    public static defaultOptions: VideoSourceOptions = {
        ...TextureSource.defaultOptions,
        /** If true, the video will start loading immediately. */
        autoLoad: true,
        /** If true, the video will start playing as soon as it is loaded. */
        autoPlay: true,
        /** The number of times a second to update the texture from the video. Leave at 0 to update at every render. */
        updateFPS: 0,
        /** If true, the video will be loaded with the `crossorigin` attribute. */
        crossorigin: true,
        /** If true, the video will loop when it ends. */
        loop: false,
        /** If true, the video will be muted. */
        muted: true,
        /** If true, the video will play inline. */
        playsinline: true,
        /** If true, the video will be preloaded. */
        preload: false,
    };

    // Public
    /** Whether or not the video is ready to play. */
    public isReady = false;
    /** The upload method for this texture. */
    public uploadMethodId = 'video';

    // Protected
    /**
     * When set to true will automatically play videos used by this texture once
     * they are loaded. If false, it will not modify the playing state.
     * @default true
     */
    protected autoPlay: boolean;

    // Private
    /**
     * `true` to use Ticker.shared to auto update the base texture.
     * @default true
     */
    private _autoUpdate: boolean;

    /**
     * `true` if the instance is currently connected to Ticker.shared to auto update the base texture.
     * @default false
     */
    private _isConnectedToTicker: boolean;

    /**
     * Promise when loading.
     * @default null
     */
    private _load: Promise<this>;

    private _msToNextUpdate: number;
    private _preloadTimeout: number;

    /** Callback when completed with load. */
    private _resolve: (value?: this | PromiseLike<this>) => void;
    private _reject: (error: ErrorEvent) => void;

    private _updateFPS: number;
    private _videoFrameRequestCallbackHandle: number | null;

    constructor(
        options: VideoSourceOptions
    )
    {
        super(options);

        // Merge provided options with default ones
        options = {
            ...VideoSource.defaultOptions,
            ...options
        };

        this._autoUpdate = true;
        this._isConnectedToTicker = false;
        this._updateFPS = options.updateFPS || 0;
        this._msToNextUpdate = 0;
        this.autoPlay = options.autoPlay !== false;
        this.alphaMode = options.alphaMode ?? 'premultiply-alpha-on-upload';

        // Binding for frame updates
        this._videoFrameRequestCallback = this._videoFrameRequestCallback.bind(this);
        this._videoFrameRequestCallbackHandle = null;

        this._load = null;
        this._resolve = null;
        this._reject = null;

        // Bind for listeners
        this._onCanPlay = this._onCanPlay.bind(this);
        this._onCanPlayThrough = this._onCanPlayThrough.bind(this);
        this._onError = this._onError.bind(this);
        this._onPlayStart = this._onPlayStart.bind(this);
        this._onPlayStop = this._onPlayStop.bind(this);
        this._onSeeked = this._onSeeked.bind(this);

        if (options.autoLoad !== false)
        {
            void this.load();
        }
    }

    /** Update the video frame if the source is not destroyed and meets certain conditions. */
    protected updateFrame(): void
    {
        if (this.destroyed)
        {
            return;
        }

        if (this._updateFPS)
        {
            // Account for if video has had its playbackRate changed
            const elapsedMS = Ticker.shared.elapsedMS * this.resource.playbackRate;

            this._msToNextUpdate = Math.floor(this._msToNextUpdate - elapsedMS);
        }

        if (!this._updateFPS || this._msToNextUpdate <= 0)
        {
            this._msToNextUpdate = this._updateFPS ? Math.floor(1000 / this._updateFPS) : 0;
        }

        if (this.isValid)
        {
            this.update();
        }
    }

    /** Callback to update the video frame and potentially request the next frame update. */
    private _videoFrameRequestCallback(): void
    {
        this.updateFrame();

        if (this.destroyed)
        {
            this._videoFrameRequestCallbackHandle = null;
        }
        else
        {
            this._videoFrameRequestCallbackHandle = this.resource.requestVideoFrameCallback(
                this._videoFrameRequestCallback
            );
        }
    }

    /**
     * Checks if the resource has valid dimensions.
     * @returns {boolean} True if width and height are set, otherwise false.
     */
    public get isValid(): boolean
    {
        return !!this.resource.videoWidth && !!this.resource.videoHeight;
    }

    /**
     * Start preloading the video resource.
     * @returns {Promise<this>} Handle the validate event
     */
    public async load(): Promise<this>
    {
        if (this._load)
        {
            return this._load;
        }

        const source = this.resource;
        const options = this.options as VideoSourceOptions;

        // Check if source data is enough and set it to complete if needed
        if ((source.readyState === source.HAVE_ENOUGH_DATA || source.readyState === source.HAVE_FUTURE_DATA)
            && source.width && source.height)
        {
            (source as any).complete = true;
        }

        // Add event listeners related to playback and seeking
        source.addEventListener('play', this._onPlayStart);
        source.addEventListener('pause', this._onPlayStop);
        source.addEventListener('seeked', this._onSeeked);

        // Add or handle source readiness event listeners
        if (!this._isSourceReady())
        {
            if (!options.preload)
            {
                // since this event fires early, only bind if not waiting for a preload event
                source.addEventListener('canplay', this._onCanPlay);
            }
            source.addEventListener('canplaythrough', this._onCanPlayThrough);
            source.addEventListener('error', this._onError, true);
        }
        else
        {
            // Source is already ready, so handle it immediately
            this._mediaReady();
        }

        this.alphaMode = await detectVideoAlphaMode();

        // Create and return the loading promise
        this._load = new Promise((resolve, reject): void =>
        {
            if (this.isValid)
            {
                resolve(this);
            }
            else
            {
                this._resolve = resolve;
                this._reject = reject;

                if (options.preloadTimeoutMs !== undefined)
                {
                    this._preloadTimeout = setTimeout(() =>
                    {
                        this._onError(new ErrorEvent(`Preload exceeded timeout of ${options.preloadTimeoutMs}ms`));
                    }, options.preloadTimeoutMs) as unknown as number;
                }
                source.load();
            }
        });

        return this._load;
    }

    /**
     * Handle video error events.
     * @param event - The error event
     */
    private _onError(event: ErrorEvent): void
    {
        this.resource.removeEventListener('error', this._onError, true);
        this.emit('error', event);

        if (this._reject)
        {
            this._reject(event);
            this._reject = null;
            this._resolve = null;
        }
    }

    /**
     * Checks if the underlying source is playing.
     * @returns True if playing.
     */
    private _isSourcePlaying(): boolean
    {
        const source = this.resource;

        return (!source.paused && !source.ended);
    }

    /**
     * Checks if the underlying source is ready for playing.
     * @returns True if ready.
     */
    private _isSourceReady(): boolean
    {
        const source = this.resource;

        return source.readyState > 2;
    }

    /** Runs the update loop when the video is ready to play. */
    private _onPlayStart(): void
    {
        // Handle edge case where video might not have received its "can play" event yet
        if (!this.isValid)
        {
            this._mediaReady();
        }

        this._configureAutoUpdate();
    }

    /** Stops the update loop when a pause event is triggered. */
    private _onPlayStop(): void
    {
        this._configureAutoUpdate();
    }

    /** Handles behavior when the video completes seeking to the current playback position. */
    private _onSeeked(): void
    {
        if (this._autoUpdate && !this._isSourcePlaying())
        {
            this._msToNextUpdate = 0;
            this.updateFrame();
            this._msToNextUpdate = 0;
        }
    }

    private _onCanPlay(): void
    {
        const source = this.resource;

        // Remove event listeners
        source.removeEventListener('canplay', this._onCanPlay);

        this._mediaReady();
    }

    private _onCanPlayThrough(): void
    {
        const source = this.resource;

        // Remove event listeners
        source.removeEventListener('canplaythrough', this._onCanPlay);

        if (this._preloadTimeout)
        {
            clearTimeout(this._preloadTimeout);
            this._preloadTimeout = undefined;
        }

        this._mediaReady();
    }

    /** Fired when the video is loaded and ready to play. */
    private _mediaReady(): void
    {
        const source = this.resource;

        if (this.isValid)
        {
            this.isReady = true;
            this.resize(source.videoWidth, source.videoHeight);
        }

        // Reset update timers and perform a frame update
        this._msToNextUpdate = 0;
        this.updateFrame();
        this._msToNextUpdate = 0;

        // Resolve the loading promise if it exists
        if (this._resolve)
        {
            this._resolve(this);
            this._resolve = null;
            this._reject = null;
        }

        // Handle play behavior based on current source status
        if (this._isSourcePlaying())
        {
            this._onPlayStart();
        }
        else if (this.autoPlay)
        {
            void this.resource.play();
        }
    }

    /** Cleans up resources and event listeners associated with this texture. */
    public destroy()
    {
        this._configureAutoUpdate();

        const source = this.resource;

        if (source)
        {
            // Remove event listeners
            source.removeEventListener('play', this._onPlayStart);
            source.removeEventListener('pause', this._onPlayStop);
            source.removeEventListener('seeked', this._onSeeked);
            source.removeEventListener('canplay', this._onCanPlay);
            source.removeEventListener('canplaythrough', this._onCanPlayThrough);
            source.removeEventListener('error', this._onError, true);

            // Clear the video source and pause
            source.pause();
            source.src = '';
            source.load();
        }

        super.destroy();
    }

    /** Should the base texture automatically update itself, set to true by default. */
    get autoUpdate(): boolean
    {
        return this._autoUpdate;
    }

    set autoUpdate(value: boolean)
    {
        if (value !== this._autoUpdate)
        {
            this._autoUpdate = value;
            this._configureAutoUpdate();
        }
    }

    /**
     * How many times a second to update the texture from the video.
     * Leave at 0 to update at every render.
     * A lower fps can help performance, as updating the texture at 60fps on a 30ps video may not be efficient.
     */
    get updateFPS(): number
    {
        return this._updateFPS;
    }

    set updateFPS(value: number)
    {
        if (value !== this._updateFPS)
        {
            this._updateFPS = value;
            this._configureAutoUpdate();
        }
    }

    /**
     * Configures the updating mechanism based on the current state and settings.
     *
     * This method decides between using the browser's native video frame callback or a custom ticker
     * for updating the video frame. It ensures optimal performance and responsiveness
     * based on the video's state, playback status, and the desired frames-per-second setting.
     *
     * - If `_autoUpdate` is enabled and the video source is playing:
     *   - It will prefer the native video frame callback if available and no specific FPS is set.
     *   - Otherwise, it will use a custom ticker for manual updates.
     * - If `_autoUpdate` is disabled or the video isn't playing, any active update mechanisms are halted.
     */
    private _configureAutoUpdate(): void
    {
        // Check if automatic updating is enabled and if the source is currently playing
        if (this._autoUpdate && this._isSourcePlaying())
        {
            // Determine if we should use the browser's native video frame callback (generally for better performance)
            if (!this._updateFPS && this.resource.requestVideoFrameCallback)
            {
                // If connected to a custom ticker, remove the update frame function from it
                if (this._isConnectedToTicker)
                {
                    Ticker.shared.remove(this.updateFrame, this);
                    this._isConnectedToTicker = false;
                    // Reset the time until the next update
                    this._msToNextUpdate = 0;
                }

                // Check if we haven't already requested a video frame callback, and if not, request one
                if (this._videoFrameRequestCallbackHandle === null)
                {
                    this._videoFrameRequestCallbackHandle = this.resource.requestVideoFrameCallback(
                        this._videoFrameRequestCallback
                    );
                }
            }
            else
            {
                // If a video frame request callback exists, cancel it, as we are switching to manual ticker-based updates
                if (this._videoFrameRequestCallbackHandle !== null)
                {
                    this.resource.cancelVideoFrameCallback(this._videoFrameRequestCallbackHandle);
                    this._videoFrameRequestCallbackHandle = null;
                }

                // If not connected to the custom ticker, add the update frame function to it
                if (!this._isConnectedToTicker)
                {
                    Ticker.shared.add(this.updateFrame, this);
                    this._isConnectedToTicker = true;
                    // Reset the time until the next update
                    this._msToNextUpdate = 0;
                }
            }
        }
        else
        {
            // If automatic updating is disabled or the source isn't playing, perform cleanup

            // Cancel any existing video frame callback request
            if (this._videoFrameRequestCallbackHandle !== null)
            {
                this.resource.cancelVideoFrameCallback(this._videoFrameRequestCallbackHandle);
                this._videoFrameRequestCallbackHandle = null;
            }

            // Remove the update frame function from the custom ticker
            if (this._isConnectedToTicker)
            {
                Ticker.shared.remove(this.updateFrame, this);
                this._isConnectedToTicker = false;
                // Reset the time until the next update
                this._msToNextUpdate = 0;
            }
        }
    }

    /**
     * Map of video MIME types that can't be directly derived from file extensions.
     * @readonly
     */
    public static MIME_TYPES: Dict<string>
        = {
            ogv: 'video/ogg',
            mov: 'video/quicktime',
            m4v: 'video/mp4',
        };

    public static test(resource: any): resource is VideoResource
    {
        return (globalThis.HTMLVideoElement && resource instanceof HTMLVideoElement);
    }
}
