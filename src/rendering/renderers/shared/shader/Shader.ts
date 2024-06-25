/* eslint-disable no-new */
import EventEmitter from 'eventemitter3';
import { GlProgram } from '../../gl/shader/GlProgram';
import { BindGroup } from '../../gpu/shader/BindGroup';
import { GpuProgram } from '../../gpu/shader/GpuProgram';
import { RendererType } from '../../types';
import { UniformGroup } from './UniformGroup';

import type { GlProgramOptions } from '../../gl/shader/GlProgram';
import type { BindResource } from '../../gpu/shader/BindResource';
import type { GpuProgramOptions } from '../../gpu/shader/GpuProgram';

/**
 * A record of {@link BindGroup}'s used by the shader.
 *
 * `Record<number, BindGroup>`
 * @memberof rendering
 */
export type ShaderGroups = Record<number, BindGroup>;

interface ShaderBase
{
    /** The WebGL program used by the WebGL renderer. */
    glProgram?: GlProgram
    /** The WebGPU program used by the WebGPU renderer. */
    gpuProgram?: GpuProgram
    /**
     * A number that uses two bits on whether the shader is compatible with the WebGL renderer and/or the WebGPU renderer.
     * 0b00 - not compatible with either
     * 0b01 - compatible with WebGL
     * 0b10 - compatible with WebGPU
     * This is automatically set based on if a {@link GlProgram} or {@link GpuProgram} is provided.
     */
    compatibleRenderers?: number
}

export interface GlShaderWith extends ShaderBase
{
    /** The WebGL program used by the WebGL renderer. */
    glProgram: GlProgram
}

export interface GpuShaderWith extends ShaderBase
{
    /** The WebGPU program used by the WebGPU renderer. */
    gpuProgram: GpuProgram
}

export interface ShaderWithGroupsDescriptor
{
    /** A record of {@link BindGroup}'s used by the shader. */
    groups: ShaderGroups;
    /** an optional map of how to bind the groups. This is automatically generated by reading the WebGPU program */
    groupMap?: Record<string, Record<string, any>>;
}

interface ShaderWithResourcesDescriptor
{
    /**
     * A key value of uniform resources used by the shader.
     * Under the hood pixi will look at the provided shaders and figure out where
     * the resources are mapped. Its up to you to make sure the resource key
     * matches the uniform name in the webGPU program. WebGL is a little more forgiving!
     */
    resources?: Record<string, any>;
}

interface GroupsData
{
    group: number
    binding: number
    name: string
}

/**
 * A descriptor for a shader
 * @memberof rendering
 */
export type ShaderWith = GlShaderWith | GpuShaderWith;

/**
 * A descriptor for a shader with groups.
 * @memberof rendering
 */
export type ShaderWithGroups = ShaderWithGroupsDescriptor & ShaderWith;
export interface IShaderWithGroups extends ShaderWithGroupsDescriptor, ShaderBase {}

/**
 * A descriptor for a shader with resources. This is an easier way to work with uniforms.
 * especially when you are not working with bind groups
 * @memberof rendering
 */
export type ShaderWithResources = ShaderWithResourcesDescriptor & ShaderWith;
export interface IShaderWithResources extends ShaderWithResourcesDescriptor, ShaderBase {}

export type ShaderDescriptor = ShaderWithGroups & ShaderWithResources;

type GlShaderFromWith = {
    gpu?: GpuProgramOptions,
    gl: GlProgramOptions
};
type GpuShaderFromWith = {
    gpu: GpuProgramOptions,
    gl?: GlProgramOptions
};
export type ShaderFromGroups = (GlShaderFromWith | GpuShaderFromWith) & Omit<ShaderWithGroups, 'glProgram' | 'gpuProgram'>;
export type ShaderFromResources = (GlShaderFromWith | GpuShaderFromWith)
& Omit<ShaderWithResources, 'glProgram' | 'gpuProgram'>;

