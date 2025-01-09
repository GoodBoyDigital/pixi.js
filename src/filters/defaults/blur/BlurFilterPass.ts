import { TexturePool } from '../../../rendering/renderers/shared/texture/TexturePool';
import { RendererType } from '../../../rendering/renderers/types';
import { Filter } from '../../Filter';
import { generateBlurGlProgram } from './gl/generateBlurGlProgram';
import { generateBlurProgram } from './gpu/generateBlurProgram';

import type { RenderSurface } from '../../../rendering/renderers/shared/renderTarget/RenderTargetSystem';
import type { Texture } from '../../../rendering/renderers/shared/texture/Texture';
import type { FilterSystem } from '../../FilterSystem';
import type { BlurFilterOptions } from './BlurFilter';

/**
 * Options for BlurFilterPass
 * @memberof filters
 */
export interface BlurFilterPassOptions extends BlurFilterOptions
{
    /** Do pass along the x-axis (`true`) or y-axis (`false`). */
    horizontal: boolean;
}

/**
 * The BlurFilterPass applies a horizontal or vertical Gaussian blur to an object.
 * @memberof filters
 */
export class BlurFilterPass extends Filter
{
    /** Default blur filter pass options */
    public static defaultOptions: Partial<BlurFilterPassOptions> = {
        /** The strength of the blur filter. */
        strength: 8,
        /** The quality of the blur filter. */
        quality: 4,
        /** The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15. */
        kernelSize: 5,
    };

    /** Do pass along the x-axis (`true`) or y-axis (`false`). */
    public horizontal: boolean;
    /** The number of passes to run the filter. */
    public passes!: number;
    /** The strength of the blur filter. */
    public strength!: number;

    private _quality: number;
    private readonly _uniforms: any;

    /**
     * @param options
     * @param options.horizontal - Do pass along the x-axis (`true`) or y-axis (`false`).
     * @param options.strength - The strength of the blur filter.
     * @param options.quality - The quality of the blur filter.
     * @param options.kernelSize - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(options: BlurFilterPassOptions)
    {
        options = { ...BlurFilterPass.defaultOptions, ...options };

        const glProgram = generateBlurGlProgram(options.horizontal, options.kernelSize);
        const gpuProgram = generateBlurProgram(options.horizontal, options.kernelSize);

        super({
            glProgram,
            gpuProgram,
            resources: {
                blurUniforms: {
                    uStrength: { value: 0, type: 'f32' },
                }
            },
            ...options
        });

        this.horizontal = options.horizontal;

        this._quality = 0;

        this.quality = options.quality;

        this.blur = options.strength;

        this._uniforms = this.resources.blurUniforms.uniforms;
    }

    /**
     * Applies the filter.
     * @param filterManager - The manager.
     * @param input - The input target.
     * @param output - The output target.
     * @param clearMode - How to clear
     */
    public apply(
        filterManager: FilterSystem,
        input: Texture,
        output: RenderSurface,
        clearMode: boolean
    ): void
    {
        this._uniforms.uStrength = this._calculateInitialStrength();

        if (this.passes === 1)
        {
            filterManager.applyFilter(this, input, output, clearMode);
        }
        else
        {
            const tempTexture = TexturePool.getSameSizeTexture(input);

            let flip = input;
            let flop = tempTexture;

            this._state.blend = false;

            const shouldClear = filterManager.renderer.type === RendererType.WEBGPU;

            for (let i = 0; i < this.passes - 1; i++)
            {
                filterManager.applyFilter(this, flip, flop, i === 0 ? true : shouldClear);

                const temp = flop;

                flop = flip;
                flip = temp;

                this._uniforms.uStrength *= 0.5;
            }

            this._state.blend = true;
            filterManager.applyFilter(this, flip, output, clearMode);
            TexturePool.returnTexture(tempTexture);
        }
    }

    /**
     * Calculates the strength for the initial blur pass, so that the total blur amount of all passes will match the filter's
     * strength.
     * @returns The strength for the initial blur pass.
     */
    private _calculateInitialStrength(): number
    {
        let total = 1;
        let current = 0.5;

        for (let i = 1; i < this.passes; i++)
        {
            total += current;
            current *= 0.5;
        }

        return this.strength / Math.sqrt(total);
    }

    /**
     * Sets the strength of both the blur.
     * @default 16
     */
    get blur(): number
    {
        return this.strength;
    }

    set blur(value: number)
    {
        this.padding = 1 + (Math.abs(value) * 2);
        this.strength = value;
    }

    /**
     * Sets the quality of the blur by modifying the number of passes. More passes means higher
     * quality blurring but the lower the performance.
     * @default 4
     */
    get quality(): number
    {
        return this._quality;
    }

    set quality(value: number)
    {
        this._quality = value;
        this.passes = value;
    }
}
