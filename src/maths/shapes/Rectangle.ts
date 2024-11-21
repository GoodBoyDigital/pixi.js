// import { SHAPES } from '../const';
import { Point } from '../point/Point';

import type { Bounds } from '../../scene/container/bounds/Bounds';
import type { Matrix } from '../matrix/Matrix';
import type { SHAPE_PRIMITIVE } from '../misc/const';
import type { ShapePrimitive } from './ShapePrimitive';

const tempPoints = [new Point(), new Point(), new Point(), new Point()];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Rectangle extends PixiMixins.Rectangle { }

/**
 * The `Rectangle` object is an area defined by its position, as indicated by its top-left corner
 * point (`x`, `y`) and by its `width` and its `height`.
 *
 * It also provides convenience methods to get and set the position and size of the rectangle such as
 * {@link maths.Rectangle#bottom|bottom}, {@link maths.Rectangle#right|right} and {@link maths.Rectangle#isEmpty|isEmpty}.
 * @memberof maths
 */
export class Rectangle implements ShapePrimitive
{
    /**
     * The type of the object, mainly used to avoid `instanceof` checks
     * @default 'rectangle'
     */
    public readonly type: SHAPE_PRIMITIVE = 'rectangle';

    /**
     * The X coordinate of the upper-left corner of the rectangle
     * @default 0
     */
    public x: number;

    /**
     * The Y coordinate of the upper-left corner of the rectangle
     * @default 0
     */
    public y: number;

    /**
     * The overall width of this rectangle
     *  @default 0
     */
    public width: number;

    /**
     * The overall height of this rectangle
     * @default 0
     */
    public height: number;

    /**
     * @param x - The X coordinate of the upper-left corner of the rectangle
     * @param y - The Y coordinate of the upper-left corner of the rectangle
     * @param width - The overall width of the rectangle
     * @param height - The overall height of the rectangle
     */
    constructor(x: string | number = 0, y: string | number = 0, width: string | number = 0, height: string | number = 0)
    {
        this.x = Number(x);
        this.y = Number(y);
        this.width = Number(width);
        this.height = Number(height);
    }

    /** Returns the left edge of the rectangle. */
    get left(): number
    {
        return this.x;
    }

    /** Returns the right edge of the rectangle. */
    get right(): number
    {
        return this.x + this.width;
    }

    /** Returns the top edge of the rectangle. */
    get top(): number
    {
        return this.y;
    }

    /** Returns the bottom edge of the rectangle. */
    get bottom(): number
    {
        return this.y + this.height;
    }

    /** Determines whether the Rectangle is empty. */
    public isEmpty(): boolean
    {
        return this.left === this.right || this.top === this.bottom;
    }

    /** A constant empty rectangle. This is a new object every time the property is accessed */
    static get EMPTY(): Rectangle
    {
        return new Rectangle(0, 0, 0, 0);
    }

