import { Color } from '../../../../color/Color';
import { DOMAdapter } from '../../../../environment/adapter';
import { Matrix } from '../../../../maths/matrix/Matrix';
import { ImageSource } from '../../../../rendering/renderers/shared/texture/sources/ImageSource';
import { Texture } from '../../../../rendering/renderers/shared/texture/Texture';
import { uid } from '../../../../utils/data/uid';

import type { ColorSource } from '../../../../color/Color';
import type { TextureSpace } from '../FillTypes';

export type GradientType = 'linear' | 'radial';

// export type GradientSource =
//     string // CSS gradient string: 'linear-gradient(...)'
//     | IGradientOptions // Gradient options: { x0, y0, x1, y1, ...}
//     | Gradient; // class Gradient itself

export interface LinearGradientFillStyle
{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    colors: number[];
    stops: number[];
}

export class FillGradient implements CanvasGradient
{
    public static defaultTextureSize = 256;

    /** unique id for this fill gradient */
    public readonly uid: number = uid('fillGradient');
    public readonly type: GradientType = 'linear';

    public x0: number;
    public y0: number;
    public x1: number;
    public y1: number;

    public texture: Texture;
    public transform: Matrix;
    public gradientStops: Array<{ offset: number, color: string }> = [];

    private _styleKey: string | null = null;
    public textureSpace: TextureSpace = 'local';

    constructor(
        x0: number = 0,
        y0: number = 0,
        x1: number = 1,
        y1: number = 0,
        fillUnits: 'global' | 'local' = 'local'
    )
    {
        this.x0 = x0;
        this.y0 = y0;

        this.x1 = x1;
        this.y1 = y1;

        this.textureSpace = fillUnits;
    }

    public addColorStop(offset: number, color: ColorSource): this
    {
        this.gradientStops.push({ offset, color: Color.shared.setValue(color).toHexa() });
        this._styleKey = null;

        return this;
    }

    // TODO move to the system!
    public buildLinearGradient(): void
    {
        if (this.texture) return;

        const defaultSize = FillGradient.defaultTextureSize;

        const { gradientStops } = this;

        const canvas = DOMAdapter.get().createCanvas();

        canvas.width = defaultSize;
        canvas.height = defaultSize;

        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, FillGradient.defaultTextureSize, 1);

        for (let i = 0; i < gradientStops.length; i++)
        {
            const stop = gradientStops[i];

            gradient.addColorStop(stop.offset, stop.color);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, defaultSize, defaultSize);

        this.texture = new Texture({
            source: new ImageSource({
                resource: canvas,
                addressModeU: 'clamp-to-edge',
                addressModeV: 'repeat',
            }),
        });

        // generate some UVS based on the gradient direction sent

        const { x0, y0, x1, y1 } = this;

        const m = new Matrix();

        // get angle
        const dx = x1 - x0;
        const dy = y1 - y0;

        const dist = Math.sqrt((dx * dx) + (dy * dy));

        const angle = Math.atan2(dy, dx);

        // this matrix is inverted when used in the graphics
        m.scale(dist / 256, 1);
        m.rotate(angle);
        m.translate(x0, y0);

        if (this.textureSpace === 'local')
        {
            m.scale(defaultSize, defaultSize);
        }

        this.transform = m;
        this._styleKey = null;
    }

    public get styleKey(): string
    {
        if (this._styleKey)
        {
            return this._styleKey;
        }

        const stops = this.gradientStops.map((stop) => `${stop.offset}-${stop.color}`).join('-');
        const texture = this.texture.uid;
        const transform = this.transform.toArray().join('-');

        return `fill-gradient-${this.uid}-${stops}-${texture}-${transform}-${this.x0}-${this.y0}-${this.x1}-${this.y1}`;
    }
}
