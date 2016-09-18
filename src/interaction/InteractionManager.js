import core from '../core';
import InteractionData from './InteractionData';
import EventEmitter from 'eventemitter3';
import interactiveTarget from './interactiveTarget';

// Mix interactiveTarget into core.DisplayObject.prototype
Object.assign(
    core.DisplayObject.prototype,
    interactiveTarget
);

/**
 * The interaction manager deals with mouse and touch events. Any DisplayObject can be interactive
 * if its interactive parameter is set to true
 * This manager also supports multitouch.
 *
 * @class
 * @extends EventEmitter
 * @memberof PIXI.interaction
 * @param renderer {PIXI.CanvasRenderer|PIXI.WebGLRenderer} A reference to the current renderer
 * @param [options] {object}
 * @param [options.autoPreventDefault=true] {boolean} Should the manager automatically prevent default browser actions.
 * @param [options.interactionFrequency=10] {number} Frequency increases the interaction events will be checked.
 */
class InteractionManager extends EventEmitter
{
    constructor(renderer, options)
    {
        super();

        options = options || {};

        /**
         * The renderer this interaction manager works for.
         *
         * @member {PIXI.SystemRenderer}
         */
        this.renderer = renderer;

        /**
         * Should default browser actions automatically be prevented.
         *
         * @member {boolean}
         * @default true
         */
        this.autoPreventDefault = options.autoPreventDefault !== undefined ? options.autoPreventDefault : true;

        /**
         * As this frequency increases the interaction events will be checked more often.
         *
         * @member {number}
         * @default 10
         */
        this.interactionFrequency = options.interactionFrequency || 10;

        /**
         * The mouse data
         *
         * @member {PIXI.interaction.InteractionData}
         */
        this.mouse = new InteractionData();

        // setting the pointer to start off far off screen will mean that mouse over does
        //  not get called before we even move the mouse.
        this.mouse.global.set(-999999);

        /**
         * An event data object to handle all the event tracking/dispatching
         *
         * @member {object}
         */
        this.eventData = {
            stopped: false,
            target: null,
            type: null,
            data: this.mouse,
            stopPropagation:function(){
                this.stopped = true;
            }
        };

        /**
         * Tiny little interactiveData pool !
         *
         * @member {PIXI.interaction.InteractionData[]}
         */
        this.interactiveDataPool = [];

        /**
         * The DOM element to bind to.
         *
         * @member {HTMLElement}
         * @private
         */
        this.interactionDOMElement = null;

        /**
         * This property determins if mousemove and touchmove events are fired only when the cursror is over the object
         * Setting to true will make things work more in line with how the DOM verison works.
         * Setting to false can make things easier for things like dragging
         * It is currently set to false as this is how pixi used to work. This will be set to true in future versions of pixi.
         * @member {boolean}
         * @private
         */
        this.moveWhenInside = false;

        /**
         * Have events been attached to the dom element?
         *
         * @member {boolean}
         * @private
         */
        this.eventsAdded = false;

        //this will make it so that you don't have to call bind all the time

        /**
         * @member {Function}
         * @private
         */
        this.onMouseUp = this.onMouseUp.bind(this);
        this.processMouseUp = this.processMouseUp.bind( this );


        /**
         * @member {Function}
         *  @private
         */
        this.onMouseDown = this.onMouseDown.bind(this);
        this.processMouseDown = this.processMouseDown.bind( this );

        /**
         * @member {Function}
         * @private
         */
        this.onMouseMove = this.onMouseMove.bind( this );
        this.processMouseMove = this.processMouseMove.bind( this );

        /**
         * @member {Function}
         * @private
         */
        this.onMouseOut = this.onMouseOut.bind(this);
        this.processMouseOverOut = this.processMouseOverOut.bind( this );

        /**
         * @member {Function}
         * @private
         */
        this.onMouseOver = this.onMouseOver.bind(this);


        /**
         * @member {Function}
         * @private
         */
        this.onTouchStart = this.onTouchStart.bind(this);
        this.processTouchStart = this.processTouchStart.bind(this);

        /**
         * @member {Function}
         * @private
         */
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.processTouchEnd = this.processTouchEnd.bind(this);

        /**
         * @member {Function}
         * @private
         */
        this.onTouchMove = this.onTouchMove.bind(this);
        this.processTouchMove = this.processTouchMove.bind(this);

        /**
         * Every update cursor will be reset to this value, if some element wont override it in its hitTest
         * @member {string}
         * @default 'inherit'
         */
        this.defaultCursorStyle = 'inherit';

        /**
         * The css style of the cursor that is being used
         * @member {string}
         */
        this.currentCursorStyle = 'inherit';

        /**
         * Internal cached let
         * @member {PIXI.Point}
         * @private
         */
        this._tempPoint = new core.Point();


        /**
         * The current resolution / device pixel ratio.
         * @member {number}
         * @default 1
         */
        this.resolution = 1;

        this.setTargetElement(this.renderer.view, this.renderer.resolution);

        /**
         * Fired when a pointing device button (usually a mouse button) is pressed on the display object.
         *
         * @memberof PIXI.interaction.InteractionManager#
         * @event mousedown
         */

        /**
         * Fired when a pointing device secondary button (usually a mouse right-button) is pressed on the display object.
         *
         * @memberof PIXI.interaction.InteractionManager#
         * @event rightdown
         */

        /**
         * Fired when a pointing device button (usually a mouse button) is released over the display object.
         *
         * @memberof PIXI.interaction.InteractionManager#
         * @event mouseup
         */

        /**
         * Fired when a pointing device secondary button (usually a mouse right-button) is released over the display object.
         *
         * @memberof PIXI.interaction.InteractionManager#
         * @event rightup
         */

        /**
         * Fired when a pointing device button (usually a mouse button) is pressed and released on the display object.
         *
         * @event click
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device secondary button (usually a mouse right-button) is pressed and released on the display object.
         *
         * @event rightclick
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device button (usually a mouse button) is released outside the display object that initially registered a [mousedown]{@link PIXI.interaction.InteractionManager#event:mousedown}.
         *
         * @event mouseupoutside
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device secondary button (usually a mouse right-button) is released outside the display object that initially
         * registered a [rightdown]{@link PIXI.interaction.InteractionManager#event:rightdown}.
         *
         * @event rightupoutside
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device (usually a mouse) is moved while over the display object
         *
         * @event mousemove
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device (usually a mouse) is moved onto the display object
         *
         * @event mouseover
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a pointing device (usually a mouse) is moved off the display object
         *
         * @event mouseout
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a touch point is placed on the display object.
         *
         * @event touchstart
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a touch point is removed from the display object.
         *
         * @event touchend
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a touch point is placed and removed from the display object.
         *
         * @event tap
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a touch point is removed outside of the display object that initially registered a [touchstart]{@link PIXI.interaction.InteractionManager#event:touchstart}.
         *
         * @event touchendoutside
         * @memberof PIXI.interaction.InteractionManager#
         */

        /**
         * Fired when a touch point is moved along the display object.
         *
         * @event touchmove
         * @memberof PIXI.interaction.InteractionManager#
         */
    }

