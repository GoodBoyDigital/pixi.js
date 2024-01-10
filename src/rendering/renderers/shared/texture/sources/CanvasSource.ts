import { DOMAdapter } from '../../../../../environment/adapter';
import { ExtensionType } from '../../../../../extensions/Extensions';
import { TextureSource } from './TextureSource';

import type { ICanvas } from '../../../../../environment/canvas/ICanvas';
import type { ExtensionMetadata } from '../../../../../extensions/Extensions';
import type { TextureSourceOptions } from './TextureSource';

export interface CanvasSourceOptions extends TextureSourceOptions<ICanvas>
{
    /** should the canvas be resized to preserve its screen width and height regardless of the resolution of the renderer */
    autoDensity?: boolean;
    /** if true, this canvas will be set up to be transparent where possible */
    transparent?: boolean;
}

export class CanvasSource extends TextureSource<ICanvas>
{
    public static extension: ExtensionMetadata = ExtensionType.TextureSource;

    public uploadMethodId = 'image';
    public autoDensity: boolean;
    public transparent: boolean;

    constructor(options: CanvasSourceOptions)
    {
        if (!options.resource)
        {
            options.resource = DOMAdapter.get().createCanvas();
        }

        if (!options.width)
        {
            options.width = options.resource.width;

            if (!options.autoDensity)
            {
                options.width /= options.resolution;
            }
        }

        if (!options.height)
        {
            options.height = options.resource.height;

            if (!options.autoDensity)
            {
                options.height /= options.resolution;
            }
        }

        super(options);

        this.autoDensity = options.autoDensity;

        const canvas = options.resource;

        if (this.pixelWidth !== canvas.width || this.pixelWidth !== canvas.height)
        {
            this.resizeCanvas();
        }

        this.transparent = !!options.transparent;
    }

    public resizeCanvas()
    {
        if (this.autoDensity)
        {
            this.resource.style.width = `${this.width}px`;
            this.resource.style.height = `${this.height}px`;
        }

        this.resource.width = this.pixelWidth;
        this.resource.height = this.pixelHeight;
    }

    public resize(width = this.width, height = this.height, resolution = this._resolution): void
    {
        super.resize(width, height, resolution);

        this.resizeCanvas();
    }

    public static test(resource: any): resource is ICanvas
    {
        return (globalThis.HTMLCanvasElement && resource instanceof HTMLCanvasElement)
        || (globalThis.OffscreenCanvas && resource instanceof OffscreenCanvas);
    }
}
