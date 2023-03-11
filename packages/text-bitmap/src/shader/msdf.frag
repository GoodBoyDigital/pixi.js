// Pixi texture info
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

// Tint
uniform vec4 uColor;

// on 2D applications fwidth is screenScale / glyphAtlasScale * distanceFieldRange
uniform float uFWidth;

void main(void) {

  // To stack MSDF and SDF we need a non-pre-multiplied-alpha texture.
  vec4 texColor = texture2D(uSampler, vTextureCoord);

  // MSDF
  float median = texColor.r + texColor.g + texColor.b -
                  min(texColor.r, min(texColor.g, texColor.b)) -
                  max(texColor.r, max(texColor.g, texColor.b));
  // SDF
  median = min(median, texColor.a);

  float screenPxDistance = uFWidth * (median - 0.5);
  float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
  if (median < 0.01) {
    alpha = 0.0;
  } else if (median > 0.99) {
    alpha = 1.0;
  }

  // Gamma correction for coverage-like alpha
  float luma = dot(uColor.rgb, vec3(0.299, 0.587, 0.114));
  float gamma = mix(1.0, 1.0/2.2, luma);
  float coverage = pow(uColor.a * alpha, gamma);  

  // NPM Textures, NPM outputs
  gl_FragColor = vec4(uColor.rgb, coverage);
}
