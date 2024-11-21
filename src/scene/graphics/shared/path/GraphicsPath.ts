import { Point } from '../../../../maths/point/Point';
import { uid } from '../../../../utils/data/uid';
import { warn } from '../../../../utils/logging/warn';
import { parseSVGPath } from '../svg/parseSVGPath';
import { ShapePath } from './ShapePath';

import type { Matrix } from '../../../../maths/matrix/Matrix';
import type { PointData } from '../../../../maths/point/PointData';
import type { Bounds } from '../../../container/bounds/Bounds';
import type { RoundedPoint } from './roundShape';

export interface PathInstruction
{
    action: 'moveTo' | 'lineTo' | 'quadraticCurveTo' |
    'bezierCurveTo' | 'arc' | 'closePath' |
    'addPath' | 'arcTo' | 'ellipse' |
    'rect' | 'roundRect' | 'arcToSvg' |
    'poly' | 'circle' |
    'regularPoly' | 'roundPoly' | 'roundShape' | 'filletRect' | 'chamferRect'
    data: any[];
}

/**
 * The `GraphicsPath` class is designed to represent a graphical path consisting of multiple drawing instructions.
 * This class serves as a collection of drawing commands that can be executed to render shapes and paths on a canvas or
 * similar graphical context. It supports high-level drawing operations like lines, arcs, curves, and more, enabling
 * complex graphic constructions with relative ease.
 */
export class GraphicsPath
{
    public instructions: PathInstruction[] = [];

    /** unique id for this graphics path */
    public readonly uid: number = uid('graphicsPath');

    private _dirty = true;
    // needed for hit testing and bounds calculations
    private _shapePath: ShapePath;

    /**
     * Controls whether shapes in this path should be checked for holes using the non-zero fill rule.
     * When true, any closed shape that is fully contained within another shape will become
     * a hole in that shape during filling operations.
     *
     * This follows SVG's non-zero fill rule where:
     * 1. Shapes are analyzed to find containment relationships
     * 2. If Shape B is fully contained within Shape A, Shape B becomes a hole in Shape A
     * 3. Multiple nested holes are supported
     *
     * Mainly used internally by the SVG parser to correctly handle holes in complex paths.
     * When false, all shapes are filled independently without checking for holes.
     */
    public checkForHoles: boolean;

    /**
     * Provides access to the internal shape path, ensuring it is up-to-date with the current instructions.
     * @returns The `ShapePath` instance associated with this `GraphicsPath`.
     */
    get shapePath(): ShapePath
    {
        if (!this._shapePath)
        {
            this._shapePath = new ShapePath(this);
        }

        if (this._dirty)
        {
            this._dirty = false;
            this._shapePath.buildPath();
        }

        return this._shapePath;
    }

    /**
     * Creates a `GraphicsPath` instance optionally from an SVG path string or an array of `PathInstruction`.
     * @param instructions - An SVG path string or an array of `PathInstruction` objects.
     * @param signed
     */
    constructor(instructions?: string | PathInstruction[], signed = false)
    {
        this.checkForHoles = signed;

        if (typeof instructions === 'string')
        {
            parseSVGPath(instructions, this);
        }
        else
        {
            this.instructions = instructions?.slice() ?? [];
        }
    }

    /**
     * Adds another `GraphicsPath` to this path, optionally applying a transformation.
     * @param path - The `GraphicsPath` to add.
     * @param transform - An optional transformation to apply to the added path.
     * @returns The instance of the current object for chaining.
     */
    public addPath(path: GraphicsPath, transform?: Matrix): this
    {
        path = path.clone();
        this.instructions.push({ action: 'addPath', data: [path, transform] });

        this._dirty = true;

        return this;
    }

    /**
     * Adds an arc to the path. The arc is centered at (x, y)
     *  position with radius `radius` starting at `startAngle` and ending at `endAngle`.
     * @param x - The x-coordinate of the arc's center.
     * @param y - The y-coordinate of the arc's center.
     * @param radius - The radius of the arc.
     * @param startAngle - The starting angle of the arc, in radians.
     * @param endAngle - The ending angle of the arc, in radians.
     * @param counterclockwise - Specifies whether the arc should be drawn in the anticlockwise direction. False by default.
     * @returns The instance of the current object for chaining.
     */
    public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this;
    public arc(...args: [number, number, number, number, number, boolean]): this
    {
        this.instructions.push({ action: 'arc', data: args });

        this._dirty = true;

        return this;
    }

