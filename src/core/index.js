/**
 * @file        Main export of the PIXI core library
 * @author      Mat Groves <mat@goodboydigital.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

/**
 * @namespace PIXI
 */
var core = module.exports = {
    // utils
    utils: require('./utils'),
    math: require('./math'),
    CONST: require('./const'),

    // display
    DisplayObject:          require('./display/DisplayObject'),
    Container:              require('./display/Container'),

    // legacy..
    Stage:                  require('./display/Container'),
    DisplayObjectContainer: require('./display/Container'),

    Sprite:                 require('./sprites/Sprite'),
    ParticleContainer:      require('./particles/ParticleContainer'),
    SpriteRenderer:         require('./sprites/webgl/SpriteRenderer'),
    ParticleRenderer:       require('./particles/webgl/ParticleRenderer'),

    // primitives
    Graphics:               require('./graphics/Graphics'),
    GraphicsData:           require('./graphics/GraphicsData'),
    GraphicsRenderer:       require('./graphics/webgl/GraphicsRenderer'),

    // textures
    Texture:                require('./textures/Texture'),
    BaseTexture:            require('./textures/BaseTexture'),
    RenderTexture:          require('./textures/RenderTexture'),
    VideoBaseTexture:       require('./textures/VideoBaseTexture'),

    // renderers - canvas
    CanvasRenderer:         require('./renderers/canvas/CanvasRenderer'),
    CanvasGraphics:         require('./renderers/canvas/utils/CanvasGraphics'),
    CanvasBuffer:           require('./renderers/canvas/utils/CanvasBuffer'),

    // renderers - webgl
    WebGLRenderer:          require('./renderers/webgl/WebGLRenderer'),
    ShaderManager:          require('./renderers/webgl/managers/ShaderManager'),
    Shader:                 require('./renderers/webgl/shaders/Shader'),

    // filters - webgl
    AbstractFilter:         require('./renderers/webgl/filters/AbstractFilter'),

    /**
     * This helper function will automatically detect which renderer you should be using.
     * WebGL is the preferred renderer as it is a lot faster. If webGL is not supported by
     * the browser then this function will return a canvas renderer
     *
     * @param width=800 {number} the width of the renderers view
     * @param height=600 {number} the height of the renderers view
     * @param [options] {object} The optional renderer parameters
     * @param [options.view] {HTMLCanvasElement} the canvas to use as a view, optional
     * @param [options.transparent=false] {boolean} If the render view is transparent, default false
     * @param [options.antialias=false] {boolean} sets antialias (only applicable in chrome at the moment)
     * @param [options.preserveDrawingBuffer=false] {boolean} enables drawing buffer preservation, enable this if you
     *      need to call toDataUrl on the webgl context
     * @param [options.resolution=1] {number} the resolution of the renderer, retina would be 2
     * @param [options.retinaPrefix=/@(.+)x/] {string} the prefix that denotes a URL is for a retina asset
     * @param [noWebGL=false] {boolean} prevents selection of WebGL renderer, even if such is present
     *
     * @return {WebGLRenderer|CanvasRenderer} Returns WebGL renderer if available, otherwise CanvasRenderer
     */
    autoDetectRenderer: function (width, height, options, noWebGL)
    {
        width = width || 800;
        height = height || 600;

        if (!noWebGL && checkWebGL())
        {
            return new core.WebGLRenderer(width, height, options);
        }

        return new core.CanvasRenderer(width, height, options);
    }
};

// add constants to export
var CONST = require('./const');

for (var c in CONST) {
    core[c] = CONST[c];
}


var contextOptions = { stencil: true };

function checkWebGL()
{
    try
    {
        if (!window.WebGLRenderingContext)
        {
            return false;
        }

        var canvas = document.createElement('canvas'),
            gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);

        return !!(gl && gl.getContextAttributes().stencil);
    }
    catch (e)
    {
        return false;
    }
}
