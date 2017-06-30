import { Point, ObservablePoint, Matrix } from '../math';

/**
 * Generic class to deal with traditional 2D matrix transforms
 * local transformation is calculated from position,scale,skew and rotation
 *
 * @class
 * @memberof PIXI
 */
export default class TransformBase
{
    /**
     *
     * @param {boolean} [cache=true] - If true the transform will cache computations
     */
    constructor(cache = true)
    {
        /**
         * If true the transform will cache computations
         *
         * @member {boolean}
         */
        this.cache = cache;

        /**
         * The global matrix transform. It can be swapped temporarily by some functions like getLocalBounds()
         *
         * @member {PIXI.Matrix}
         */
        this.worldTransform = new Matrix();

        /**
         * The local matrix transform
         *
         * @member {PIXI.Matrix}
         */
        this.localTransform = new Matrix();

        this._worldID = 0;
        this._parentID = 0;

        /**
         * The coordinate of the object relative to the local coordinates of the parent.
         *
         * @member {PIXI.ObservablePoint}
         */
        this.position = cache ? new ObservablePoint(this.onChange, this, 0, 0) : new Point(0, 0);

        /**
         * The scale factor of the object.
         *
         * @member {PIXI.ObservablePoint}
         */
        this.scale = cache ? new ObservablePoint(this.onChange, this, 1, 1) : new Point(1, 1);

        /**
         * The pivot point of the displayObject that it rotates around
         *
         * @member {PIXI.ObservablePoint}
         */
        this.pivot = cache ? new ObservablePoint(this.onChange, this, 0, 0) : new Point(0, 0);

        /**
         * The skew amount, on the x and y axis.
         *
         * @member {PIXI.ObservablePoint}
         */
        this.skew = new ObservablePoint(this.updateSkew, this, 0, 0);

        /**
         * The rotation value of the object, in radians
         *
         * @member {Number}
         * @private
         */
        this._rotation = 0;

        this._cx = 1; // cos rotation + skewY;
        this._sx = 0; // sin rotation + skewY;
        this._cy = 0; // cos rotation + Math.PI/2 - skewX;
        this._sy = 1; // sin rotation + Math.PI/2 - skewX;

        this._localID = 0;
        this._currentLocalID = 0;
    }

    /**
     * Called when a value changes.
     *
     * @private
     */
    onChange()
    {
        this._localID ++;
    }

    /**
     * Updates the skew values when the skew or rotation changes.
     *
     * @private
     */
    updateSkew()
    {
        this._cx = Math.cos(this._rotation + this.skew._y);
        this._sx = Math.sin(this._rotation + this.skew._y);
        this._cy = -Math.sin(this._rotation - this.skew._x); // cos, added PI/2
        this._sy = Math.cos(this._rotation - this.skew._x); // sin, added PI/2

        this._localID ++;
    }

    /**
     * Updates only local matrix
     */
    updateLocalTransform()
    {
        const shouldUpdate = !this.cache || (this._localID !== this._currentLocalID);

        if (shouldUpdate)
        {
            const lt = this.localTransform;

            // get the matrix values of the displayobject based on its transform properties..
            lt.a = this._cx * this.scale._x;
            lt.b = this._sx * this.scale._x;
            lt.c = this._cy * this.scale._y;
            lt.d = this._sy * this.scale._y;

            lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
            lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
            this._currentLocalID = this._localID;

            // force an update..
            this._parentID = -1;
        }
    }

    /**
     * Updates the values of the object and applies the parent's transform.
     *
     * @param {PIXI.Transform} parentTransform - The transform of the parent of this object
     */
    updateTransform(parentTransform)
    {
        const lt = this.localTransform;

        if (!this.cache || (this._localID !== this._currentLocalID))
        {
            // get the matrix values of the displayobject based on its transform properties..
            lt.a = this._cx * this.scale._x;
            lt.b = this._sx * this.scale._x;
            lt.c = this._cy * this.scale._y;
            lt.d = this._sy * this.scale._y;

            lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
            lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
            this._currentLocalID = this._localID;

            // force an update..
            this._parentID = -1;
        }

        if (!this.cache || (this._parentID !== parentTransform._worldID))
        {
            // concat the parent matrix with the objects transform.
            const pt = parentTransform.worldTransform;
            const wt = this.worldTransform;

            wt.a = (lt.a * pt.a) + (lt.b * pt.c);
            wt.b = (lt.a * pt.b) + (lt.b * pt.d);
            wt.c = (lt.c * pt.a) + (lt.d * pt.c);
            wt.d = (lt.c * pt.b) + (lt.d * pt.d);
            wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
            wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;

            this._parentID = parentTransform._worldID;

            // update the id of the transform..
            this._worldID ++;
        }
    }

    /**
     * Decomposes a matrix and sets the transforms properties based on it.
     *
     * @param {PIXI.Matrix} matrix - The matrix to decompose
     */
    setFromMatrix(matrix)
    {
        matrix.decompose(this);
        this._localID ++;
    }

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    get rotation()
    {
        return this._rotation;
    }

    set rotation(value) // eslint-disable-line require-jsdoc
    {
        this._rotation = value;
        this.updateSkew();
    }
}

/**
 * Updates the values of the object and applies the parent's transform.
 * @param  parentTransform {PIXI.Transform} The transform of the parent of this object
 *
 */
TransformBase.prototype.updateWorldTransform = TransformBase.prototype.updateTransform;

TransformBase.IDENTITY = new TransformBase();