    /**
     * Sets the DOM element which will receive mouse/touch events. This is useful for when you have
     * other DOM elements on top of the renderers Canvas element. With this you'll be bale to deletegate
     * another DOM element to receive those events.
     *
     * @param element {HTMLElement} the DOM element which will receive mouse and touch events.
     * @param [resolution=1] {number} The resolution / device pixel ratio of the new element (relative to the canvas).
     * @private
     */
    setTargetElement(element, resolution=1)
    {
        this.removeEvents();

        this.interactionDOMElement = element;

        this.resolution = resolution;

        this.addEvents();
    }

    /**
     * Registers all the DOM events
     *
     * @private
     */
    addEvents()
    {
        if (!this.interactionDOMElement)
        {
            return;
        }

        core.ticker.shared.add(this.update, this);

        if (window.navigator.msPointerEnabled)
        {
            this.interactionDOMElement.style['-ms-content-zooming'] = 'none';
            this.interactionDOMElement.style['-ms-touch-action'] = 'none';
        }

        window.document.addEventListener('mousemove',    this.onMouseMove, true);
        this.interactionDOMElement.addEventListener('mousedown',    this.onMouseDown, true);
        this.interactionDOMElement.addEventListener('mouseout',     this.onMouseOut, true);
        this.interactionDOMElement.addEventListener('mouseover',    this.onMouseOver, true);

        this.interactionDOMElement.addEventListener('touchstart',   this.onTouchStart, true);
        this.interactionDOMElement.addEventListener('touchend',     this.onTouchEnd, true);
        this.interactionDOMElement.addEventListener('touchmove',    this.onTouchMove, true);

        window.addEventListener('mouseup',  this.onMouseUp, true);

        this.eventsAdded = true;
    }

