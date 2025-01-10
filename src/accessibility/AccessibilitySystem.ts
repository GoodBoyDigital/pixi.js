import { FederatedEvent } from '../events/FederatedEvent';
import { ExtensionType } from '../extensions/Extensions';
import { isMobile } from '../utils/browser/isMobile';
import { removeItems } from '../utils/data/removeItems';
import { type AccessibleHTMLElement } from './accessibilityTarget';

import type { Rectangle } from '../maths/shapes/Rectangle';
import type { System } from '../rendering/renderers/shared/system/System';
import type { Renderer } from '../rendering/renderers/types';
import type { Container } from '../scene/container/Container';
import type { isMobileResult } from '../utils/browser/isMobile';

/**
 * The accessibility module provides screen reader and keyboard navigation support for PixiJS content.
 * This is very important as it can possibly help people with disabilities access PixiJS content.
 *
 * This module is a mixin for {@link AbstractRenderer} and needs to be imported if managing your own renderer:
 * ```js
 * import 'pixi.js/accessibility';
 * ```
 *
 * Make objects accessible by setting their properties:
 * ```js
 * container.accessible = true;        // Enable accessibility for this container
 * container.accessibleType = 'button' // Type of DOM element to create (default: 'button')
 * container.accessibleTitle = 'Play'  // Optional: Add screen reader labels
 * ```
 *
 * By default, the accessibility system activates when users press the tab key. For cases where
 * you need control over when accessibility features are active, configuration options are available:
 * ```js
 * const app = new Application({
 *     accessibilityOptions: {
 *         enabledByDefault: true,    // Create accessibility elements immediately
 *         activateOnTab: false,      // Prevent tab key activation
 *         debug: false,               // Show accessibility divs
 *         deactivateOnMouseMove: false, // Prevent accessibility from being deactivated when mouse moves
 *     }
 * });
 * ```
 *
 * The system can also be controlled programmatically:
 * ```js
 * app.renderer.accessibility.setAccessibilityEnabled(true);
 * ```
 *
 * See {@link accessibility.AccessibleOptions} for all configuration options.
 * @namespace accessibility
 */

/** @ignore */
const KEY_CODE_TAB = 9;

const DIV_TOUCH_SIZE = 100;
const DIV_TOUCH_POS_X = 0;
const DIV_TOUCH_POS_Y = 0;
const DIV_TOUCH_ZINDEX = 2;

const DIV_HOOK_SIZE = 1;
const DIV_HOOK_POS_X = -1000;
const DIV_HOOK_POS_Y = -1000;
const DIV_HOOK_ZINDEX = 2;

/** @ignore */
export interface AccessibilitySystemOptions
{
    accessibilityOptions?: AccessibilityOptions;
}

/** @ignore */
export interface AccessibilityOptions
{
    /** Whether to enable accessibility features on initialization instead of waiting for tab key */
    enabledByDefault?: boolean;
    /** Whether to visually show the accessibility divs for debugging */
    debug?: boolean;
    /** Whether to allow tab key press to activate accessibility features */
    activateOnTab?: boolean;
    /** Whether to deactivate accessibility when mouse moves */
    deactivateOnMouseMove?: boolean;
}

/**
 * The Accessibility system provides screen reader and keyboard navigation support for PixiJS content.
 * It creates an accessible DOM layer over the canvas that can be controlled programmatically or through user interaction.
 *
 * By default, the system activates when users press the tab key. This behavior can be customized through options:
 * ```js
 * const app = new Application({
 *     accessibilityOptions: {
 *         enabledByDefault: true,    // Enable immediately instead of waiting for tab
 *         activateOnTab: false,      // Disable tab key activation
 *         debug: false,               // Show/hide accessibility divs
 *         deactivateOnMouseMove: false, // Prevent accessibility from being deactivated when mouse moves
 *     }
 * });
 * ```
 *
 * The system can also be controlled programmatically:
 * ```js
 * app.renderer.accessibility.setAccessibilityEnabled(true);
 * ```
 *
 * To make individual containers accessible:
 * ```js
 * container.accessible = true;
 * ```
 *
 * An instance of this class is automatically created at `renderer.accessibility`
 * @memberof accessibility
 */