    /**
     * Adds an arc to the path with the arc tangent to the line joining two specified points.
     * The arc radius is specified by `radius`.
     * @param x1 - The x-coordinate of the first point.
     * @param y1 - The y-coordinate of the first point.
     * @param x2 - The x-coordinate of the second point.
     * @param y2 - The y-coordinate of the second point.
     * @param radius - The radius of the arc.
     * @returns The instance of the current object for chaining.
     */
    public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): this;
    public arcTo(...args: [number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'arcTo', data: args });

        this._dirty = true;

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
    // eslint-disable-next-line max-len
    public arcToSvg(rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, x: number, y: number): this;
    public arcToSvg(...args: [number, number, number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'arcToSvg', data: args });

        this._dirty = true;

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
    public bezierCurveTo(
        cp1x: number, cp1y: number, cp2x: number, cp2y: number,
        x: number, y: number,
        smoothness?: number
    ): this;
    public bezierCurveTo(...args: [number, number, number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'bezierCurveTo', data: args });

        this._dirty = true;

        return this;
    }

    /**
     * Adds a cubic Bezier curve to the path.
     * It requires two points: the second control point and the end point. The first control point is assumed to be
     * The starting point is the last point in the current path.
     * @param cp2x - The x-coordinate of the second control point.
     * @param cp2y - The y-coordinate of the second control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public bezierCurveToShort(cp2x: number, cp2y: number, x: number, y: number, smoothness?: number): this
    {
        const last = this.instructions[this.instructions.length - 1];

        const lastPoint = this.getLastPoint(Point.shared);

        let cp1x = 0;
        let cp1y = 0;

        if (!last || last.action !== 'bezierCurveTo')
        {
            cp1x = lastPoint.x;
            cp1y = lastPoint.y;
        }
        else
        {
            cp1x = last.data[2];
            cp1y = last.data[3];

            const currentX = lastPoint.x;
            const currentY = lastPoint.y;

            cp1x = currentX + (currentX - cp1x);
            cp1y = currentY + (currentY - cp1y);
        }

        this.instructions.push({ action: 'bezierCurveTo', data: [cp1x, cp1y, cp2x, cp2y, x, y, smoothness] });

        this._dirty = true;

        return this;
    }

    /**
     * Closes the current path by drawing a straight line back to the start.
     * If the shape is already closed or there are no points in the path, this method does nothing.
     * @returns The instance of the current object for chaining.
     */
    public closePath(): this
    {
        this.instructions.push({ action: 'closePath', data: [] });

        this._dirty = true;

        return this;
    }

    /**
     * Draws an ellipse at the specified location and with the given x and y radii.
     * An optional transformation can be applied, allowing for rotation, scaling, and translation.
     * @param x - The x-coordinate of the center of the ellipse.
     * @param y - The y-coordinate of the center of the ellipse.
     * @param radiusX - The horizontal radius of the ellipse.
     * @param radiusY - The vertical radius of the ellipse.
     * @param transform - An optional `Matrix` object to apply a transformation to the ellipse. This can include rotations.
     * @returns The instance of the current object for chaining.
     */
    public ellipse(x: number, y: number, radiusX: number, radiusY: number, matrix?: Matrix): this;
    public ellipse(...args: [number, number, number, number, Matrix]): this
    {
        this.instructions.push({ action: 'ellipse', data: args });

        // TODO nail this!

        this._dirty = true;

        return this;
    }

    /**
     * Connects the current point to a new point with a straight line. This method updates the current path.
     * @param x - The x-coordinate of the new point to connect to.
     * @param y - The y-coordinate of the new point to connect to.
     * @returns The instance of the current object for chaining.
     */
    public lineTo(x: number, y: number): this;
    public lineTo(...args: [number, number]): this
    {
        this.instructions.push({ action: 'lineTo', data: args });

        this._dirty = true;

        return this;
    }

    /**
     * Sets the starting point for a new sub-path. Any subsequent drawing commands are considered part of this path.
     * @param x - The x-coordinate for the starting point.
     * @param y - The y-coordinate for the starting point.
     * @returns The instance of the current object for chaining.
     */
    public moveTo(x: number, y: number): this;
    public moveTo(...args: [number, number]): this
    {
        this.instructions.push({ action: 'moveTo', data: args });

        return this;
    }

    /**
     * Adds a quadratic curve to the path. It requires two points: the control point and the end point.
     * The starting point is the last point in the current path.
     * @param cp1x - The x-coordinate of the control point.
     * @param cp1y - The y-coordinate of the control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number, smoothness?: number): this;
    public quadraticCurveTo(...args: [number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'quadraticCurveTo', data: args });

        this._dirty = true;

        return this;
    }

    /**
     * Adds a quadratic curve to the path. It uses the previous point as the control point.
     * @param x - The x-coordinate of the end point.
     * @param y - The y-coordinate of the end point.
     * @param smoothness - Optional parameter to adjust the smoothness of the curve.
     * @returns The instance of the current object for chaining.
     */
    public quadraticCurveToShort(x: number, y: number, smoothness?: number): this
    {
        // check if we have a previous quadraticCurveTo
        const last = this.instructions[this.instructions.length - 1];

        const lastPoint = this.getLastPoint(Point.shared);

        let cpx1 = 0;
        let cpy1 = 0;

        if (!last || last.action !== 'quadraticCurveTo')
        {
            cpx1 = lastPoint.x;
            cpy1 = lastPoint.y;
        }
        else
        {
            cpx1 = last.data[0];
            cpy1 = last.data[1];

            const currentX = lastPoint.x;
            const currentY = lastPoint.y;

            cpx1 = currentX + (currentX - cpx1);
            cpy1 = currentY + (currentY - cpy1);
        }

        this.instructions.push({ action: 'quadraticCurveTo', data: [cpx1, cpy1, x, y, smoothness] });

        this._dirty = true;

        return this;
    }

    /**
     * Draws a rectangle shape. This method adds a new rectangle path to the current drawing.
     * @param x - The x-coordinate of the top-left corner of the rectangle.
     * @param y - The y-coordinate of the top-left corner of the rectangle.
     * @param w - The width of the rectangle.
     * @param h - The height of the rectangle.
     * @param transform - An optional `Matrix` object to apply a transformation to the rectangle.
     * @returns The instance of the current object for chaining.
     */
    public rect(x: number, y: number, w: number, h: number, transform?: Matrix): this
    {
        this.instructions.push({ action: 'rect', data: [x, y, w, h, transform] });

        this._dirty = true;

        return this;
    }

    /**
     * Draws a circle shape. This method adds a new circle path to the current drawing.
     * @param x - The x-coordinate of the center of the circle.
     * @param y - The y-coordinate of the center of the circle.
     * @param radius - The radius of the circle.
     * @param transform - An optional `Matrix` object to apply a transformation to the circle.
     * @returns The instance of the current object for chaining.
     */
    public circle(x: number, y: number, radius: number, transform?: Matrix): this
    {
        this.instructions.push({ action: 'circle', data: [x, y, radius, transform] });

        this._dirty = true;

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
     * @param transform - An optional `Matrix` object to apply a transformation to the rectangle.
     * @returns The instance of the current object for chaining.
     */
    public roundRect(x: number, y: number, w: number, h: number, radius?: number, transform?: Matrix): this;
    public roundRect(...args: [number, number, number, number, number, Matrix?]): this
    {
        this.instructions.push({ action: 'roundRect', data: args });

        this._dirty = true;

        return this;
    }

    /**
     * Draws a polygon shape by specifying a sequence of points. This method allows for the creation of complex polygons,
     * which can be both open and closed. An optional transformation can be applied, enabling the polygon to be scaled,
     * rotated, or translated as needed.
     * @param points - An array of numbers representing the x and y coordinates of the polygon's vertices, in sequence.
     * @param close - A boolean indicating whether to close the polygon path. True by default.
     * @param transform - An optional `Matrix` object to apply a transformation to the polygon.
     * @returns The instance of the current object for chaining further drawing commands.
     */
    public poly(points: number[] | PointData[], close?: boolean, transform?: Matrix): this;
    public poly(...args: [number[] | PointData[], boolean, Matrix?]): this
    {
        this.instructions.push({ action: 'poly', data: args });

        this._dirty = true;

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
    public regularPoly(x: number, y: number, radius: number, sides: number, rotation?: number, transform?: Matrix): this;
    public regularPoly(...args: [number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'regularPoly', data: args });

        this._dirty = true;

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
    public roundPoly(x: number, y: number, radius: number, sides: number, corner: number, rotation?: number): this;
    public roundPoly(...args: [number, number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'roundPoly', data: args });

        this._dirty = true;

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
    public roundShape(points: RoundedPoint[], radius: number, useQuadratic?: boolean, smoothness?: number): this;
    public roundShape(...args: [RoundedPoint[], number, boolean, number]): this
    {
        this.instructions.push({ action: 'roundShape', data: args });

        this._dirty = true;

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
    public filletRect(x: number, y: number, width: number, height: number, fillet: number): this;
    public filletRect(...args: [number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'filletRect', data: args });

        this._dirty = true;

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
    public chamferRect(x: number, y: number, width: number, height: number, chamfer: number, transform?: Matrix): this;
    public chamferRect(...args: [number, number, number, number, number]): this
    {
        this.instructions.push({ action: 'chamferRect', data: args });

        this._dirty = true;

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
     * @param transform - An optional `Matrix` object to apply a transformation to the star.
     * This can include rotations, scaling, and translations.
     * @returns The instance of the current object for chaining further drawing commands.
     */
    // eslint-disable-next-line max-len
    public star(x: number, y: number, points: number, radius: number, innerRadius?: number, rotation?: number, transform?: Matrix): this
    {
        innerRadius = innerRadius || radius / 2;

        const startAngle = (-1 * Math.PI / 2) + rotation;
        const len = points * 2;
        const delta = (Math.PI * 2) / len;
        const polygon = [];

        for (let i = 0; i < len; i++)
        {
            const r = i % 2 ? innerRadius : radius;
            const angle = (i * delta) + startAngle;

            polygon.push(
                x + (r * Math.cos(angle)),
                y + (r * Math.sin(angle))
            );
        }

        this.poly(polygon, true, transform);

        return this;
    }

    /**
     * Creates a copy of the current `GraphicsPath` instance. This method supports both shallow and deep cloning.
     * A shallow clone copies the reference of the instructions array, while a deep clone creates a new array and
     * copies each instruction individually, ensuring that modifications to the instructions of the cloned `GraphicsPath`
     * do not affect the original `GraphicsPath` and vice versa.
     * @param deep - A boolean flag indicating whether the clone should be deep.
     * @returns A new `GraphicsPath` instance that is a clone of the current instance.
     */
    public clone(deep = false): GraphicsPath
    {
        const newGraphicsPath2D = new GraphicsPath();

        newGraphicsPath2D.checkForHoles = this.checkForHoles;

        if (!deep)
        {
            newGraphicsPath2D.instructions = this.instructions.slice();
        }
        else
        {
            for (let i = 0; i < this.instructions.length; i++)
            {
                const instruction = this.instructions[i];

                newGraphicsPath2D.instructions.push({ action: instruction.action, data: instruction.data.slice() });
            }
        }

        return newGraphicsPath2D;
    }

    public clear(): this
    {
        this.instructions.length = 0;
        this._dirty = true;

        return this;
    }

    /**
     * Applies a transformation matrix to all drawing instructions within the `GraphicsPath`.
     * This method enables the modification of the path's geometry according to the provided
     * transformation matrix, which can include translations, rotations, scaling, and skewing.
     *
     * Each drawing instruction in the path is updated to reflect the transformation,
     * ensuring the visual representation of the path is consistent with the applied matrix.
     *
     * Note: The transformation is applied directly to the coordinates and control points of the drawing instructions,
     * not to the path as a whole. This means the transformation's effects are baked into the individual instructions,
     * allowing for fine-grained control over the path's appearance.
     * @param matrix - A `Matrix` object representing the transformation to apply.
     * @returns The instance of the current object for chaining further operations.
     */
    public transform(matrix: Matrix): this
    {
        if (matrix.isIdentity()) return this;

        const a = matrix.a;
        const b = matrix.b;
        const c = matrix.c;
        const d = matrix.d;
        const tx = matrix.tx;
        const ty = matrix.ty;

        let x = 0;
        let y = 0;

        let cpx1 = 0;
        let cpy1 = 0;
        let cpx2 = 0;
        let cpy2 = 0;

        let rx = 0;
        let ry = 0;

        for (let i = 0; i < this.instructions.length; i++)
        {
            const instruction = this.instructions[i];
            const data = instruction.data as any[];

            switch (instruction.action)
            {
                case 'moveTo':
                case 'lineTo':

                    x = data[0];
                    y = data[1];

                    data[0] = (a * x) + (c * y) + tx;
                    data[1] = (b * x) + (d * y) + ty;
                    break;
                case 'bezierCurveTo':

                    cpx1 = data[0];
                    cpy1 = data[1];
                    cpx2 = data[2];
                    cpy2 = data[3];

                    x = data[4];
                    y = data[5];

                    data[0] = (a * cpx1) + (c * cpy1) + tx;
                    data[1] = (b * cpx1) + (d * cpy1) + ty;
                    data[2] = (a * cpx2) + (c * cpy2) + tx;
                    data[3] = (b * cpx2) + (d * cpy2) + ty;
                    data[4] = (a * x) + (c * y) + tx;
                    data[5] = (b * x) + (d * y) + ty;
                    break;

                case 'quadraticCurveTo':

                    cpx1 = data[0];
                    cpy1 = data[1];

                    x = data[2];
                    y = data[3];

                    data[0] = (a * cpx1) + (c * cpy1) + tx;
                    data[1] = (b * cpx1) + (d * cpy1) + ty;

                    data[2] = (a * x) + (c * y) + tx;
                    data[3] = (b * x) + (d * y) + ty;

                    break;

                case 'arcToSvg':

                    x = data[5];
                    y = data[6];

                    rx = data[0];
                    ry = data[1];

                    // multiply the radius by the transform..

                    data[0] = (a * rx) + (c * ry);
                    data[1] = (b * rx) + (d * ry);

                    data[5] = (a * x) + (c * y) + tx;
                    data[6] = (b * x) + (d * y) + ty;

                    break;

                case 'circle':
                    data[4] = adjustTransform(data[3], matrix);
                    break;
                case 'rect':
                    data[4] = adjustTransform(data[4], matrix);
                    break;
                case 'ellipse':
                    data[8] = adjustTransform(data[8], matrix);
                    break;
                case 'roundRect':
                    data[5] = adjustTransform(data[5], matrix);
                    break;
                case 'addPath':
                    data[0].transform(matrix);
                    break;
                case 'poly':
                    data[2] = adjustTransform(data[2], matrix);
                    break;
                default:
                    // #if _DEBUG
                    warn('unknown transform action', instruction.action);
                    // #endif
                    break;
            }
        }

        this._dirty = true;

        return this;
    }

    get bounds(): Bounds
    {
        return this.shapePath.bounds;
    }

    /**
     * Retrieves the last point from the current drawing instructions in the `GraphicsPath`.
     * This method is useful for operations that depend on the path's current endpoint,
     * such as connecting subsequent shapes or paths. It supports various drawing instructions,
     * ensuring the last point's position is accurately determined regardless of the path's complexity.
     *
     * If the last instruction is a `closePath`, the method iterates backward through the instructions
     *  until it finds an actionable instruction that defines a point (e.g., `moveTo`, `lineTo`,
     * `quadraticCurveTo`, etc.). For compound paths added via `addPath`, it recursively retrieves
     * the last point from the nested path.
     * @param out - A `Point` object where the last point's coordinates will be stored.
     * This object is modified directly to contain the result.
     * @returns The `Point` object containing the last point's coordinates.
     */
    public getLastPoint(out: Point): Point
    {
        let index = this.instructions.length - 1;

        let lastInstruction = this.instructions[index];

        if (!lastInstruction)
        {
            out.x = 0;
            out.y = 0;

            return out;
        }

        while (lastInstruction.action === 'closePath')
        {
            index--;

            if (index < 0)
            {
                out.x = 0;
                out.y = 0;

                return out;
            }

            lastInstruction = this.instructions[index];
        }

        switch (lastInstruction.action)
        {
            case 'moveTo':
            case 'lineTo':
                out.x = lastInstruction.data[0];
                out.y = lastInstruction.data[1];
                break;
            case 'quadraticCurveTo':
                out.x = lastInstruction.data[2];
                out.y = lastInstruction.data[3];
                break;
            case 'bezierCurveTo':
                out.x = lastInstruction.data[4];
                out.y = lastInstruction.data[5];
                break;
            case 'arc':
            case 'arcToSvg':
                out.x = lastInstruction.data[5];
                out.y = lastInstruction.data[6];
                break;
            case 'addPath':
                // TODO prolly should transform the last point of the path
                lastInstruction.data[0].getLastPoint(out);
                break;
        }

        return out;
    }
}

function adjustTransform(currentMatrix?: Matrix, transform?: Matrix): Matrix
{
    if (currentMatrix)
    {
        return currentMatrix.prepend(transform);
    }

    return transform.clone();
}