    /**
     * Removes all the DOM events that were previously registered
     *
     * @private
     */
    removeEvents()
    {
        if (!this.interactionDOMElement)
        {
            return;
        }

        core.ticker.shared.remove(this.update);

        if (window.navigator.msPointerEnabled)
        {
            this.interactionDOMElement.style['-ms-content-zooming'] = '';
            this.interactionDOMElement.style['-ms-touch-action'] = '';
        }

        window.document.removeEventListener('mousemove', this.onMouseMove, true);
        this.interactionDOMElement.removeEventListener('mousedown', this.onMouseDown, true);
        this.interactionDOMElement.removeEventListener('mouseout',  this.onMouseOut, true);
        this.interactionDOMElement.removeEventListener('mouseover', this.onMouseOver, true);

        this.interactionDOMElement.removeEventListener('touchstart', this.onTouchStart, true);
        this.interactionDOMElement.removeEventListener('touchend',  this.onTouchEnd, true);
        this.interactionDOMElement.removeEventListener('touchmove', this.onTouchMove, true);

        this.interactionDOMElement = null;

        window.removeEventListener('mouseup',  this.onMouseUp, true);

        this.eventsAdded = false;
    }

    /**
     * Updates the state of interactive objects.
     * Invoked by a throttled ticker update from
     * {@link PIXI.ticker.shared}.
     *
     * @param deltaTime {number} time delta since last tick
     */
    update(deltaTime)
    {
        this._deltaTime += deltaTime;

        if (this._deltaTime < this.interactionFrequency)
        {
            return;
        }

        this._deltaTime = 0;

        if (!this.interactionDOMElement)
        {
            return;
        }

        // if the user move the mouse this check has already been dfone using the mouse move!
        if(this.didMove)
        {
            this.didMove = false;
            return;
        }

        this.cursor = this.defaultCursorStyle;

        this.processInteractive(this.mouse.global, this.renderer._lastObjectRendered, this.processMouseOverOut, true );

        if (this.currentCursorStyle !== this.cursor)
        {
            this.currentCursorStyle = this.cursor;
            this.interactionDOMElement.style.cursor = this.cursor;
        }

        //TODO
    }

    /**
     * Dispatches an event on the display object that was interacted with
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} the display object in question
     * @param eventString {string} the name of the event (e.g, mousedown)
     * @param eventData {object} the event data object
     * @private
     */
    dispatchEvent( displayObject, eventString, eventData )
    {
        if(!eventData.stopped)
        {
            eventData.target = displayObject;
            eventData.type = eventString;

            displayObject.emit( eventString, eventData );

            if( displayObject[eventString] )
            {
                displayObject[eventString]( eventData );
            }
        }
    }

