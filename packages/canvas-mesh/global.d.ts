declare namespace GlobalMixins
{
    interface Mesh
    {
        _renderCanvas(renderer: import('@pixi/canvas-renderer').CanvasRenderer): void;
        _canvasPadding: number;
        canvasPadding: number;
        _cachedTint: number;
        _tintedCanvas: import('@pixi/core').ICanvas;
        _cachedTexture: import('@pixi/core').Texture;
    }

    interface MeshMaterial
    {
        _renderCanvas(renderer: import('@pixi/canvas-renderer').CanvasRenderer, mesh: import('@pixi/mesh').Mesh): void;
    }

    interface NineSlicePlane
    {
        _cachedTint: number;
        _tintedCanvas: import('@pixi/core').ICanvas;
        _canvasUvs: number[];
    }
}
