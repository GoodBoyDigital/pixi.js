/**
 * The prepare namespace provides renderer-specific plugins for pre-rendering DisplayObjects. These plugins are useful for
 * asynchronously preparing assets, textures, graphics waiting to be displayed.
 *
 * Do not instantiate these plugins directly. It is available from the `renderer.plugins` property.
 * See {@link PIXI.CanvasRenderer#plugins} or {@link PIXI.WebGLRenderer#plugins}.
 * @namespace PIXI.prepare
 */
export { default as webgl } from './webgl/WebGLPrepare';
export { default as canvas } from './canvas/CanvasPrepare';
export { default as BasePrepare } from './BasePrepare';
export { default as CountLimiter } from './limiters/CountLimiter';
export { default as TimeLimiter } from './limiters/TimeLimiter';