    /**
     * Maps x and y coords from a DOM object and maps them correctly to the pixi view. The resulting value is stored in the point.
     * This takes into account the fact that the DOM element could be scaled and positioned anywhere on the screen.
     *
     * @param  {PIXI.Point} point the point that the result will be stored in
     * @param  {number} x     the x coord of the position to map
     * @param  {number} y     the y coord of the position to map
     */
    mapPositionToPoint( point, x, y )
    {
        let rect;
        // IE 11 fix
        if(!this.interactionDOMElement.parentElement)
        {
            rect = { x: 0, y: 0, width: 0, height: 0 };
        } else {
            rect = this.interactionDOMElement.getBoundingClientRect();
        }

        point.x = ( ( x - rect.left ) * (this.interactionDOMElement.width  / rect.width  ) ) / this.resolution;
        point.y = ( ( y - rect.top  ) * (this.interactionDOMElement.height / rect.height ) ) / this.resolution;
    }

    /**
     * This function is provides a neat way of crawling through the scene graph and running a specified function on all interactive objects it finds.
     * It will also take care of hit testing the interactive objects and passes the hit across in the function.
     *
     * @param point {PIXI.Point} the point that is tested for collision
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} the displayObject that will be hit test (recurcsivly crawls its children)
     * @param [func] {Function} the function that will be called on each interactive object. The displayObject and hit will be passed to the function
     * @param [hitTest] {boolean} this indicates if the objects inside should be hit test against the point
     * @param [interactive] {boolean} Whether the displayObject is interactive
     * @return {boolean} returns true if the displayObject hit the point
     */
    processInteractive(point, displayObject, func, hitTest, interactive)
    {
        if(!displayObject || !displayObject.visible)
        {
            return false;
        }

        // Took a little while to rework this function correctly! But now it is done and nice and optimised. ^_^
        //
        // This function will now loop through all objects and then only hit test the objects it HAS to, not all of them. MUCH faster..
        // An object will be hit test if the following is true:
        //
        // 1: It is interactive.
        // 2: It belongs to a parent that is interactive AND one of the parents children have not already been hit.
        //
        // As another little optimisation once an interactive object has been hit we can carry on through the scenegraph, but we know that there will be no more hits! So we can avoid extra hit tests
        // A final optimisation is that an object is not hit test directly if a child has already been hit.

        interactive = displayObject.interactive || interactive;

        let hit = false,
            interactiveParent = interactive;

        // if the displayobject has a hitArea, then it does not need to hitTest children.
        if(displayObject.hitArea)
        {
            interactiveParent = false;
        }

        // it has a mask! Then lets hit test that before continuing..
        if(hitTest && displayObject._mask)
        {
            if(!displayObject._mask.containsPoint(point))
            {
                hitTest = false;
            }
        }

        // it has a filterArea! Same as mask but easier, its a rectangle
        if(hitTest && displayObject.filterArea)
        {
            if(!displayObject.filterArea.contains(point.x, point.y))
            {
                hitTest = false;
            }
        }

        // ** FREE TIP **! If an object is not interactive or has no buttons in it (such as a game scene!) set interactiveChildren to false for that displayObject.
        // This will allow pixi to completly ignore and bypass checking the displayObjects children.
        if(displayObject.interactiveChildren)
        {
            const children = displayObject.children;

            for (let i = children.length-1; i >= 0; i--)
            {
                let child = children[i];

                // time to get recursive.. if this function will return if somthing is hit..
                if(this.processInteractive(point, child, func, hitTest, interactiveParent))
                {
                    // its a good idea to check if a child has lost its parent.
                    // this means it has been removed whilst looping so its best
                    if(!child.parent)
                    {
                        continue;
                    }

                    hit = true;

                    // we no longer need to hit test any more objects in this container as we we now know the parent has been hit
                    interactiveParent = false;

                    // If the child is interactive , that means that the object hit was actually interactive and not just the child of an interactive object.
                    // This means we no longer need to hit test anything else. We still need to run through all objects, but we don't need to perform any hit tests.

                    //{
                    hitTest = false;
                    //}

                    // we can break now as we have hit an object.
                }
            }
        }



        // no point running this if the item is not interactive or does not have an interactive parent.
        if(interactive)
        {
            // if we are hit testing (as in we have no hit any objects yet)
            // We also don't need to worry about hit testing if once of the displayObjects children has already been hit!
            if(hitTest && !hit)
            {

                if(displayObject.hitArea)
                {
                    displayObject.worldTransform.applyInverse(point,  this._tempPoint);
                    hit = displayObject.hitArea.contains( this._tempPoint.x, this._tempPoint.y );
                }
                else if(displayObject.containsPoint)
                {
                    hit = displayObject.containsPoint(point);
                }


            }

            if(displayObject.interactive)
            {
                func(displayObject, hit);
            }
        }

        return hit;

    }


