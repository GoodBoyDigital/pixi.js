/* eslint-disable max-len */
import EventEmitter from 'eventemitter3';
import { Color, type ColorSource } from '../../../color/Color';
import { Matrix } from '../../../maths/matrix/Matrix';
import { Point } from '../../../maths/point/Point';
import { Texture } from '../../../rendering/renderers/shared/texture/Texture';
import { uid } from '../../../utils/data/uid';
import { deprecation, v8_0_0 } from '../../../utils/logging/deprecation';
import { Bounds } from '../../container/bounds/Bounds';
import { GraphicsPath } from './path/GraphicsPath';
import { SVGParser } from './svg/SVGParser';
import { toFillStyle, toStrokeStyle } from './utils/convertFillInputToFillStyle';

import type { PointData } from '../../../maths/point/PointData';
import type { Shader } from '../../../rendering/renderers/shared/shader/Shader';
import type { TextureDestroyOptions, TypeOrBool } from '../../container/destroyTypes';
import type { ConvertedFillStyle, ConvertedStrokeStyle, FillInput, StrokeInput } from './FillTypes';
import type { RoundedPoint } from './path/roundShape';

const tmpPoint = new Point();

export type BatchMode = 'auto' | 'batch' | 'no-batch';

export interface FillInstruction
{
    action: 'fill' | 'cut'
    data: { style: ConvertedFillStyle, path: GraphicsPath, hole?: GraphicsPath }
}

export interface StrokeInstruction
{
    action: 'stroke'
    data: { style: ConvertedStrokeStyle, path: GraphicsPath, hole?: GraphicsPath }
}

export interface TextureInstruction
{
    action: 'texture'
    data: {
        image: Texture,

        dx: number
        dy: number

        dw: number
        dh: number

        transform: Matrix
        alpha: number
        style: number,
    }
}

export type GraphicsInstructions = FillInstruction | StrokeInstruction | TextureInstruction;

const tempMatrix = new Matrix();

/**
 * The GraphicsContext class allows for the creation of lightweight objects that contain instructions for drawing shapes and paths.
 * It is used internally by the Graphics class to draw shapes and paths, and can be used directly and shared between Graphics objects,
 *
 * This sharing of a `GraphicsContext` means that the intensive task of converting graphics instructions into GPU-ready geometry is done once, and the results are reused,
 * much like sprites reusing textures.
 * @memberof scene
 */
