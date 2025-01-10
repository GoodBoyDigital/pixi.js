import { AccessibilitySystem } from '../../../../accessibility/AccessibilitySystem';
import { CustomRenderPipe } from '../../../../scene/container/CustomRenderPipe';
import { RenderGroupPipe } from '../../../../scene/container/RenderGroupPipe';
import { RenderGroupSystem } from '../../../../scene/container/RenderGroupSystem';
import { SpritePipe } from '../../../../scene/sprite/SpritePipe';
import { RendererInitHook } from '../../../../utils/global/globalHooks';
import { BatcherPipe } from '../../../batcher/shared/BatcherPipe';
import { AlphaMaskPipe } from '../../../mask/alpha/AlphaMaskPipe';
import { ColorMaskPipe } from '../../../mask/color/ColorMaskPipe';
import { StencilMaskPipe } from '../../../mask/stencil/StencilMaskPipe';
import { BackgroundSystem } from '../background/BackgroundSystem';
import { BlendModePipe } from '../blendModes/BlendModePipe';
import { ExtractSystem } from '../extract/ExtractSystem';
import { GenerateTextureSystem } from '../extract/GenerateTextureSystem';
import { GlobalUniformSystem } from '../renderTarget/GlobalUniformSystem';
import { SchedulerSystem } from '../SchedulerSystem';
import { HelloSystem } from '../startup/HelloSystem';
import { RenderableGCSystem } from '../texture/RenderableGCSystem';
import { TextureGCSystem } from '../texture/TextureGCSystem';
import { ViewSystem } from '../view/ViewSystem';

import type { ExtractRendererOptions } from './utils/typeUtils';

export const SharedSystems = [
    AccessibilitySystem,
    BackgroundSystem,
    GlobalUniformSystem,
    HelloSystem,
    ViewSystem,
    RenderGroupSystem,
    TextureGCSystem,
    GenerateTextureSystem,
    ExtractSystem,
    RendererInitHook,
    RenderableGCSystem,
    SchedulerSystem,
];

export const SharedRenderPipes = [
    BlendModePipe,
    BatcherPipe,
    SpritePipe,
    RenderGroupPipe,
    AlphaMaskPipe,
    StencilMaskPipe,
    ColorMaskPipe,
    CustomRenderPipe
];

/**
 * Options for the shared systems of a renderer.
 * @memberof rendering
 */
export interface SharedRendererOptions extends ExtractRendererOptions<typeof SharedSystems>, PixiMixins.RendererOptions
{
    /**
     * Whether to stop PixiJS from dynamically importing default extensions for the renderer.
     * It is false by default, and means PixiJS will load all the default extensions, based
     * on the environment e.g browser/webworker.
     * If you set this to true, then you will need to manually import the systems and extensions you need.
     *
     * e.g.
     * ```js
     * import 'accessibility';
     * import 'app';
     * import 'events';
     * import 'spritesheet';
     * import 'graphics';
     * import 'mesh';
     * import 'text';
     * import 'text-bitmap';
     * import 'text-html';
     * import { autoDetectRenderer } from 'pixi.js';
     *
     * const renderer = await autoDetectRenderer({
     *   width: 800,
     *   height: 600,
     *   skipExtensionImports: true,
     * });
     * ```
     * @default false
     */
    skipExtensionImports?: boolean;
    /**
     * @default true
     * @deprecated since 8.1.6
     * @see `skipExtensionImports`
     */
    manageImports?: boolean;
}
