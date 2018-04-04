import { settings } from '@pixi/settings';
import { Stage } from '@pixi/display';
import { Renderer } from '@pixi/core';
import { Ticker, UPDATE_PRIORITY } from '@pixi/ticker';

/**
 * Convenience class to create a new PIXI application.
 * This class automatically creates the renderer, ticker
 * and root container.
 *
 * @example
 * // Create the application
 * const app = new PIXI.Application();
 *
 * // Add the view to the DOM
 * document.body.appendChild(app.view);
 *
 * // ex, add display objects
 * app.stage.addChild(PIXI.Sprite.fromImage('something.png'));
 *
 * @class
 * @memberof PIXI
 */
export default class Application
{
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {object} [options] - The optional renderer parameters
     * @param {boolean} [options.autoStart=true] - automatically starts the rendering after the construction.
     *     Note that setting this parameter to false does NOT stop the shared ticker even if you set
     *     options.sharedTicker to true in case that it is already started. Stop it by your own.
     * @param {number} [options.width=800] - the width of the renderers view
     * @param {number} [options.height=600] - the height of the renderers view
     * @param {HTMLCanvasElement} [options.view] - the canvas to use as a view, optional
     * @param {boolean} [options.transparent=false] - If the render view is transparent, default false
     * @param {boolean} [options.antialias=false] - sets antialias (only applicable in chrome at the moment)
     * @param {boolean} [options.preserveDrawingBuffer=false] - enables drawing buffer preservation, enable this if you
     *  need to call toDataUrl on the webgl context
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer, retina would be 2
     * @param {boolean} [options.forceCanvas=false] - prevents selection of WebGL renderer, even if such is present
     * @param {number} [options.backgroundColor=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     * @param {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear the canvas or
     *   not before the new render pass.
     * @param {boolean} [options.roundPixels=false] - If true PixiJS will Math.floor() x/y values when rendering,
     *  stopping pixel interpolation.
     * @param {boolean} [options.forceFXAA=false] - forces FXAA antialiasing to be used over native.
     *  FXAA is faster, but may not always look as great **webgl only**
     * @param {string} [options.powerPreference] - Parameter passed to webgl context, set to "high-performance"
     *  for devices with dual graphics card **webgl only**
     * @param {boolean} [options.sharedTicker=false] - `true` to use PIXI.Ticker.shared, `false` to create new ticker.
     * @param {boolean} [options.sharedLoader=false] - `true` to use PIXI.Loaders.shared, `false` to create new Loader.
     * @param {PIXI.Container} {options.stage} - Pass existing stage or container
     * @param {number} {options.animationDeltaMax} - How many frames will be processed by animation if user switches the tab
     */
    constructor(options, arg2, arg3, arg4, arg5)
    {
        // Support for constructor(width, height, options, noWebGL, useSharedTicker)
        if (typeof options === 'number')
        {
            options = Object.assign({
                width: options,
                height: arg2 || settings.RENDER_OPTIONS.height,
                forceCanvas: !!arg4,
                sharedTicker: !!arg5,
            }, arg3);
        }

        /**
         * The default options, so we mixin functionality later.
         * @member {object}
         * @protected
         */
        this._options = options = Object.assign({
            autoStart: true,
            sharedTicker: false,
            forceCanvas: false,
            sharedLoader: false,
        }, options);

        /**
         * WebGL renderer if available, otherwise CanvasRenderer
         * @member {PIXI.Renderer|PIXI.CanvasRenderer}
         */
        this.renderer = this.createRenderer(options);

        /**
         * The root display container that's rendered.
         * @member {PIXI.Container}
         */
        this.stage = options.stage || new Stage();

        /**
         * How many frames will be processed by animation if user switches the tab
         *
         * @member {number}
         * @default 5
         */
        this.animationDeltaMax = options.animationDeltaMax || 5;

        /**
         * Internal reference to the ticker
         * @member {PIXI.Ticker}
         * @private
         */
        this._ticker = null;

        /**
         * Ticker for doing render updates.
         * @member {PIXI.Ticker}
         * @default PIXI.Ticker.shared
         */
        this.ticker = options.sharedTicker ? Ticker.shared : new Ticker();

        // Start the rendering
        if (options.autoStart)
        {
            this.start();
        }
    }

    /**
     * Create the new renderer, this is here to overridden to support Canvas.
     *
     * @protected
     * @param {Object} [options] See constructor for complete arguments
     */
    createRenderer(options)
    {
        return new Renderer(options);
    }

    set ticker(ticker) // eslint-disable-line require-jsdoc
    {
        if (this._ticker)
        {
            this._ticker.remove(this.render, this);
        }
        this._ticker = ticker;
        if (ticker)
        {
            ticker.add(this.render, this, UPDATE_PRIORITY.LOW);
        }
    }
    get ticker() // eslint-disable-line require-jsdoc
    {
        return this._ticker;
    }

    /**
     * Render the current stage.
     */
    render(delta)
    {
        if (this.stage.animate)
        {
            // Time travel animation fix
            if (delta < 0)
            {
                delta = 0;
            }
            if (delta > this.animationDeltaMax)
            {
                delta = this.animationDeltaMax;
            }
            this.stage.onAnimate(delta);
        }

        this.renderer.render(this.stage);
    }

    /**
     * Convenience method for stopping the render.
     */
    stop()
    {
        this._ticker.stop();
    }

    /**
     * Convenience method for starting the render.
     */
    start()
    {
        this._ticker.start();
    }

    /**
     * Reference to the renderer's canvas element.
     * @member {HTMLCanvasElement}
     * @readonly
     */
    get view()
    {
        return this.renderer.view;
    }

    /**
     * Reference to the renderer's screen rectangle. Its safe to use as filterArea or hitArea for whole screen
     * @member {PIXI.Rectangle}
     * @readonly
     */
    get screen()
    {
        return this.renderer.screen;
    }

    /**
     * Destroy and don't use after this.
     * @param {Boolean} [removeView=false] Automatically remove canvas from DOM.
     */
    destroy(removeView)
    {
        if (this._ticker)
        {
            const oldTicker = this._ticker;

            this.ticker = null;
            oldTicker.destroy();
        }

        this.stage.destroy();
        this.stage = null;

        this.renderer.destroy(removeView);
        this.renderer = null;

        this._options = null;
    }
}