/**
 * The Shader class is an integral part of the PixiJS graphics pipeline.
 * Central to rendering in PixiJS are two key elements: A [shader] and a [geometry].
 * The shader incorporates a {@link GlProgram} for WebGL or a {@link GpuProgram} for WebGPU,
 * instructing the respective technology on how to render the geometry.
 *
 * The primary goal of the Shader class is to offer a unified interface compatible with both WebGL and WebGPU.
 * When constructing a shader, you need to provide both a WebGL program and a WebGPU program due to the distinctions
 * between the two rendering engines. If only one is provided, the shader won't function with the omitted renderer.
 *
 * Both WebGL and WebGPU utilize the same resource object when passed into the shader.
 * Post-creation, the shader's interface remains consistent across both WebGL and WebGPU.
 * The sole distinction lies in whether a glProgram or a gpuProgram is employed.
 *
 * Modifying shader uniforms, which can encompass:
 *  - TextureSampler {@link TextureStyle}
 *  - TextureSource {@link TextureSource}
 *  - UniformsGroups {@link UniformGroup}
 * @example
 *
 * const shader = new Shader({
 *     glProgram: glProgram,
 *     gpuProgram: gpuProgram,
 *     resources: {
 *         uTexture: texture.source,
 *         uSampler: texture.sampler,
 *         uColor: [1, 0, 0, 1],
 *     },
 * });
 *
 * // update the uniforms
 * shader.resources.uColor[1] = 1;
 * shader.resources.uTexture = texture2.source;
 * @class
 * @memberof rendering
 */
export class Shader extends EventEmitter<{'destroy': Shader}>
{
    /** An instance of the GPU program used by the WebGPU renderer */
    public gpuProgram: GpuProgram;
    /** An instance of the GL program used by the WebGL renderer */
    public glProgram: GlProgram;
    /**
     * A number that uses two bits on whether the shader is compatible with the WebGL renderer and/or the WebGPU renderer.
     * 0b00 - not compatible with either
     * 0b01 - compatible with WebGL
     * 0b10 - compatible with WebGPU
     * This is automatically set based on if a {@link GlProgram} or {@link GpuProgram} is provided.
     */
    public readonly compatibleRenderers: number;
    /** */
    public groups: Record<number, BindGroup>;
    /** A record of the resources used by the shader. */
    public resources: Record<string, any>;
    /**
     * A record of the uniform groups and resources used by the shader.
     * This is used by WebGL renderer to sync uniform data.
     * @internal
     * @ignore
     */
    public _uniformBindMap: Record<number, Record<number, string>> = Object.create(null);
    private readonly _ownedBindGroups: BindGroup[] = [];

    /**
     * Fired after rendering finishes.
     * @event rendering.Shader#destroy
     */

    /**
     * There are two ways to create a shader.
     * one is to pass in resources which is a record of uniform groups and resources.
     * another is to pass in groups which is a record of {@link BindGroup}s.
     * this second method is really to make use of shared {@link BindGroup}s.
     * For most cases you will want to use resources as they are easier to work with.
     * USe Groups if you want to share {@link BindGroup}s between shaders.
     * you cannot mix and match - either use resources or groups.
     * @param {ShaderWithResourcesDescriptor} options - The options for the shader using ShaderWithResourcesDescriptor.
     */
    constructor(options: ShaderWithResources);
    constructor(options: ShaderWithGroups);
    constructor(options: ShaderDescriptor)
    {
        super();

        /* eslint-disable prefer-const */
        let {
            gpuProgram,
            glProgram,
            groups,
            resources,
            compatibleRenderers,
            groupMap
        } = options;
        /* eslint-enable prefer-const */

        this.gpuProgram = gpuProgram;
        this.glProgram = glProgram;

        if (compatibleRenderers === undefined)
        {
            compatibleRenderers = 0;

            if (gpuProgram)compatibleRenderers |= RendererType.WEBGPU;
            if (glProgram)compatibleRenderers |= RendererType.WEBGL;
        }

        this.compatibleRenderers = compatibleRenderers;

        const nameHash: Record<string, GroupsData> = {};

        if (!resources && !groups)
        {
            resources = {};
        }

        if (resources && groups)
        {
            throw new Error('[Shader] Cannot have both resources and groups');
        }
        else if (!gpuProgram && groups && !groupMap)
        {
            throw new Error('[Shader] No group map or WebGPU shader provided - consider using resources instead.');
        }
        else if (!gpuProgram && groups && groupMap)
        {
            for (const i in groupMap)
            {
                for (const j in groupMap[i])
                {
                    const uniformName = groupMap[i][j];

                    nameHash[uniformName] = {
                        group: i as unknown as number,
                        binding: j as unknown as number,
                        name: uniformName
                    };
                }
            }
        }
        else if (gpuProgram && groups && !groupMap)
        {
            const groupData = gpuProgram.structsAndGroups.groups;

            groupMap = {};

            groupData.forEach((data) =>
            {
                groupMap[data.group] = groupMap[data.group] || {};
                groupMap[data.group][data.binding] = data.name;

                nameHash[data.name] = data;
            });
        }
        else if (resources)
        {
            if (!gpuProgram)
            {
                // build out a dummy bind group..
                groupMap = {};
                groups = {
                    99: new BindGroup(),
                };

                this._ownedBindGroups.push(groups[99]);

                let bindTick = 0;

                for (const i in resources)
                {
                    // Yes i know this is a little strange, but will line up the shaders neatly
                    // basically we want to be driven by how webGPU does things.
                    // so making a fake group will work and not affect gpu as it means no gpu shader was provided..
                    nameHash[i] = { group: 99, binding: bindTick, name: i };

                    groupMap[99] = groupMap[99] || {};
                    groupMap[99][bindTick] = i;

                    bindTick++;
                }
            }
            else
            {
                const groupData = gpuProgram.structsAndGroups.groups;

                groupMap = {};

                groupData.forEach((data) =>
                {
                    groupMap[data.group] = groupMap[data.group] || {};
                    groupMap[data.group][data.binding] = data.name;

                    nameHash[data.name] = data;
                });
            }

            groups = {};

            for (const i in resources)
            {
                const name = i;
                let value = resources[i];

                if (!(value.source) && !(value as BindResource)._resourceType)
                {
                    value = new UniformGroup(value);
                }

                const data = nameHash[name];

                if (data)
                {
                    if (!groups[data.group])
                    {
                        groups[data.group] = new BindGroup();

                        this._ownedBindGroups.push(groups[data.group]);
                    }

                    groups[data.group].setResource(value, data.binding);
                }
            }
        }

        this.groups = groups;
        this._uniformBindMap = groupMap;

        this.resources = this._buildResourceAccessor(groups, nameHash);
    }