    /**
     * Is called when the mouse button is pressed down on the renderer element
     *
     * @param event {Event} The DOM event of a mouse button being pressed down
     * @private
     */
    onMouseDown(event)
    {
        this.mouse.originalEvent = event;
        this.eventData.data = this.mouse;
        this.eventData.stopped = false;

        // Update internal mouse reference
        this.mapPositionToPoint( this.mouse.global, event.clientX, event.clientY);

        if (this.autoPreventDefault)
        {
            this.mouse.originalEvent.preventDefault();
        }

        this.processInteractive(this.mouse.global, this.renderer._lastObjectRendered, this.processMouseDown, true );

        let isRightButton = event.button === 2 || event.which === 3;
        this.emit(isRightButton ? 'rightdown' : 'mousedown', this.eventData);
    }

    /**
     * Processes the result of the mouse down check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the dispay object
     * @private
     */
    processMouseDown( displayObject, hit )
    {
        let e = this.mouse.originalEvent;

        let isRightButton = e.button === 2 || e.which === 3;

        if(hit)
        {
            displayObject[ isRightButton ? '_isRightDown' : '_isLeftDown' ] = true;
            this.dispatchEvent( displayObject, isRightButton ? 'rightdown' : 'mousedown', this.eventData );
        }
    }

    /**
     * Is called when the mouse button is released on the renderer element
     *
     * @param event {Event} The DOM event of a mouse button being released
     * @private
     */
    onMouseUp(event)
    {
        this.mouse.originalEvent = event;
        this.eventData.data = this.mouse;
        this.eventData.stopped = false;

        // Update internal mouse reference
        this.mapPositionToPoint( this.mouse.global, event.clientX, event.clientY);

        this.processInteractive(this.mouse.global, this.renderer._lastObjectRendered, this.processMouseUp, true );

        let isRightButton = event.button === 2 || event.which === 3;
        this.emit(isRightButton ? 'rightup' : 'mouseup', this.eventData);
    }

    /**
     * Processes the result of the mouse up check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processMouseUp( displayObject, hit )
    {
        const e = this.mouse.originalEvent;

        const isRightButton = e.button === 2 || e.which === 3;
        const isDown =  isRightButton ? '_isRightDown' : '_isLeftDown';

        if(hit)
        {
            this.dispatchEvent( displayObject, isRightButton ? 'rightup' : 'mouseup', this.eventData );

            if( displayObject[ isDown ] )
            {
                displayObject[ isDown ] = false;
                this.dispatchEvent( displayObject, isRightButton ? 'rightclick' : 'click', this.eventData );
            }
        }
        else
        {
            if( displayObject[ isDown ] )
            {
                displayObject[ isDown ] = false;
                this.dispatchEvent( displayObject, isRightButton ? 'rightupoutside' : 'mouseupoutside', this.eventData );
            }
        }
    }


    /**
     * Is called when the mouse moves across the renderer element
     *
     * @param event {Event} The DOM event of the mouse moving
     * @private
     */
    onMouseMove(event)
    {
        this.mouse.originalEvent = event;
        this.eventData.data = this.mouse;
        this.eventData.stopped = false;

        this.mapPositionToPoint( this.mouse.global, event.clientX, event.clientY);

        this.didMove = true;

        this.cursor = this.defaultCursorStyle;

        this.processInteractive(this.mouse.global, this.renderer._lastObjectRendered, this.processMouseMove, true );

        this.emit('mousemove', this.eventData);

        if (this.currentCursorStyle !== this.cursor)
        {
            this.currentCursorStyle = this.cursor;
            this.interactionDOMElement.style.cursor = this.cursor;
        }

        //TODO BUG for parents ineractive object (border order issue)
    }