export class AccessibilitySystem implements System<AccessibilitySystemOptions>
{
    /** @ignore */
    public static extension = {
        type: [
            ExtensionType.WebGLSystem,
            ExtensionType.WebGPUSystem,
        ],
        name: 'accessibility',
    } as const;

    /** default options used by the system */
    public static defaultOptions: AccessibilitySystemOptions = {
        accessibilityOptions: {
            /**
             * Whether to enable accessibility features on initialization
             * @default false
             */
            enabledByDefault: false,
            /**
             * Whether to visually show the accessibility divs for debugging
             * @default false
             */
            debug: false,
            /**
             * Whether to activate accessibility when tab key is pressed
             * @default true
             */
            activateOnTab: true,
            /**
             * Whether to deactivate accessibility when mouse moves
             * @default true
             */
            deactivateOnMouseMove: true,
        },
    };

    /** Whether accessibility divs are visible for debugging */
    public debug = false;

    /** Whether to activate on tab key press */
    private _activateOnTab = true;

    /** Whether to deactivate accessibility when mouse moves */
    private _deactivateOnMouseMove = true;

    /**
     * The renderer this accessibility manager works for.
     * @type {WebGLRenderer|WebGPURenderer}
     */
    private _renderer: Renderer;

    /** Internal variable, see isActive getter. */
    private _isActive = false;

    /** Internal variable, see isMobileAccessibility getter. */
    private _isMobileAccessibility = false;

    /** Button element for handling touch hooks. */
    private _hookDiv: HTMLElement | null;

    /** This is the dom element that will sit over the PixiJS element. This is where the div overlays will go. */
    private _div: HTMLElement | null = null;

    /** A simple pool for storing divs. */
    private _pool: AccessibleHTMLElement[] = [];

    /** This is a tick used to check if an object is no longer being rendered. */
    private _renderId = 0;

    /** The array of currently active accessible items. */
    private _children: Container[] = [];

    /** Count to throttle div updates on android devices. */
    private _androidUpdateCount = 0;

    /**  The frequency to update the div elements. */
    private readonly _androidUpdateFrequency = 500; // 2fps

    // eslint-disable-next-line jsdoc/require-param
    /**
     * @param {WebGLRenderer|WebGPURenderer} renderer - A reference to the current renderer
     */
    constructor(renderer: Renderer, private readonly _mobileInfo: isMobileResult = isMobile)
    {
        this._hookDiv = null;

        if (_mobileInfo.tablet || _mobileInfo.phone)
        {
            this._createTouchHook();
        }

        this._renderer = renderer;
    }

    /**
     * Value of `true` if accessibility is currently active and accessibility layers are showing.
     * @member {boolean}
     * @readonly
     */
    get isActive(): boolean
    {
        return this._isActive;
    }

    /**
     * Value of `true` if accessibility is enabled for touch devices.
     * @member {boolean}
     * @readonly
     */
    get isMobileAccessibility(): boolean
    {
        return this._isMobileAccessibility;
    }

    get hookDiv()
    {
        return this._hookDiv;
    }

    /**
     * Creates the touch hooks.
     * @private
     */
    private _createTouchHook(): void
    {
        const hookDiv = document.createElement('button');

        hookDiv.style.width = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.height = `${DIV_HOOK_SIZE}px`;
        hookDiv.style.position = 'absolute';
        hookDiv.style.top = `${DIV_HOOK_POS_X}px`;
        hookDiv.style.left = `${DIV_HOOK_POS_Y}px`;
        hookDiv.style.zIndex = DIV_HOOK_ZINDEX.toString();
        hookDiv.style.backgroundColor = '#FF0000';
        hookDiv.title = 'select to enable accessibility for this content';

        hookDiv.addEventListener('focus', () =>
        {
            this._isMobileAccessibility = true;
            this._activate();
            this._destroyTouchHook();
        });

        document.body.appendChild(hookDiv);
        this._hookDiv = hookDiv;
    }