export class GraphicsContext extends EventEmitter<{
    update: GraphicsContext
    destroy: GraphicsContext
}>
{
    /** The default fill style to use when none is provided. */
    public static defaultFillStyle: ConvertedFillStyle = {
        /** The color to use for the fill. */
        color: 0xffffff,
        /** The alpha value to use for the fill. */
        alpha: 1,
        /** The texture to use for the fill. */
        texture: Texture.WHITE,
        /** The matrix to apply. */
        matrix: null,
        /** The fill pattern to use. */
        fill: null,
    };

    /** The default stroke style to use when none is provided. */
    public static defaultStrokeStyle: ConvertedStrokeStyle = {
        /** The width of the stroke. */
        width: 1,
        /** The color to use for the stroke. */
        color: 0xffffff,
        /** The alpha value to use for the stroke. */
        alpha: 1,
        /** The alignment of the stroke. */
        alignment: 0.5,
        /** The miter limit to use. */
        miterLimit: 10,
        /** The line cap style to use. */
        cap: 'butt',
        /** The line join style to use. */
        join: 'miter',
        /** The texture to use for the fill. */
        texture: Texture.WHITE,
        /** The matrix to apply. */
        matrix: null,
        /** The fill pattern to use. */
        fill: null,
        /** If the stroke is a pixel line. */
        pixelLine: false,
    };

    /** unique id for this graphics context */
    public readonly uid: number = uid('graphicsContext');
    public dirty = true;
    public batchMode: BatchMode = 'auto';
    public instructions: GraphicsInstructions[] = [];
    public customShader?: Shader;

    private _activePath: GraphicsPath = new GraphicsPath();
    private _transform: Matrix = new Matrix();

    private _fillStyle: ConvertedFillStyle = { ...GraphicsContext.defaultFillStyle };
    private _strokeStyle: ConvertedStrokeStyle = { ...GraphicsContext.defaultStrokeStyle };
    private _stateStack: { fillStyle: ConvertedFillStyle; strokeStyle: ConvertedStrokeStyle, transform: Matrix }[] = [];

    private _tick = 0;

    private _bounds = new Bounds();
    private _boundsDirty = true;

    /**
     * Creates a new GraphicsContext object that is a clone of this instance, copying all properties,
     * including the current drawing state, transformations, styles, and instructions.
     * @returns A new GraphicsContext instance with the same properties and state as this one.
     */
    public clone(): GraphicsContext
    {
        const clone = new GraphicsContext();

        clone.batchMode = this.batchMode;
        clone.instructions = this.instructions.slice();
        clone._activePath = this._activePath.clone();
        clone._transform = this._transform.clone();
        clone._fillStyle = { ...this._fillStyle };
        clone._strokeStyle = { ...this._strokeStyle };
        clone._stateStack = this._stateStack.slice();
        clone._bounds = this._bounds.clone();
        clone._boundsDirty = true;

        return clone;
    }

    /**
     * The current fill style of the graphics context. This can be a color, gradient, pattern, or a more complex style defined by a FillStyle object.
     */
    get fillStyle(): ConvertedFillStyle
    {
        return this._fillStyle;
    }

    set fillStyle(value: FillInput)
    {
        this._fillStyle = toFillStyle(value, GraphicsContext.defaultFillStyle);
    }

    /**
     * The current stroke style of the graphics context. Similar to fill styles, stroke styles can encompass colors, gradients, patterns, or more detailed configurations via a StrokeStyle object.
     */
    get strokeStyle(): ConvertedStrokeStyle
    {
        return this._strokeStyle;
    }

    set strokeStyle(value: FillInput)
    {
        this._strokeStyle = toStrokeStyle(value, GraphicsContext.defaultStrokeStyle);
    }

    /**
     * Sets the current fill style of the graphics context. The fill style can be a color, gradient,
     * pattern, or a more complex style defined by a FillStyle object.
     * @param style - The fill style to apply. This can be a simple color, a gradient or pattern object,
     *                or a FillStyle or ConvertedFillStyle object.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public setFillStyle(style: FillInput): this
    {
        this._fillStyle = toFillStyle(style, GraphicsContext.defaultFillStyle);

        return this;
    }

    /**
     * Sets the current stroke style of the graphics context. Similar to fill styles, stroke styles can
     * encompass colors, gradients, patterns, or more detailed configurations via a StrokeStyle object.
     * @param style - The stroke style to apply. Can be defined as a color, a gradient or pattern,
     *                or a StrokeStyle or ConvertedStrokeStyle object.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public setStrokeStyle(style: StrokeInput): this
    {
        this._strokeStyle = toFillStyle(style, GraphicsContext.defaultStrokeStyle) as ConvertedStrokeStyle;

        return this;
    }

    /**
     * Adds a texture to the graphics context. This method supports multiple overloads for specifying the texture, tint, and dimensions.
     * If only a texture is provided, it uses the texture's width and height for drawing. Additional parameters allow for specifying
     * a tint color, and custom dimensions for the texture drawing area.
     * @param texture - The Texture object to use.
     * @param tint - (Optional) A ColorSource to tint the texture. If not provided, defaults to white (0xFFFFFF).
     * @param dx - (Optional) The x-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dy - (Optional) The y-coordinate in the destination canvas at which to place the top-left corner of the source image.
     * @param dw - (Optional) The width of the rectangle within the source image to draw onto the destination canvas. If not provided, uses the texture's frame width.
     * @param dh - (Optional) The height of the rectangle within the source image to draw onto the destination canvas. If not provided, uses the texture's frame height.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public texture(texture: Texture): this;
    public texture(texture: Texture, tint: ColorSource): this;
    public texture(texture: Texture, tint: ColorSource, dx: number, dy: number): this;
    public texture(texture: Texture, tint: ColorSource, dx: number, dy: number, dw: number, dh: number): this;
    public texture(texture: Texture, tint?: ColorSource, dx?: number, dy?: number, dw?: number, dh?: number): this
    {
        this.instructions.push({
            action: 'texture',
            data: {
                image: texture,

                dx: dx || 0,
                dy: dy || 0,

                dw: dw || texture.frame.width,
                dh: dh || texture.frame.height,

                transform: this._transform.clone(),
                alpha: this._fillStyle.alpha,
                style: tint ? Color.shared.setValue(tint).toNumber() : 0xFFFFFF,
            }
        });

        this.onUpdate();

        return this;
    }

    /**
     * Resets the current path. Any previous path and its commands are discarded and a new path is
     * started. This is typically called before beginning a new shape or series of drawing commands.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public beginPath(): this
    {
        this._activePath = new GraphicsPath();

        return this;
    }

    /**
     * Fills the current or given path with the current fill style. This method can optionally take
     * a color and alpha for a simple fill, or a more complex FillInput object for advanced fills.
     * @param style - (Optional) The style to fill the path with. Can be a color, gradient, pattern, or a complex style object. If omitted, uses the current fill style.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public fill(style?: FillInput): this;
    /** @deprecated 8.0.0 */
    public fill(color: ColorSource, alpha: number): this;
    public fill(style?: FillInput, alpha?: number): this
    {
        let path: GraphicsPath;

        const lastInstruction = this.instructions[this.instructions.length - 1];

        if (this._tick === 0 && lastInstruction && lastInstruction.action === 'stroke')
        {
            path = lastInstruction.data.path;
        }
        else
        {
            path = this._activePath.clone();
        }

        if (!path) return this;

        // eslint-disable-next-line no-eq-null, eqeqeq
        if (style != null)
        {
            if (alpha !== undefined && typeof style === 'number')
            {
                // #if _DEBUG
                deprecation(v8_0_0, 'GraphicsContext.fill(color, alpha) is deprecated, use GraphicsContext.fill({ color, alpha }) instead');
                // #endif

                style = { color: style, alpha };
            }
            this._fillStyle = toFillStyle(style, GraphicsContext.defaultFillStyle);
        }

        // TODO not a fan of the clone!!
        this.instructions.push({
            action: 'fill',
            // TODO copy fill style!
            data: { style: this.fillStyle, path }
        });

        this.onUpdate();

        this._initNextPathLocation();
        this._tick = 0;

        return this;
    }

    private _initNextPathLocation()
    {
        // Reset the _activePath with the last point of the current path
        const { x, y } = this._activePath.getLastPoint(Point.shared);

        this._activePath.clear();
        this._activePath.moveTo(x, y);
    }

    /**
     * Strokes the current path with the current stroke style. This method can take an optional
     * FillInput parameter to define the stroke's appearance, including its color, width, and other properties.
     * @param style - (Optional) The stroke style to apply. Can be defined as a simple color or a more complex style object. If omitted, uses the current stroke style.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public stroke(style?: StrokeInput): this
    {
        let path: GraphicsPath;

        const lastInstruction = this.instructions[this.instructions.length - 1];

        if (this._tick === 0 && lastInstruction && lastInstruction.action === 'fill')
        {
            path = lastInstruction.data.path;
        }
        else
        {
            path = this._activePath.clone();
        }

        if (!path) return this;

        // eslint-disable-next-line no-eq-null, eqeqeq
        if (style != null)
        {
            this._strokeStyle = toStrokeStyle(style, GraphicsContext.defaultStrokeStyle);
        }

        // TODO not a fan of the clone!!
        this.instructions.push({
            action: 'stroke',
            // TODO copy fill style!
            data: { style: this.strokeStyle, path }
        });

        this.onUpdate();

        this._initNextPathLocation();
        this._tick = 0;

        return this;
    }

    /**
     * Applies a cutout to the last drawn shape. This is used to create holes or complex shapes by
     * subtracting a path from the previously drawn path. If a hole is not completely in a shape, it will
     * fail to cut correctly!
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public cut(): this
    {
        for (let i = 0; i < this.instructions.length; i++)
        {
            const instruction = this.instructions[i];

            const holePath = this._activePath.clone();

            // make sure the hole is inside the shape
            const data = instruction.data as FillInstruction['data'];
            const path = data.path;

            const shapes = path.shapePath.shapePrimitives;
            const [x, y] = (holePath.shapePath.shapePrimitives[0].shape as any).points;

            let inside = false;

            shapes.forEach((shapePrimitive) =>
            {
                if (shapePrimitive.shape.contains(x, y))
                {
                    inside = true;
                }
            });

            if (instruction && inside)
            {
                if (instruction.action === 'stroke' || instruction.action === 'fill')
                {
                    if (instruction.data.hole)
                    {
                        instruction.data.hole.addPath(holePath);
                    }
                    else
                    {
                        instruction.data.hole = holePath;
                        break;
                    }
                }
            }
        }

        this._initNextPathLocation();

        return this;
    }

    /**
     * Adds an arc to the current path, which is centered at (x, y) with the specified radius,
     * starting and ending angles, and direction.
     * @param x - The x-coordinate of the arc's center.
     * @param y - The y-coordinate of the arc's center.
     * @param radius - The arc's radius.
     * @param startAngle - The starting angle, in radians.
     * @param endAngle - The ending angle, in radians.
     * @param counterclockwise - (Optional) Specifies whether the arc is drawn counterclockwise (true) or clockwise (false). Defaults to false.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this
    {
        this._tick++;

        const t = this._transform;

        this._activePath.arc(
            (t.a * x) + (t.c * y) + t.tx,
            (t.b * x) + (t.d * y) + t.ty,
            radius,
            startAngle,
            endAngle,
            counterclockwise,
        );

        return this;
    }

    /**
     * Adds an arc to the current path with the given control points and radius, connected to the previous point
     * by a straight line if necessary.
     * @param x1 - The x-coordinate of the first control point.
     * @param y1 - The y-coordinate of the first control point.
     * @param x2 - The x-coordinate of the second control point.
     * @param y2 - The y-coordinate of the second control point.
     * @param radius - The arc's radius.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): this
    {
        this._tick++;

        const t = this._transform;

        this._activePath.arcTo(
            (t.a * x1) + (t.c * y1) + t.tx,
            (t.b * x1) + (t.d * y1) + t.ty,
            (t.a * x2) + (t.c * y2) + t.tx,
            (t.b * x2) + (t.d * y2) + t.ty,
            radius,
        );

        return this;
    }

    /**
     * Adds an SVG-style arc to the path, allowing for elliptical arcs based on the SVG spec.
     * @param rx - The x-radius of the ellipse.
     * @param ry - The y-radius of the ellipse.
     * @param xAxisRotation - The rotation of the ellipse's x-axis relative
     * to the x-axis of the coordinate system, in degrees.
     * @param largeArcFlag - Determines if the arc should be greater than or less than 180 degrees.
     * @param sweepFlag - Determines if the arc should be swept in a positive angle direction.
     * @param x - The x-coordinate of the arc's end point.
     * @param y - The y-coordinate of the arc's end point.
     * @returns The instance of the current object for chaining.
     */
    public arcToSvg(
        rx: number, ry: number,
        xAxisRotation: number,
        largeArcFlag: number,
        sweepFlag: number,
        x: number, y: number
    ): this
    {
        this._tick++;

        const t = this._transform;

        this._activePath.arcToSvg(
            rx, ry,
            xAxisRotation, // should we rotate this with transform??
            largeArcFlag,
            sweepFlag,
            (t.a * x) + (t.c * y) + t.tx,
            (t.b * x) + (t.d * y) + t.ty,
        );

        return this;
    }

    /**
     * Adds a cubic Bezier curve to the path.
     * It requires three points: the first two are control points and the third one is the end point.
     * The starting point is the last point in the current path.
     * @param cp1x - The x-coordinate of the first control point.
     * @param cp1y - The y-coordinate of the first control point.
     * @param cp2x - The x-coordinate of the second control point.
     * @param cp2y - The y-coordinate of the second control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number, smoothness?: number): this
    {
        this._tick++;

        // TODO optimize for no transform
        const t = this._transform;

        this._activePath.bezierCurveTo(
            (t.a * cp1x) + (t.c * cp1y) + t.tx,
            (t.b * cp1x) + (t.d * cp1y) + t.ty,
            (t.a * cp2x) + (t.c * cp2y) + t.tx,
            (t.b * cp2x) + (t.d * cp2y) + t.ty,
            (t.a * x) + (t.c * y) + t.tx,
            (t.b * x) + (t.d * y) + t.ty,
            smoothness,
        );

        return this;
    }

    /**
     * Closes the current path by drawing a straight line back to the start.
     * If the shape is already closed or there are no points in the path, this method does nothing.
     * @returns The instance of the current object for chaining.
     */
    public closePath(): this
    {
        this._tick++;

        this._activePath?.closePath();

        return this;
    }

    /**
     * Draws an ellipse at the specified location and with the given x and y radii.
     * An optional transformation can be applied, allowing for rotation, scaling, and translation.
     * @param x - The x-coordinate of the center of the ellipse.
     * @param y - The y-coordinate of the center of the ellipse.
     * @param radiusX - The horizontal radius of the ellipse.
     * @param radiusY - The vertical radius of the ellipse.
     * @returns The instance of the current object for chaining.
     */
    public ellipse(x: number, y: number, radiusX: number, radiusY: number): this
    {
        this._tick++;

        this._activePath.ellipse(x, y, radiusX, radiusY, this._transform.clone());

        return this;
    }

    /**
     * Draws a circle shape. This method adds a new circle path to the current drawing.
     * @param x - The x-coordinate of the center of the circle.
     * @param y - The y-coordinate of the center of the circle.
     * @param radius - The radius of the circle.
     * @returns The instance of the current object for chaining.
     */
    public circle(x: number, y: number, radius: number): this
    {
        this._tick++;

        this._activePath.circle(x, y, radius, this._transform.clone());

        return this;
    }

    /**
     * Adds another `GraphicsPath` to this path, optionally applying a transformation.
     * @param path - The `GraphicsPath` to add.
     * @returns The instance of the current object for chaining.
     */
    public path(path: GraphicsPath): this
    {
        this._tick++;

        this._activePath.addPath(path, this._transform.clone());

        return this;
    }

    /**
     * Connects the current point to a new point with a straight line. This method updates the current path.
     * @param x - The x-coordinate of the new point to connect to.
     * @param y - The y-coordinate of the new point to connect to.
     * @returns The instance of the current object for chaining.
     */
    public lineTo(x: number, y: number): this
    {
        this._tick++;

        const t = this._transform;

        this._activePath.lineTo(
            (t.a * x) + (t.c * y) + t.tx,
            (t.b * x) + (t.d * y) + t.ty
        );

        return this;
    }

    /**
     * Sets the starting point for a new sub-path. Any subsequent drawing commands are considered part of this path.
     * @param x - The x-coordinate for the starting point.
     * @param y - The y-coordinate for the starting point.
     * @returns The instance of the current object for chaining.
     */
    public moveTo(x: number, y: number): this
    {
        this._tick++;

        const t = this._transform;

        const instructions = this._activePath.instructions;

        const transformedX = (t.a * x) + (t.c * y) + t.tx;
        const transformedY = (t.b * x) + (t.d * y) + t.ty;

        if (instructions.length === 1 && instructions[0].action === 'moveTo')
        {
            instructions[0].data[0] = transformedX;
            instructions[0].data[1] = transformedY;

            return this;
        }
        this._activePath.moveTo(
            transformedX,
            transformedY
        );

        return this;
    }

    /**
     * Adds a quadratic curve to the path. It requires two points: the control point and the end point.
     * The starting point is the last point in the current path.
     * @param cpx - The x-coordinate of the control point.
     * @param cpy - The y-coordinate of the control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number, smoothness?: number): this
    {
        this._tick++;

        const t = this._transform;

        this._activePath.quadraticCurveTo(
            (t.a * cpx) + (t.c * cpy) + t.tx,
            (t.b * cpx) + (t.d * cpy) + t.ty,
            (t.a * x) + (t.c * y) + t.tx,
            (t.b * x) + (t.d * y) + t.ty,
            smoothness,
        );

        return this;
    }

    /**
     * Draws a rectangle shape. This method adds a new rectangle path to the current drawing.
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @returns The instance of the current object for chaining.
     */
    public rect(x: number, y: number, w: number, h: number): this
    {
        this._tick++;

        this._activePath.rect(x, y, w, h, this._transform.clone());

        return this;
    }

    /**
     * Draws a rectangle with rounded corners.
     * The corner radius can be specified to determine how rounded the corners should be.
     * An optional transformation can be applied, which allows for rotation, scaling, and translation of the rectangle.
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @param radius - The radius of the rectangle's corners. If not specified, corners will be sharp.
     * @returns The instance of the current object for chaining.
     */
    public roundRect(x: number, y: number, w: number, h: number, radius?: number): this
    {
        this._tick++;

        this._activePath.roundRect(x, y, w, h, radius, this._transform.clone());

        return this;
    }

    /**
     * Draws a polygon shape by specifying a sequence of points. This method allows for the creation of complex polygons,
     * which can be both open and closed. An optional transformation can be applied, enabling the polygon to be scaled,
     * rotated, or translated as needed.
     * @param points - An array of numbers, or an array of PointData objects eg [{x,y}, {x,y}, {x,y}]
     * representing the x and y coordinates, of the polygon's vertices, in sequence.
     * @param close - A boolean indicating whether to close the polygon path. True by default.
     */
    public poly(points: number[] | PointData[], close?: boolean): this
    {
        this._tick++;

        this._activePath.poly(points, close, this._transform.clone());

        return this;
    }

    /**
     * Draws a regular polygon with a specified number of sides. All sides and angles are equal.
     * @param x - The x-coordinate of the center of the polygon.
     * @param y - The y-coordinate of the center of the polygon.
     * @param radius - The radius of the circumscribed circle of the polygon.
     * @param sides - The number of sides of the polygon. Must be 3 or more.
     * @param rotation - The rotation angle of the polygon, in radians. Zero by default.
     * @param transform - An optional `Matrix` object to apply a transformation to the polygon.
     * @returns The instance of the current object for chaining.
     */
    public regularPoly(x: number, y: number, radius: number, sides: number, rotation = 0, transform?: Matrix): this
    {
        this._tick++;
        this._activePath.regularPoly(x, y, radius, sides, rotation, transform);

        return this;
    }

    /**
     * Draws a polygon with rounded corners.
     * Similar to `regularPoly` but with the ability to round the corners of the polygon.
     * @param x - The x-coordinate of the center of the polygon.
     * @param y - The y-coordinate of the center of the polygon.
     * @param radius - The radius of the circumscribed circle of the polygon.
     * @param sides - The number of sides of the polygon. Must be 3 or more.
     * @param corner - The radius of the rounding of the corners.
     * @param rotation - The rotation angle of the polygon, in radians. Zero by default.
     * @returns The instance of the current object for chaining.
     */
    public roundPoly(x: number, y: number, radius: number, sides: number, corner: number, rotation?: number): this
    {
        this._tick++;
        this._activePath.roundPoly(x, y, radius, sides, corner, rotation);

        return this;
    }

    /**
     * Draws a shape with rounded corners. This function supports custom radius for each corner of the shape.
     * Optionally, corners can be rounded using a quadratic curve instead of an arc, providing a different aesthetic.
     * @param points - An array of `RoundedPoint` representing the corners of the shape to draw.
     * A minimum of 3 points is required.
     * @param radius - The default radius for the corners.
     * This radius is applied to all corners unless overridden in `points`.
     * @param useQuadratic - If set to true, rounded corners are drawn using a quadraticCurve
     *  method instead of an arc method. Defaults to false.
     * @param smoothness - Specifies the smoothness of the curve when `useQuadratic` is true.
     * Higher values make the curve smoother.
     * @returns The instance of the current object for chaining.
     */
    public roundShape(points: RoundedPoint[], radius: number, useQuadratic?: boolean, smoothness?: number): this
    {
        this._tick++;
        this._activePath.roundShape(points, radius, useQuadratic, smoothness);

        return this;
    }

    /**
     * Draw Rectangle with fillet corners. This is much like rounded rectangle
     * however it support negative numbers as well for the corner radius.
     * @param x - Upper left corner of rect
     * @param y - Upper right corner of rect
     * @param width - Width of rect
     * @param height - Height of rect
     * @param fillet - accept negative or positive values
     */
    public filletRect(x: number, y: number, width: number, height: number, fillet: number): this
    {
        this._tick++;
        this._activePath.filletRect(x, y, width, height, fillet);

        return this;
    }

    /**
     * Draw Rectangle with chamfer corners. These are angled corners.
     * @param x - Upper left corner of rect
     * @param y - Upper right corner of rect
     * @param width - Width of rect
     * @param height - Height of rect
     * @param chamfer - non-zero real number, size of corner cutout
     * @param transform
     */
    public chamferRect(x: number, y: number, width: number, height: number, chamfer: number, transform?: Matrix): this
    {
        this._tick++;
        this._activePath.chamferRect(x, y, width, height, chamfer, transform);

        return this;
    }

    /**
     * Draws a star shape centered at a specified location. This method allows for the creation
     *  of stars with a variable number of points, outer radius, optional inner radius, and rotation.
     * The star is drawn as a closed polygon with alternating outer and inner vertices to create the star's points.
     * An optional transformation can be applied to scale, rotate, or translate the star as needed.
     * @param x - The x-coordinate of the center of the star.
     * @param y - The y-coordinate of the center of the star.
     * @param points - The number of points of the star.
     * @param radius - The outer radius of the star (distance from the center to the outer points).
     * @param innerRadius - Optional. The inner radius of the star
     * (distance from the center to the inner points between the outer points).
     * If not provided, defaults to half of the `radius`.
     * @param rotation - Optional. The rotation of the star in radians, where 0 is aligned with the y-axis.
     * Defaults to 0, meaning one point is directly upward.
     * @returns The instance of the current object for chaining further drawing commands.
     */
    public star(x: number, y: number, points: number, radius: number, innerRadius = 0, rotation = 0): this
    {
        this._tick++;

        this._activePath.star(x, y, points, radius, innerRadius, rotation, this._transform.clone());

        return this;
    }

    /**
     * Parses and renders an SVG string into the graphics context. This allows for complex shapes and paths
     * defined in SVG format to be drawn within the graphics context.
     * @param svg - The SVG string to be parsed and rendered.
     */
    public svg(svg: string): this
    {
        this._tick++;

        SVGParser(svg, this);

        return this;
    }

    /**
     * Restores the most recently saved graphics state by popping the top of the graphics state stack.
     * This includes transformations, fill styles, and stroke styles.
     */
    public restore(): this
    {
        const state = this._stateStack.pop();

        if (state)
        {
            this._transform = state.transform;
            this._fillStyle = state.fillStyle;
            this._strokeStyle = state.strokeStyle;
        }

        return this;
    }

    /** Saves the current graphics state, including transformations, fill styles, and stroke styles, onto a stack. */
    public save(): this
    {
        this._stateStack.push({
            transform: this._transform.clone(),
            fillStyle: { ...this._fillStyle },
            strokeStyle: { ...this._strokeStyle },
        });

        return this;
    }

    /**
     * Returns the current transformation matrix of the graphics context.
     * @returns The current transformation matrix.
     */
    public getTransform(): Matrix
    {
        return this._transform;
    }

    /**
     * Resets the current transformation matrix to the identity matrix, effectively removing any transformations (rotation, scaling, translation) previously applied.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public resetTransform(): this
    {
        this._transform.identity();

        return this;
    }

    /**
     * Applies a rotation transformation to the graphics context around the current origin.
     * @param angle - The angle of rotation in radians.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public rotate(angle: number): this
    {
        this._transform.rotate(angle);

        return this;
    }

    /**
     * Applies a scaling transformation to the graphics context, scaling drawings by x horizontally and by y vertically.
     * @param x - The scale factor in the horizontal direction.
     * @param y - (Optional) The scale factor in the vertical direction. If not specified, the x value is used for both directions.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public scale(x: number, y: number = x): this
    {
        this._transform.scale(x, y);

        return this;
    }

    /**
     * Sets the current transformation matrix of the graphics context to the specified matrix or values.
     * This replaces the current transformation matrix.
     * @param a - The value for the a property of the matrix, or a Matrix object to use directly.
     * @param b - The value for the b property of the matrix.
     * @param c - The value for the c property of the matrix.
     * @param d - The value for the d property of the matrix.
     * @param dx - The value for the tx (translate x) property of the matrix.
     * @param dy - The value for the ty (translate y) property of the matrix.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public setTransform(transform: Matrix): this;
    public setTransform(a: number, b: number, c: number, d: number, dx: number, dy: number): this;
    public setTransform(a: number | Matrix, b?: number, c?: number, d?: number, dx?: number, dy?: number): this
    {
        if (a instanceof Matrix)
        {
            this._transform.set(a.a, a.b, a.c, a.d, a.tx, a.ty);

            return this;
        }

        this._transform.set(a, b, c, d, dx, dy);

        return this;
    }

    /**
     * Applies the specified transformation matrix to the current graphics context by multiplying the current matrix with the specified matrix.
     * @param a - The value for the a property of the matrix, or a Matrix object to use directly.
     * @param b - The value for the b property of the matrix.
     * @param c - The value for the c property of the matrix.
     * @param d - The value for the d property of the matrix.
     * @param dx - The value for the tx (translate x) property of the matrix.
     * @param dy - The value for the ty (translate y) property of the matrix.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public transform(transform: Matrix): this;
    public transform(a: number, b: number, c: number, d: number, dx: number, dy: number): this;
    public transform(a: number | Matrix, b?: number, c?: number, d?: number, dx?: number, dy?: number): this
    {
        if (a instanceof Matrix)
        {
            this._transform.append(a);

            return this;
        }

        tempMatrix.set(a, b, c, d, dx, dy);
        this._transform.append(tempMatrix);

        return this;
    }

    /**
     * Applies a translation transformation to the graphics context, moving the origin by the specified amounts.
     * @param x - The amount to translate in the horizontal direction.
     * @param y - (Optional) The amount to translate in the vertical direction. If not specified, the x value is used for both directions.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public translate(x: number, y: number = x): this
    {
        this._transform.translate(x, y);

        return this;
    }

    /**
     * Clears all drawing commands from the graphics context, effectively resetting it. This includes clearing the path,
     * and optionally resetting transformations to the identity matrix.
     * @returns The instance of the current GraphicsContext for method chaining.
     */
    public clear(): this
    {
        this._activePath.clear();
        this.instructions.length = 0;
        this.resetTransform();

        this.onUpdate();

        return this;
    }

    protected onUpdate(): void
    {
        if (this.dirty) return;

        this.emit('update', this, 0x10);
        this.dirty = true;
        this._boundsDirty = true;
    }

    /** The bounds of the graphic shape. */
    get bounds(): Bounds
    {
        if (!this._boundsDirty) return this._bounds;

        // TODO switch to idy dirty with tick..
        const bounds = this._bounds;

        bounds.clear();

        for (let i = 0; i < this.instructions.length; i++)
        {
            const instruction = this.instructions[i];
            const action = instruction.action;

            if (action === 'fill')
            {
                const data = instruction.data as FillInstruction['data'];

                bounds.addBounds(data.path.bounds);
            }
            else if (action === 'texture')
            {
                const data = instruction.data as TextureInstruction['data'];

                bounds.addFrame(data.dx, data.dy, data.dx + data.dw, data.dy + data.dh, data.transform);
            }
            if (action === 'stroke')
            {
                const data = instruction.data as StrokeInstruction['data'];

                const alignment = data.style.alignment;

                const outerPadding = (data.style.width * (1 - alignment));

                const _bounds = data.path.bounds;

                bounds.addFrame(
                    _bounds.minX - outerPadding,
                    _bounds.minY - outerPadding,
                    _bounds.maxX + outerPadding,
                    _bounds.maxY + outerPadding
                );
            }
        }

        return bounds;
    }

    /**
     * Check to see if a point is contained within this geometry.
     * @param point - Point to check if it's contained.
     * @returns {boolean} `true` if the point is contained within geometry.
     */
    public containsPoint(point: PointData): boolean
    {
        // early out if the bounding box is not hit
        if (!this.bounds.containsPoint(point.x, point.y)) return false;

        const instructions = this.instructions;
        let hasHit = false;

        for (let k = 0; k < instructions.length; k++)
        {
            const instruction = instructions[k];

            const data = instruction.data as FillInstruction['data'];
            const path = data.path;

            if (!instruction.action || !path) continue;

            const style = data.style;
            const shapes = path.shapePath.shapePrimitives;

            for (let i = 0; i < shapes.length; i++)
            {
                const shape = shapes[i].shape;

                if (!style || !shape) continue;

                const transform = shapes[i].transform;

                const transformedPoint = transform ? transform.applyInverse(point, tmpPoint) : point;

                if (instruction.action === 'fill')
                {
                    hasHit = shape.contains(transformedPoint.x, transformedPoint.y);
                }
                else
                {
                    const strokeStyle = (style as ConvertedStrokeStyle);

                    hasHit = shape.strokeContains(transformedPoint.x, transformedPoint.y, strokeStyle.width, strokeStyle.alignment);
                }

                const holes = data.hole;

                if (holes)
                {
                    const holeShapes = holes.shapePath?.shapePrimitives;

                    if (holeShapes)
                    {
                        for (let j = 0; j < holeShapes.length; j++)
                        {
                            if (holeShapes[j].shape.contains(transformedPoint.x, transformedPoint.y))
                            {
                                hasHit = false;
                            }
                        }
                    }
                }

                if (hasHit)
                {
                    return true;
                }
            }
        }

        return hasHit;
    }

    /**
     * Destroys the GraphicsData object.
     * @param options - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param {boolean} [options.texture=false] - Should it destroy the current texture of the fill/stroke style?
     * @param {boolean} [options.textureSource=false] - Should it destroy the texture source of the fill/stroke style?
     */
    public destroy(options: TypeOrBool<TextureDestroyOptions> = false): void
    {
        this._stateStack.length = 0;
        this._transform = null;

        this.emit('destroy', this);
        this.removeAllListeners();

        const destroyTexture = typeof options === 'boolean' ? options : options?.texture;

        if (destroyTexture)
        {
            const destroyTextureSource = typeof options === 'boolean' ? options : options?.textureSource;

            if (this._fillStyle.texture)
            {
                this._fillStyle.texture.destroy(destroyTextureSource);
            }

            if (this._strokeStyle.texture)
            {
                this._strokeStyle.texture.destroy(destroyTextureSource);
            }
        }

        this._fillStyle = null;
        this._strokeStyle = null;

        this.instructions = null;
        this._activePath = null;
        this._bounds = null;
        this._stateStack = null;
        this.customShader = null;
        this._transform = null;
    }
}