    /**
     * Creates a clone of this Rectangle
     * @returns a copy of the rectangle
     */
    public clone(): Rectangle
    {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    /**
     * Converts a Bounds object to a Rectangle object.
     * @param bounds - The bounds to copy and convert to a rectangle.
     * @returns Returns itself.
     */
    public copyFromBounds(bounds: Bounds): this
    {
        this.x = bounds.minX;
        this.y = bounds.minY;
        this.width = bounds.maxX - bounds.minX;
        this.height = bounds.maxY - bounds.minY;

        return this;
    }

    /**
     * Copies another rectangle to this one.
     * @param rectangle - The rectangle to copy from.
     * @returns Returns itself.
     */
    public copyFrom(rectangle: Rectangle): Rectangle
    {
        this.x = rectangle.x;
        this.y = rectangle.y;
        this.width = rectangle.width;
        this.height = rectangle.height;

        return this;
    }

    /**
     * Copies this rectangle to another one.
     * @param rectangle - The rectangle to copy to.
     * @returns Returns given parameter.
     */
    public copyTo(rectangle: Rectangle): Rectangle
    {
        rectangle.copyFrom(this);

        return rectangle;
    }

    /**
     * Checks whether the x and y coordinates given are contained within this Rectangle
     * @param x - The X coordinate of the point to test
     * @param y - The Y coordinate of the point to test
     * @returns Whether the x/y coordinates are within this Rectangle
     */
    public contains(x: number, y: number): boolean
    {
        if (this.width <= 0 || this.height <= 0)
        {
            return false;
        }

        if (x >= this.x && x < this.x + this.width)
        {
            if (y >= this.y && y < this.y + this.height)
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks whether the x and y coordinates given are contained within this rectangle including the stroke.
     * @param x - The X coordinate of the point to test
     * @param y - The Y coordinate of the point to test
     * @param strokeWidth - The width of the line to check
     * @returns Whether the x/y coordinates are within this rectangle
     */
    public strokeContains(x: number, y: number, strokeWidth: number): boolean
    {
        const { width, height } = this;

        if (width <= 0 || height <= 0) return false;

        const _x = this.x;
        const _y = this.y;

        const outerLeft = _x - (strokeWidth / 2);
        const outerRight = _x + width + (strokeWidth / 2);
        const outerTop = _y - (strokeWidth / 2);
        const outerBottom = _y + height + (strokeWidth / 2);
        const innerLeft = _x + (strokeWidth / 2);
        const innerRight = _x + width - (strokeWidth / 2);
        const innerTop = _y + (strokeWidth / 2);
        const innerBottom = _y + height - (strokeWidth / 2);

        return (x >= outerLeft && x <= outerRight && y >= outerTop && y <= outerBottom)
        && !(x > innerLeft && x < innerRight && y > innerTop && y < innerBottom);
    }
    /**
     * Determines whether the `other` Rectangle transformed by `transform` intersects with `this` Rectangle object.
     * Returns true only if the area of the intersection is >0, this means that Rectangles
     * sharing a side are not overlapping. Another side effect is that an arealess rectangle
     * (width or height equal to zero) can't intersect any other rectangle.
     * @param {Rectangle} other - The Rectangle to intersect with `this`.
     * @param {Matrix} transform - The transformation matrix of `other`.
     * @returns {boolean} A value of `true` if the transformed `other` Rectangle intersects with `this`; otherwise `false`.
     */
    public intersects(other: Rectangle, transform?: Matrix): boolean
    {
        if (!transform)
        {
            const x0 = this.x < other.x ? other.x : this.x;
            const x1 = this.right > other.right ? other.right : this.right;

            if (x1 <= x0)
            {
                return false;
            }

            const y0 = this.y < other.y ? other.y : this.y;
            const y1 = this.bottom > other.bottom ? other.bottom : this.bottom;

            return y1 > y0;
        }

        const x0 = this.left;
        const x1 = this.right;
        const y0 = this.top;
        const y1 = this.bottom;

        if (x1 <= x0 || y1 <= y0)
        {
            return false;
        }

        const lt = tempPoints[0].set(other.left, other.top);
        const lb = tempPoints[1].set(other.left, other.bottom);
        const rt = tempPoints[2].set(other.right, other.top);
        const rb = tempPoints[3].set(other.right, other.bottom);

        if (rt.x <= lt.x || lb.y <= lt.y)
        {
            return false;
        }

        const s = Math.sign((transform.a * transform.d) - (transform.b * transform.c));

        if (s === 0)
        {
            return false;
        }

        transform.apply(lt, lt);
        transform.apply(lb, lb);
        transform.apply(rt, rt);
        transform.apply(rb, rb);

        if (Math.max(lt.x, lb.x, rt.x, rb.x) <= x0
            || Math.min(lt.x, lb.x, rt.x, rb.x) >= x1
            || Math.max(lt.y, lb.y, rt.y, rb.y) <= y0
            || Math.min(lt.y, lb.y, rt.y, rb.y) >= y1)
        {
            return false;
        }

        const nx = s * (lb.y - lt.y);
        const ny = s * (lt.x - lb.x);
        const n00 = (nx * x0) + (ny * y0);
        const n10 = (nx * x1) + (ny * y0);
        const n01 = (nx * x0) + (ny * y1);
        const n11 = (nx * x1) + (ny * y1);

        if (Math.max(n00, n10, n01, n11) <= (nx * lt.x) + (ny * lt.y)
            || Math.min(n00, n10, n01, n11) >= (nx * rb.x) + (ny * rb.y))
        {
            return false;
        }

        const mx = s * (lt.y - rt.y);
        const my = s * (rt.x - lt.x);
        const m00 = (mx * x0) + (my * y0);
        const m10 = (mx * x1) + (my * y0);
        const m01 = (mx * x0) + (my * y1);
        const m11 = (mx * x1) + (my * y1);

        if (Math.max(m00, m10, m01, m11) <= (mx * lt.x) + (my * lt.y)
            || Math.min(m00, m10, m01, m11) >= (mx * rb.x) + (my * rb.y))
        {
            return false;
        }

        return true;
    }

    /**
     * Pads the rectangle making it grow in all directions.
     * If paddingY is omitted, both paddingX and paddingY will be set to paddingX.
     * @param paddingX - The horizontal padding amount.
     * @param paddingY - The vertical padding amount.
     * @returns Returns itself.
     */
    public pad(paddingX = 0, paddingY = paddingX): this
    {
        this.x -= paddingX;
        this.y -= paddingY;

        this.width += paddingX * 2;
        this.height += paddingY * 2;

        return this;
    }

    /**
     * Fits this rectangle around the passed one.
     * @param rectangle - The rectangle to fit.
     * @returns Returns itself.
     */
    public fit(rectangle: Rectangle): this
    {
        const x1 = Math.max(this.x, rectangle.x);
        const x2 = Math.min(this.x + this.width, rectangle.x + rectangle.width);
        const y1 = Math.max(this.y, rectangle.y);
        const y2 = Math.min(this.y + this.height, rectangle.y + rectangle.height);

        this.x = x1;
        this.width = Math.max(x2 - x1, 0);
        this.y = y1;
        this.height = Math.max(y2 - y1, 0);

        return this;
    }

    /**
     * Enlarges rectangle that way its corners lie on grid
     * @param resolution - resolution
     * @param eps - precision
     * @returns Returns itself.
     */
    public ceil(resolution = 1, eps = 0.001): this
    {
        const x2 = Math.ceil((this.x + this.width - eps) * resolution) / resolution;
        const y2 = Math.ceil((this.y + this.height - eps) * resolution) / resolution;

        this.x = Math.floor((this.x + eps) * resolution) / resolution;
        this.y = Math.floor((this.y + eps) * resolution) / resolution;

        this.width = x2 - this.x;
        this.height = y2 - this.y;

        return this;
    }

    /**
     * Enlarges this rectangle to include the passed rectangle.
     * @param rectangle - The rectangle to include.
     * @returns Returns itself.
     */
    public enlarge(rectangle: Rectangle): this
    {
        const x1 = Math.min(this.x, rectangle.x);
        const x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width);
        const y1 = Math.min(this.y, rectangle.y);
        const y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height);

        this.x = x1;
        this.width = x2 - x1;
        this.y = y1;
        this.height = y2 - y1;

        return this;
    }

    /**
     * Returns the framing rectangle of the rectangle as a Rectangle object
     * @param out - optional rectangle to store the result
     * @returns The framing rectangle
     */
    public getBounds(out?: Rectangle): Rectangle
    {
        out = out || new Rectangle();
        out.copyFrom(this);

        return out;
    }

    /**
     * Checks if this rectangle fully contains another rectangle.
     *
     * A rectangle contains another rectangle if all four corners of the other rectangle
     * lie within the bounds of this rectangle.
     *
     * ```ts
     * const container = new Rectangle(0, 0, 100, 100);
     * const inside = new Rectangle(25, 25, 50, 50);
     * const partial = new Rectangle(75, 75, 50, 50);
     *
     * container.containsRect(inside); // Returns true
     * container.containsRect(partial); // Returns false - partial overlap
     * ```
     *
     * Note: If either rectangle has a width or height of 0, this method returns false
     * since a zero-area rectangle cannot meaningfully contain another rectangle.
     * @param other - The rectangle to check if it is contained within this one
     * @returns True if the other rectangle is fully contained within this one
     */
    public containsRect(other: Rectangle): boolean
    {
        if (this.width <= 0 || this.height <= 0) return false;

        const x1 = other.x;
        const y1 = other.y;
        const x2 = other.x + other.width;
        const y2 = other.y + other.height;

        return x1 >= this.x && x1 < this.x + this.width
            && y1 >= this.y && y1 < this.y + this.height
            && x2 >= this.x && x2 < this.x + this.width
            && y2 >= this.y && y2 < this.y + this.height;
    }

    // #if _DEBUG
    public toString(): string
    {
        return `[pixi.js/math:Rectangle x=${this.x} y=${this.y} width=${this.width} height=${this.height}]`;
    }
    // #endif
}