    /**
     * Destroys the touch hooks.
     * @private
     */
    private _destroyTouchHook(): void
    {
        if (!this._hookDiv)
        {
            return;
        }
        document.body.removeChild(this._hookDiv);
        this._hookDiv = null;
    }

    /**
     * Activating will cause the Accessibility layer to be shown.
     * This is called when a user presses the tab key.
     * @private
     */
    private _activate(): void
    {
        if (this._isActive)
        {
            return;
        }

        this._isActive = true;

        // Create and add div if needed
        if (!this._div)
        {
            this._div = document.createElement('div');
            this._div.style.width = `${DIV_TOUCH_SIZE}px`;
            this._div.style.height = `${DIV_TOUCH_SIZE}px`;
            this._div.style.position = 'absolute';
            this._div.style.top = `${DIV_TOUCH_POS_X}px`;
            this._div.style.left = `${DIV_TOUCH_POS_Y}px`;
            this._div.style.zIndex = DIV_TOUCH_ZINDEX.toString();
            this._div.style.pointerEvents = 'none';
        }

        // Bind event handlers and add listeners when activating
        if (this._activateOnTab)
        {
            this._onKeyDown = this._onKeyDown.bind(this);
            globalThis.addEventListener('keydown', this._onKeyDown, false);
        }

        if (this._deactivateOnMouseMove)
        {
            this._onMouseMove = this._onMouseMove.bind(this);
            globalThis.document.addEventListener('mousemove', this._onMouseMove, true);
        }

        // Check if canvas is in DOM
        const canvas = this._renderer.view.canvas;

        if (!canvas.parentNode)
        {
            const observer = new MutationObserver(() =>
            {
                if (canvas.parentNode)
                {
                    canvas.parentNode.appendChild(this._div);
                    observer.disconnect();

                    // Only start the postrender runner after div is ready
                    this._initAccessibilitySetup();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
        else
        {
            // Add to DOM
            canvas.parentNode.appendChild(this._div);

            // Div is ready, initialize accessibility
            this._initAccessibilitySetup();
        }
    }

    // New method to handle initialization after div is ready
    private _initAccessibilitySetup(): void
    {
        // Add the postrender runner to start processing accessible objects
        this._renderer.runners.postrender.add(this);

        // Force an initial update of accessible objects
        if (this._renderer.lastObjectRendered)
        {
            this._updateAccessibleObjects(this._renderer.lastObjectRendered as Container);
        }
    }

    /**
     * Deactivates the accessibility system. Removes listeners and accessibility elements.
     * @private
     */
    private _deactivate(): void
    {
        if (!this._isActive || this._isMobileAccessibility)
        {
            return;
        }

        this._isActive = false;

        // Switch listeners
        globalThis.document.removeEventListener('mousemove', this._onMouseMove, true);
        if (this._activateOnTab)
        {
            globalThis.addEventListener('keydown', this._onKeyDown, false);
        }

        this._renderer.runners.postrender.remove(this);

        // Remove all active accessibility elements
        for (const child of this._children)
        {
            if (child._accessibleDiv && child._accessibleDiv.parentNode)
            {
                child._accessibleDiv.parentNode.removeChild(child._accessibleDiv);
                child._accessibleDiv = null;
            }
            child._accessibleActive = false;
        }

        // Clear the pool of divs
        this._pool.forEach((div) =>
        {
            if (div.parentNode)
            {
                div.parentNode.removeChild(div);
            }
        });

        // Remove parent div from DOM
        if (this._div && this._div.parentNode)
        {
            this._div.parentNode.removeChild(this._div);
        }

        this._pool = [];
        this._children = [];
    }

    /**
     * This recursive function will run through the scene graph and add any new accessible objects to the DOM layer.
     * @private
     * @param {Container} container - The Container to check.
     */
    private _updateAccessibleObjects(container: Container): void
    {
        if (!container.visible || !container.accessibleChildren)
        {
            return;
        }

        // Separate check for accessibility without requiring interactivity
        if (container.accessible)
        {
            if (!container._accessibleActive)
            {
                this._addChild(container);
            }

            container._renderId = this._renderId;
        }

        const children = container.children;

        if (children)
        {
            for (let i = 0; i < children.length; i++)
            {
                this._updateAccessibleObjects(children[i] as Container);
            }
        }
    }

    /**
     * Runner init called, view is available at this point.
     * @ignore
     */
    public init(options?: AccessibilitySystemOptions): void
    {
        // Ensure we have the accessibilityOptions object
        const defaultOpts = AccessibilitySystem.defaultOptions;
        const mergedOptions = {
            accessibilityOptions: {
                ...defaultOpts.accessibilityOptions,
                ...(options?.accessibilityOptions || {})
            }
        };

        this.debug = mergedOptions.accessibilityOptions.debug;
        this._activateOnTab = mergedOptions.accessibilityOptions.activateOnTab;
        this._deactivateOnMouseMove = mergedOptions.accessibilityOptions.deactivateOnMouseMove;

        if (mergedOptions.accessibilityOptions.enabledByDefault)
        {
            this._activate();
        }
        else if (this._activateOnTab)
        {
            this._onKeyDown = this._onKeyDown.bind(this);
            globalThis.addEventListener('keydown', this._onKeyDown, false);
        }

        this._renderer.runners.postrender.remove(this);
    }

    /**
     * Updates the accessibility layer during rendering.
     * - Removes divs for containers no longer in the scene
     * - Updates the position and dimensions of the root div
     * - Updates positions of active accessibility divs
     * Only fires while the accessibility system is active.
     * @ignore
     */
    public postrender(): void
    {
        /* On Android default web browser, tab order seems to be calculated by position rather than tabIndex,
        *  moving buttons can cause focus to flicker between two buttons making it hard/impossible to navigate,
        *  so I am just running update every half a second, seems to fix it.
        */
        const now = performance.now();

        if (this._mobileInfo.android.device && now < this._androidUpdateCount)
        {
            return;
        }

        this._androidUpdateCount = now + this._androidUpdateFrequency;

        if (!this._renderer.renderingToScreen || !this._renderer.view.canvas)
        {
            return;
        }

        // Track which containers are still active this frame
        const activeIds = new Set<number>();

        if (this._renderer.lastObjectRendered)
        {
            this._updateAccessibleObjects(this._renderer.lastObjectRendered as Container);

            // Mark all updated containers as active
            for (const child of this._children)
            {
                if (child._renderId === this._renderId)
                {
                    activeIds.add(this._children.indexOf(child));
                }
            }
        }

        // Remove any containers that weren't updated this frame
        for (let i = this._children.length - 1; i >= 0; i--)
        {
            const child = this._children[i];

            if (!activeIds.has(i))
            {
                // Container was removed, clean up its accessibility div
                if (child._accessibleDiv && child._accessibleDiv.parentNode)
                {
                    child._accessibleDiv.parentNode.removeChild(child._accessibleDiv);

                    this._pool.push(child._accessibleDiv);
                    child._accessibleDiv = null;
                }
                child._accessibleActive = false;
                removeItems(this._children, i, 1);
            }
        }

        // Update root div dimensions if needed
        if (this._renderer.renderingToScreen)
        {
            const { x, y, width: viewWidth, height: viewHeight } = this._renderer.screen;
            const div = this._div;

            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.width = `${viewWidth}px`;
            div.style.height = `${viewHeight}px`;
        }

        // Update positions of existing divs
        for (let i = 0; i < this._children.length; i++)
        {
            const child = this._children[i];

            if (!child._accessibleActive || !child._accessibleDiv)
            {
                continue;
            }

            // Only update position-related properties
            const div = child._accessibleDiv;
            const hitArea = (child.hitArea || child.getBounds().rectangle) as Rectangle;

            if (child.hitArea)
            {
                const wt = child.worldTransform;
                const sx = this._renderer.resolution;
                const sy = this._renderer.resolution;

                div.style.left = `${(wt.tx + (hitArea.x * wt.a)) * sx}px`;
                div.style.top = `${(wt.ty + (hitArea.y * wt.d)) * sy}px`;
                div.style.width = `${hitArea.width * wt.a * sx}px`;
                div.style.height = `${hitArea.height * wt.d * sy}px`;
            }
            else
            {
                this._capHitArea(hitArea);
                const sx = this._renderer.resolution;
                const sy = this._renderer.resolution;

                div.style.left = `${hitArea.x * sx}px`;
                div.style.top = `${hitArea.y * sy}px`;
                div.style.width = `${hitArea.width * sx}px`;
                div.style.height = `${hitArea.height * sy}px`;
            }
        }

        // increment the render id..
        this._renderId++;
    }

    /**
     * private function that will visually add the information to the
     * accessibility div
     * @param {HTMLElement} div -
     */
    private _updateDebugHTML(div: AccessibleHTMLElement): void
    {
        div.innerHTML = `type: ${div.type}</br> title : ${div.title}</br> tabIndex: ${div.tabIndex}`;
    }

    /**
     * Adjust the hit area based on the bounds of a display object
     * @param {Rectangle} hitArea - Bounds of the child
     */
    private _capHitArea(hitArea: Rectangle): void
    {
        if (hitArea.x < 0)
        {
            hitArea.width += hitArea.x;
            hitArea.x = 0;
        }

        if (hitArea.y < 0)
        {
            hitArea.height += hitArea.y;
            hitArea.y = 0;
        }

        const { width: viewWidth, height: viewHeight } = this._renderer;

        if (hitArea.x + hitArea.width > viewWidth)
        {
            hitArea.width = viewWidth - hitArea.x;
        }

        if (hitArea.y + hitArea.height > viewHeight)
        {
            hitArea.height = viewHeight - hitArea.y;
        }
    }

    /**
     * Creates or reuses a div element for a Container and adds it to the accessibility layer.
     * Sets up ARIA attributes, event listeners, and positioning based on the container's properties.
     * @private
     * @param {Container} container - The child to make accessible.
     */
    private _addChild<T extends Container>(container: T): void
    {
        let div = this._pool.pop();

        if (!div)
        {
            if (container.accessibleType === 'button')
            {
                div = document.createElement('button');
            }
            else
            {
                div = document.createElement(container.accessibleType);
                div.style.cssText = `
                        color: transparent;
                        pointer-events: none;
                        padding: 0;
                        margin: 0;
                        border: 0;
                        outline: 0;
                        background: transparent;
                        box-sizing: border-box;
                        user-select: none;
                        -webkit-user-select: none;
                        -moz-user-select: none;
                        -ms-user-select: none;
                    `;
                if (container.accessibleText)
                {
                    div.innerText = container.accessibleText;
                }
            }
            div.style.width = `${DIV_TOUCH_SIZE}px`;
            div.style.height = `${DIV_TOUCH_SIZE}px`;
            div.style.backgroundColor = this.debug ? 'rgba(255,255,255,0.5)' : 'transparent';
            div.style.position = 'absolute';
            div.style.zIndex = DIV_TOUCH_ZINDEX.toString();
            div.style.borderStyle = 'none';

            // ARIA attributes ensure that button title and hint updates are announced properly
            if (navigator.userAgent.toLowerCase().includes('chrome'))
            {
                // Chrome doesn't need aria-live to work as intended; in fact it just gets more confused.
                div.setAttribute('aria-live', 'off');
            }
            else
            {
                div.setAttribute('aria-live', 'polite');
            }

            if (navigator.userAgent.match(/rv:.*Gecko\//))
            {
                // FireFox needs this to announce only the new button name
                div.setAttribute('aria-relevant', 'additions');
            }
            else
            {
                // required by IE, other browsers don't much care
                div.setAttribute('aria-relevant', 'text');
            }

            div.addEventListener('click', this._onClick.bind(this));
            div.addEventListener('focus', this._onFocus.bind(this));
            div.addEventListener('focusout', this._onFocusOut.bind(this));
        }

        // set pointer events
        div.style.pointerEvents = container.accessiblePointerEvents;
        // set the type, this defaults to button!
        div.type = container.accessibleType;

        if (container.accessibleTitle && container.accessibleTitle !== null)
        {
            div.title = container.accessibleTitle;
        }
        else if (!container.accessibleHint
            || container.accessibleHint === null)
        {
            div.title = `container ${container.tabIndex}`;
        }

        if (container.accessibleHint
            && container.accessibleHint !== null)
        {
            div.setAttribute('aria-label', container.accessibleHint);
        }

        if (this.debug)
        {
            this._updateDebugHTML(div);
        }

        container._accessibleActive = true;
        container._accessibleDiv = div;
        div.container = container;

        this._children.push(container);
        this._div.appendChild(container._accessibleDiv);
        if (container.interactive)
        {
            container._accessibleDiv.tabIndex = container.tabIndex;
        }
    }

    /**
     * Dispatch events with the EventSystem.
     * @param e
     * @param type
     * @private
     */
    private _dispatchEvent(e: UIEvent, type: string[]): void
    {
        const { container: target } = e.target as AccessibleHTMLElement;
        const boundary = this._renderer.events.rootBoundary;
        const event: FederatedEvent = Object.assign(new FederatedEvent(boundary), { target });

        boundary.rootTarget = this._renderer.lastObjectRendered as Container;
        type.forEach((type) => boundary.dispatchEvent(event, type));
    }

    /**
     * Maps the div button press to pixi's EventSystem (click)
     * @private
     * @param {MouseEvent} e - The click event.
     */
    private _onClick(e: MouseEvent): void
    {
        this._dispatchEvent(e, ['click', 'pointertap', 'tap']);
    }

    /**
     * Maps the div focus events to pixi's EventSystem (mouseover)
     * @private
     * @param {FocusEvent} e - The focus event.
     */
    private _onFocus(e: FocusEvent): void
    {
        if (!(e.target as Element).getAttribute('aria-live'))
        {
            (e.target as Element).setAttribute('aria-live', 'assertive');
        }

        this._dispatchEvent(e, ['mouseover']);
    }

    /**
     * Maps the div focus events to pixi's EventSystem (mouseout)
     * @private
     * @param {FocusEvent} e - The focusout event.
     */
    private _onFocusOut(e: FocusEvent): void
    {
        if (!(e.target as Element).getAttribute('aria-live'))
        {
            (e.target as Element).setAttribute('aria-live', 'polite');
        }

        this._dispatchEvent(e, ['mouseout']);
    }

    /**
     * Is called when a key is pressed
     * @private
     * @param {KeyboardEvent} e - The keydown event.
     */
    private _onKeyDown(e: KeyboardEvent): void
    {
        if (e.keyCode !== KEY_CODE_TAB || !this._activateOnTab)
        {
            return;
        }

        this._activate();
    }

    /**
     * Is called when the mouse moves across the renderer element
     * @private
     * @param {MouseEvent} e - The mouse event.
     */
    private _onMouseMove(e: MouseEvent): void
    {
        if (e.movementX === 0 && e.movementY === 0)
        {
            return;
        }

        this._deactivate();
    }

    /** Destroys the accessibility system. Removes all elements and listeners. */
    public destroy(): void
    {
        this._deactivate();
        this._destroyTouchHook();

        this._div = null;
        this._pool = null;
        this._children = null;
        this._renderer = null;

        if (this._activateOnTab)
        {
            globalThis.removeEventListener('keydown', this._onKeyDown);
        }
    }

    /**
     * Enables or disables the accessibility system.
     * @param enabled - Whether to enable or disable accessibility.
     */
    public setAccessibilityEnabled(enabled: boolean): void
    {
        if (enabled)
        {
            this._activate();
        }
        else
        {
            this._deactivate();
        }
    }
}
