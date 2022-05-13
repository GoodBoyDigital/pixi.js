/**
 * WebGL internal formats, including compressed texture formats provided by extensions
 *
 * @memberof PIXI
 * @static
 * @name INTERNAL_FORMATS
 * @enum {number}
 * @property {number} COMPRESSED_RGB_S3TC_DXT1_EXT=0x83F0
 * @property {number} COMPRESSED_RGBA_S3TC_DXT1_EXT=0x83F1
 * @property {number} COMPRESSED_RGBA_S3TC_DXT3_EXT=0x83F2
 * @property {number} COMPRESSED_RGBA_S3TC_DXT5_EXT=0x83F3
 * @property {number} COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT=35917
 * @property {number} COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT=35918
 * @property {number} COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT=35919
 * @property {number} COMPRESSED_SRGB_S3TC_DXT1_EXT=35916
 * @property {number} COMPRESSED_R11_EAC=0x9270
 * @property {number} COMPRESSED_SIGNED_R11_EAC=0x9271
 * @property {number} COMPRESSED_RG11_EAC=0x9272
 * @property {number} COMPRESSED_SIGNED_RG11_EAC=0x9273
 * @property {number} COMPRESSED_RGB8_ETC2=0x9274
 * @property {number} COMPRESSED_RGBA8_ETC2_EAC=0x9278
 * @property {number} COMPRESSED_SRGB8_ETC2=0x9275
 * @property {number} COMPRESSED_SRGB8_ALPHA8_ETC2_EAC=0x9279
 * @property {number} COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2=0x9276
 * @property {number} COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2=0x9277
 * @property {number} COMPRESSED_RGB_PVRTC_4BPPV1_IMG=0x8C00
 * @property {number} COMPRESSED_RGBA_PVRTC_4BPPV1_IMG=0x8C02
 * @property {number} COMPRESSED_RGB_PVRTC_2BPPV1_IMG=0x8C01
 * @property {number} COMPRESSED_RGBA_PVRTC_2BPPV1_IMG=0x8C03
 * @property {number} COMPRESSED_RGB_ETC1_WEBGL=0x8D64
 * @property {number} COMPRESSED_RGB_ATC_WEBGL=0x8C92
 * @property {number} COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL=0x8C92
 * @property {number} COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL=0x87EE
 */
export enum INTERNAL_FORMATS
    {
    // WEBGL_compressed_texture_s3tc
    COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0,
    COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1,
    COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2,
    COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3,

    // WEBGL_compressed_texture_s3tc_srgb
    COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = 35917,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT = 35918,
    COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = 35919,
    COMPRESSED_SRGB_S3TC_DXT1_EXT = 35916,

    // WEBGL_compressed_texture_etc
    COMPRESSED_R11_EAC = 0x9270,
    COMPRESSED_SIGNED_R11_EAC = 0x9271,
    COMPRESSED_RG11_EAC = 0x9272,
    COMPRESSED_SIGNED_RG11_EAC = 0x9273,
    COMPRESSED_RGB8_ETC2 = 0x9274,
    COMPRESSED_RGBA8_ETC2_EAC = 0x9278,
    COMPRESSED_SRGB8_ETC2 = 0x9275,
    COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = 0x9279,
    COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9276,
    COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9277,

    // WEBGL_compressed_texture_pvrtc
    COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00,
    COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02,
    COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8C01,
    COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8C03,

    // WEBGL_compressed_texture_etc1
    COMPRESSED_RGB_ETC1_WEBGL = 0x8D64,

    // WEBGL_compressed_texture_atc
    COMPRESSED_RGB_ATC_WEBGL = 0x8C92,
    COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8C92, // TODO: Probably a bug on the MDN site
    COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87EE,
}

/**
 * Maps the compressed texture formats in {@link PIXI.INTERNAL_FORMATS} to the number of bytes taken by
 * each texel.
 *
 * @memberof PIXI
 * @static
 * @ignore
 */
export const INTERNAL_FORMAT_TO_BYTES_PER_PIXEL: { [id: number]: number } = {
    // WEBGL_compressed_texture_s3tc
    [INTERNAL_FORMATS.COMPRESSED_RGB_S3TC_DXT1_EXT]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_S3TC_DXT1_EXT]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_S3TC_DXT3_EXT]: 1,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_S3TC_DXT5_EXT]: 1,

    // WEBGL_compressed_texture_s3tc
    [INTERNAL_FORMATS.COMPRESSED_SRGB_S3TC_DXT1_EXT]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT]: 1,
    [INTERNAL_FORMATS.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT]: 1,

    // WEBGL_compressed_texture_etc
    [INTERNAL_FORMATS.COMPRESSED_R11_EAC]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_SIGNED_R11_EAC]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RG11_EAC]: 1,
    [INTERNAL_FORMATS.COMPRESSED_SIGNED_RG11_EAC]: 1,
    [INTERNAL_FORMATS.COMPRESSED_RGB8_ETC2]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGBA8_ETC2_EAC]: 1,
    [INTERNAL_FORMATS.COMPRESSED_SRGB8_ETC2]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC]: 1,
    [INTERNAL_FORMATS.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2]: 0.5, // ~~
    [INTERNAL_FORMATS.COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2]: 0.5, // ~~

    // WEBGL_compressed_texture_pvrtc
    [INTERNAL_FORMATS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGB_PVRTC_2BPPV1_IMG]: 0.25,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG]: 0.25,

    // WEBGL_compressed_texture_etc1
    [INTERNAL_FORMATS.COMPRESSED_RGB_ETC1_WEBGL]: 0.5,

    // @see https://www.khronos.org/registry/OpenGL/extensions/AMD/AMD_compressed_ATC_texture.txt
    // WEBGL_compressed_texture_atc
    [INTERNAL_FORMATS.COMPRESSED_RGB_ATC_WEBGL]: 0.5,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL]: 1,
    [INTERNAL_FORMATS.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL]: 1
};