    /**
     * Processes the result of the mouse move check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processMouseMove( displayObject, hit )
    {
        this.processMouseOverOut(displayObject, hit);

        // only display on mouse over
        if(!this.moveWhenInside || hit)
        {
            this.dispatchEvent( displayObject, 'mousemove', this.eventData);
        }
    }


    /**
     * Is called when the mouse is moved out of the renderer element
     *
     * @param event {Event} The DOM event of a mouse being moved out
     * @private
     */
    onMouseOut(event)
    {
        this.mouse.originalEvent = event;
        this.eventData.data = this.mouse;
        this.eventData.stopped = false;

        // Update internal mouse reference
        this.mapPositionToPoint( this.mouse.global, event.clientX, event.clientY);

        this.interactionDOMElement.style.cursor = this.defaultCursorStyle;

        // TODO optimize by not check EVERY TIME! maybe half as often? //
        this.mapPositionToPoint( this.mouse.global, event.clientX, event.clientY );

        this.processInteractive( this.mouse.global, this.renderer._lastObjectRendered, this.processMouseOverOut, false );

        this.emit('mouseout', this.eventData);
    }

    /**
     * Processes the result of the mouse over/out check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processMouseOverOut( displayObject, hit )
    {
        if(hit)
        {
            if(!displayObject._over)
            {
                displayObject._over = true;
                this.dispatchEvent( displayObject, 'mouseover', this.eventData );
            }

            if (displayObject.buttonMode)
            {
                this.cursor = displayObject.defaultCursor;
            }
        }
        else
        {
            if(displayObject._over)
            {
                displayObject._over = false;
                this.dispatchEvent( displayObject, 'mouseout', this.eventData);
            }
        }
    }

    /**
     * Is called when the mouse enters the renderer element area
     *
     * @param event {Event} The DOM event of the mouse moving into the renderer view
     * @private
     */
    onMouseOver(event)
    {
        this.mouse.originalEvent = event;
        this.eventData.data = this.mouse;
        this.eventData.stopped = false;

        this.emit('mouseover', this.eventData);
    }


    /**
     * Is called when a touch is started on the renderer element
     *
     * @param event {Event} The DOM event of a touch starting on the renderer view
     * @private
     */
    onTouchStart(event)
    {
        if (this.autoPreventDefault)
        {
            event.preventDefault();
        }

        const changedTouches = event.changedTouches;
        const cLength = changedTouches.length;

        for (let i=0; i < cLength; i++)
        {
            const touchEvent = changedTouches[i];
            //TODO POOL
            const touchData = this.getTouchData( touchEvent );

            touchData.originalEvent = event;

            this.eventData.data = touchData;
            this.eventData.stopped = false;

            this.processInteractive( touchData.global, this.renderer._lastObjectRendered, this.processTouchStart, true );

            this.emit('touchstart', this.eventData);

            this.returnTouchData( touchData );
        }
    }

    /**
     * Processes the result of a touch check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processTouchStart( displayObject, hit )
    {
        if(hit)
        {
            displayObject._touchDown = true;
            this.dispatchEvent( displayObject, 'touchstart', this.eventData );
        }
    }


    /**
     * Is called when a touch ends on the renderer element
     *
     * @param event {Event} The DOM event of a touch ending on the renderer view
     * @private
     */
    onTouchEnd(event)
    {
        if (this.autoPreventDefault)
        {
            event.preventDefault();
        }

        const changedTouches = event.changedTouches;
        const cLength = changedTouches.length;

        for (let i=0; i < cLength; i++)
        {
            const touchEvent = changedTouches[i];

            const touchData = this.getTouchData( touchEvent );

            touchData.originalEvent = event;

            //TODO this should be passed along.. no set
            this.eventData.data = touchData;
            this.eventData.stopped = false;


            this.processInteractive( touchData.global, this.renderer._lastObjectRendered, this.processTouchEnd, true );

            this.emit('touchend', this.eventData);

            this.returnTouchData( touchData );
        }
    }