    /**
     * Sometimes a resource group will be provided later (for example global uniforms)
     * In such cases, this method can be used to let the shader know about the group.
     * @param name - the name of the resource group
     * @param groupIndex - the index of the group (should match the webGPU shader group location)
     * @param bindIndex - the index of the bind point (should match the webGPU shader bind point)
     */
    public addResource(name: string, groupIndex: number, bindIndex: number): void
    {
        this._uniformBindMap[groupIndex] ||= {};

        this._uniformBindMap[groupIndex][bindIndex] ||= name;

        if (!this.groups[groupIndex])
        {
            this.groups[groupIndex] = new BindGroup();
            this._ownedBindGroups.push(this.groups[groupIndex]);
        }
    }

    private _buildResourceAccessor(groups: ShaderGroups, nameHash: Record<string, GroupsData>)
    {
        const uniformsOut = {};

        for (const i in nameHash)
        {
            const data = nameHash[i];

            // add getter setter for uniforms
            Object.defineProperty(uniformsOut, data.name, {
                get()
                {
                    return groups[data.group].getResource(data.binding);
                },
                set(value)
                {
                    groups[data.group].setResource(value, data.binding);
                }
            });
        }

        return uniformsOut;
    }

    /**
     * Use to destroy the shader when its not longer needed.
     * It will destroy the resources and remove listeners.
     * @param destroyPrograms - if the programs should be destroyed as well.
     * Make sure its not being used by other shaders!
     */
    public destroy(destroyPrograms = false): void
    {
        this.emit('destroy', this);

        if (destroyPrograms)
        {
            this.gpuProgram?.destroy();
            this.glProgram?.destroy();
        }

        this.gpuProgram = null;
        this.glProgram = null;

        this.removeAllListeners();

        this._uniformBindMap = null;

        this._ownedBindGroups.forEach((bindGroup) =>
        {
            bindGroup.destroy();
        });

        (this._ownedBindGroups as null) = null;

        this.resources = null;
        this.groups = null;
    }

    /**
     * A short hand function to create a shader based of a vertex and fragment shader.
     * @param options
     * @returns A shiny new PixiJS shader!
     */
    public static from(options: ShaderFromGroups): Shader;
    public static from(options: ShaderFromResources): Shader;
    public static from(options: ShaderFromGroups & ShaderFromResources): Shader
    {
        const { gpu, gl, ...rest } = options;

        let gpuProgram: GpuProgram;
        let glProgram: GlProgram;

        if (gpu)
        {
            gpuProgram = GpuProgram.from(gpu);
        }

        if (gl)
        {
            glProgram = GlProgram.from(gl);
        }

        return new Shader({
            gpuProgram,
            glProgram,
            ...rest
        });
    }
}
