import { ALPHA_MODES } from '@pixi/constants';

let promise: Promise<ALPHA_MODES> | undefined;

/**
 * Helper for detecting the correct alpha mode for video textures.
 * For some reason, some browsers/devices/WebGL implementations premultiply the alpha
 * of a video before and then a second time if `UNPACK_PREMULTIPLY_ALPHA_WEBGL`
 * is true. So the video is premultiplied twice if the alpha mode is `UNPACK`.
 * In this case we need the alpha mode to be `PMA`. This function detects
 * the upload behavior by uploading a white 2x2 webm with 50% alpha
 * without `UNPACK_PREMULTIPLY_ALPHA_WEBGL` and then checking whether
 * the uploaded pixels are premultiplied.
 * @memberof PIXI.utils
 * @function detectVideoAlphaMode
 * @returns {Promise<PIXI.ALPHA_MODES>} The correct alpha mode for video textures.
 */
export function detectVideoAlphaMode(): Promise<ALPHA_MODES>
{
    promise ??= (async () =>
    {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');

        if (!gl)
        {
            return ALPHA_MODES.UNPACK;
        }

        function loadVideo(src: string): Promise<HTMLVideoElement | null>
        {
            return new Promise<HTMLVideoElement | null>((resolve) =>
            {
                const video = document.createElement('video');

                video.onerror = () => resolve(null);
                video.autoplay = false;
                video.crossOrigin = 'anonymous';
                video.preload = 'auto';
                video.src = src;
                video.load();

                function wait()
                {
                    if (video.readyState <= 1)
                    {
                        setTimeout(wait, 1);
                    }
                    else
                    {
                        resolve(video);
                    }
                }

                wait();
            });
        }

        let video: HTMLVideoElement | null = null;

        for (const src of [
            // WebM VP9
            // eslint-disable-next-line max-len
            'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIOEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEnTbuMU6uEHFO7a1OsggH47AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjAuNC4xMDBXQYxMYXZmNjAuNC4xMDBEiYhARAAAAAAAABZUrmvMrgEAAAAAAABD14EBc8WIUzy3iLLKnmKcgQAitZyDdW5kiIEAhoVWX1ZQOYOBASPjg4QCYloA4JSwgQK6gQKagQJTwIEBVbCEVbmBARJUw2dAf3Nzn2PAgGfImUWjh0VOQ09ERVJEh4xMYXZmNjAuNC4xMDBzc9pjwItjxYhTPLeIssqeYmfIpEWjh0VOQ09ERVJEh5dMYXZjNjAuNi4xMDAgbGlidnB4LXZwOWfIokWjiERVUkFUSU9ORIeUMDA6MDA6MDAuMDQwMDAwMDAwAAAfQ7Z1x+eBAKDCoaCBAAAAgkmDQgAAEAAWADgkHBhKAAAgIAARv///iv4AAHWhnaab7oEBpZaCSYNCAAAQABYAOCQcGEoAACAgAEhAHFO7a5G7j7OBALeK94EB8YIBrPCBAw==',
            // WebM VP8
            // eslint-disable-next-line max-len
            'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAHrEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHGTbuMU6uEElTDZ1OsggEXTbuMU6uEHFO7a1OsggHV7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmoCrXsYMPQkBNgIRMYXZmV0GETGF2ZkSJiEBEAAAAAAAAFlSua8yuAQAAAAAAAEPXgQFzxYgAAAAAAAAAAZyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhAJiWgDglLCBArqBApqBAlPAgQFVsIRVuYEBElTDZ+Vzc+JjwItjxYgAAAAAAAAAAWfIkUWjikFMUEhBX01PREVEh4ExZ8iYRaOHRU5DT0RFUkSHi0xhdmMgbGlidnB4Z8iiRaOIRFVSQVRJT05Eh5QwMDowMDowMC4wNDAwMDAwMDAAAB9DtnXP54EAoMqho4EAAAAQAgCdASoCAAIAAEcIhYWIhYSIAgIADA1gAP7/o94AdaGipqDugQGlmxACAJ0BKgIAAgAARwiFhYiFhIgCAgAGGvwAABxTu2uRu4+zgQC3iveBAfGCAYHwgQM=',
        ])
        {
            video = await loadVideo(src);

            if (video)
            {
                break;
            }
        }

        if (!video)
        {
            return ALPHA_MODES.UNPACK;
        }

        const texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, texture);

        const framebuffer = gl.createFramebuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        const pixel = new Uint8Array(4);

        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        gl.deleteFramebuffer(framebuffer);
        gl.deleteTexture(texture);
        gl.getExtension('WEBGL_lose_context')?.loseContext();

        return pixel[0] <= pixel[3] ? ALPHA_MODES.PMA : ALPHA_MODES.UNPACK;
    })();

    return promise;
}