    /**
     * Processes the result of the end of a touch and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processTouchEnd( displayObject, hit )
    {
        if(hit)
        {
            this.dispatchEvent( displayObject, 'touchend', this.eventData );

            if( displayObject._touchDown )
            {
                displayObject._touchDown = false;
                this.dispatchEvent( displayObject, 'tap', this.eventData );
            }
        }
        else
        {
            if( displayObject._touchDown )
            {
                displayObject._touchDown = false;
                this.dispatchEvent( displayObject, 'touchendoutside', this.eventData );
            }
        }
    }

    /**
     * Is called when a touch is moved across the renderer element
     *
     * @param event {Event} The DOM event of a touch moving across the renderer view
     * @private
     */
    onTouchMove(event)
    {
        if (this.autoPreventDefault)
        {
            event.preventDefault();
        }

        const changedTouches = event.changedTouches;
        const cLength = changedTouches.length;

        for (let i=0; i < cLength; i++)
        {
            const touchEvent = changedTouches[i];

            const touchData = this.getTouchData( touchEvent );

            touchData.originalEvent = event;

            this.eventData.data = touchData;
            this.eventData.stopped = false;

            this.processInteractive( touchData.global, this.renderer._lastObjectRendered, this.processTouchMove, this.moveWhenInside );

            this.emit('touchmove', this.eventData);

            this.returnTouchData( touchData );
        }
    }

    /**
     * Processes the result of a touch move check and dispatches the event if need be
     *
     * @param displayObject {PIXI.Container|PIXI.Sprite|PIXI.extras.TilingSprite} The display object that was tested
     * @param hit {boolean} the result of the hit test on the display object
     * @private
     */
    processTouchMove( displayObject, hit )
    {
        if(!this.moveWhenInside || hit)
        {
            this.dispatchEvent( displayObject, 'touchmove', this.eventData);
        }
    }

    /**
     * Grabs an interaction data object from the internal pool
     *
     * @param touchEvent {object} The touch event we need to pair with an interactionData object
     *
     * @private
     */
    getTouchData(touchEvent)
    {
        const touchData = this.interactiveDataPool.pop() || new InteractionData();

        touchData.identifier = touchEvent.identifier;
        this.mapPositionToPoint( touchData.global, touchEvent.clientX, touchEvent.clientY );

        if(navigator.isCocoonJS)
        {
            touchData.global.x = touchData.global.x / this.resolution;
            touchData.global.y = touchData.global.y / this.resolution;
        }

        touchEvent.globalX = touchData.global.x;
        touchEvent.globalY = touchData.global.y;

        return touchData;
    }

    /**
     * Returns an interaction data object to the internal pool
     *
     * @param touchData {PIXI.interaction.InteractionData} The touch data object we want to return to the pool
     *
     * @private
     */
    returnTouchData( touchData )
    {
        this.interactiveDataPool.push( touchData );
    }

    /**
     * Destroys the interaction manager
     *
     */
    destroy() {
        this.removeEvents();

        this.removeAllListeners();

        this.renderer = null;

        this.mouse = null;

        this.eventData = null;

        this.interactiveDataPool = null;

        this.interactionDOMElement = null;

        this.onMouseUp = null;
        this.processMouseUp = null;


        this.onMouseDown = null;
        this.processMouseDown = null;

        this.onMouseMove = null;
        this.processMouseMove = null;

        this.onMouseOut = null;
        this.processMouseOverOut = null;

        this.onMouseOver = null;

        this.onTouchStart = null;
        this.processTouchStart = null;

        this.onTouchEnd = null;
        this.processTouchEnd = null;

        this.onTouchMove = null;
        this.processTouchMove = null;

        this._tempPoint = null;
    }
}

core.WebGLRenderer.registerPlugin('interaction', InteractionManager);
core.CanvasRenderer.registerPlugin('interaction', InteractionManager);

export default InteractionManager;
