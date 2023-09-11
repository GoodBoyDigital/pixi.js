import { extensions, ExtensionType } from '../../../extensions/Extensions';
import { GpuBatchAdaptor } from '../../batcher/gpu/GpuBatchAdaptor';
import { GpuGraphicsAdaptor } from '../../graphics/gpu/GpuGraphicsAdaptor';
import { GpuMeshAdapter } from '../../mesh/gpu/GpuMeshAdapter';
import { AbstractRenderer } from '../shared/system/AbstractRenderer';
import { SharedRenderPipes, SharedSystems } from '../shared/system/SharedSystems';
import { RendererType } from '../types';
import { BindGroupSystem } from './BindGroupSystem';
import { BufferSystem } from './buffer/GpuBufferSystem';
import { GpuColorMaskSystem } from './GpuColorMaskSystem';
import { type GPU, GpuDeviceSystem } from './GpuDeviceSystem';
import { GpuEncoderSystem } from './GpuEncoderSystem';
import { GpuStencilSystem } from './GpuStencilSystem';
import { GpuUniformBatchPipe } from './GpuUniformBatchPipe';
import { GpuUniformBufferPipe } from './GpuUniformBufferPipe';
import { PipelineSystem } from './pipeline/PipelineSystem';
import { GpuRenderTargetSystem } from './renderTarget/GpuRenderTargetSystem';
import { GpuShaderSystem } from './shader/GpuShaderSystem';
import { GpuStateSystem } from './state/GpuStateSystem';
import { GpuTextureSystem } from './texture/GpuTextureSystem';

import type { Container } from '../../scene/Container';
import type { IGenerateTextureOptions } from '../shared/GenerateTextureSystem';
import type { PipeConstructor } from '../shared/instructions/RenderPipe';
import type { SystemConstructor } from '../shared/system/System';
import type { ExtractRendererOptions, ExtractSystemTypes } from '../shared/system/utils/typeUtils';
import type { Texture } from '../shared/texture/Texture';

const DefaultWebGPUSystems = [
    ...SharedSystems,
    GpuDeviceSystem,
    BufferSystem,
    GpuTextureSystem,
    GpuRenderTargetSystem,
    GpuEncoderSystem,
    GpuShaderSystem,
    GpuStateSystem,
    PipelineSystem,
    GpuColorMaskSystem,
    GpuStencilSystem,
    BindGroupSystem,
];
const DefaultWebGPUPipes = [...SharedRenderPipes, GpuUniformBatchPipe, GpuUniformBufferPipe];
const DefaultWebGPUAdapters = [GpuBatchAdaptor, GpuMeshAdapter, GpuGraphicsAdaptor];

// installed systems will bbe added to this array by the extensions manager..
const systems: { name: string; value: SystemConstructor }[] = [];
const renderPipes: { name: string; value: PipeConstructor }[] = [];
const renderPipeAdaptors: { name: string; value: any }[] = [];

extensions.handleByNamedList(ExtensionType.WebGPUSystem, systems);
extensions.handleByNamedList(ExtensionType.WebGPUPipes, renderPipes);
extensions.handleByNamedList(ExtensionType.WebGPUPipesAdaptor, renderPipeAdaptors);

// add all the default systems as well as any user defined ones from the extensions
extensions.add(...DefaultWebGPUSystems, ...DefaultWebGPUPipes, ...DefaultWebGPUAdapters);

type WebGPUSystems = ExtractSystemTypes<typeof DefaultWebGPUSystems> &
PixiMixins.RendererSystems &
PixiMixins.WebGPUSystems;

export type WebGPUPipes = ExtractSystemTypes<typeof DefaultWebGPUPipes> &
PixiMixins.RendererPipes &
PixiMixins.WebGPUPipes;

export type WebGPUOptions = ExtractRendererOptions<typeof DefaultWebGPUSystems> &
PixiMixins.RendererOptions &
PixiMixins.WebGPUOptions;

export interface WebGPURenderer extends AbstractRenderer<WebGPUPipes, WebGPUOptions>, WebGPUSystems {}

export class WebGPURenderer extends AbstractRenderer<WebGPUPipes, WebGPUOptions> implements WebGPUSystems
{
    public gpu: GPU;

    constructor()
    {
        const systemConfig = {
            name: 'webgpu',
            type: RendererType.WEBGPU,
            systems,
            renderPipes,
            renderPipeAdaptors,
        };

        super(systemConfig);
    }

    // legacy support, AbstractRenderer provides deprecation warning
    protected _generateTexture(container: Container, options?: IGenerateTextureOptions): Texture
    {
        return this.textureGenerator.generateTexture({
            container,
            region: options?.region,
        });
    }
}
