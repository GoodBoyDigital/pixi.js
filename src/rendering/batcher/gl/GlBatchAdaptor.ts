import { ExtensionType } from '../../../extensions/Extensions';
import { State } from '../../renderers/shared/state/State';

import type { WebGLRenderer } from '../../renderers/gl/WebGLRenderer';
import type { Geometry } from '../../renderers/shared/geometry/Geometry';
import type { Shader } from '../../renderers/shared/shader/Shader';
import type { Batch } from '../shared/Batcher';
import type { BatcherAdaptor, BatcherPipe } from '../shared/BatcherPipe';

/**
 * A BatcherAdaptor that uses WebGL to render batches.
 * @memberof rendering
 * @ignore
 */
export class GlBatchAdaptor implements BatcherAdaptor
{
    /** @ignore */
    public static extension = {
        type: [
            ExtensionType.WebGLPipesAdaptor,
        ],
        name: 'batch',
    } as const;

    private readonly _didUploadSet: Set<Shader> = new Set();
    private readonly _tempState = State.for2d();

    public init(batcherPipe: BatcherPipe): void
    {
        batcherPipe.renderer.runners.contextChange.add(this);
    }

    public contextChange(): void
    {
        this._didUploadSet.clear();
    }

    public start(batchPipe: BatcherPipe, geometry: Geometry, shader: Shader): void
    {
        const renderer = batchPipe.renderer as WebGLRenderer;

        // only want to sync the shader on its first bind!
        renderer.shader.bind(shader, this._didUploadSet.has(shader));

        renderer.shader.updateUniformGroup(renderer.globalUniforms.uniformGroup);

        renderer.geometry.bind(geometry, shader.glProgram);
    }

    public execute(batchPipe: BatcherPipe, batch: Batch): void
    {
        const renderer = batchPipe.renderer as WebGLRenderer;

        this._didUploadSet.add(batch.batcher.shader);

        this._tempState.blendMode = batch.blendMode;

        renderer.state.set(this._tempState);

        const textures = batch.textures.textures;

        for (let i = 0; i < batch.textures.count; i++)
        {
            renderer.texture.bind(textures[i], i);
        }

        renderer.geometry.draw(batch.topology, batch.size, batch.start);
    }
}
