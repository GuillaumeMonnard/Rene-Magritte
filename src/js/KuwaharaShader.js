// Kuwahara anisotrope — le kernel tourne selon le gradient local
// RADIUS : taille du pinceau (2–8)
// ANISOTROPY : élongation du coup de pinceau (1 = rond, 3 = très directionnel)
const KuwaharaShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: [1920, 1080] },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    #define RADIUS 6
    #define ANISOTROPY 4.0

    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;

    vec3 s(vec2 uv) { return texture2D(tDiffuse, uv).rgb; }

    void main() {
      vec2 t = 1.0 / resolution;

      // Gradient Sobel — direction locale des contours
      vec3 gx =
        -s(vUv + vec2(-1,-1)*t) - 2.0*s(vUv + vec2(-1, 0)*t) - s(vUv + vec2(-1, 1)*t)
        +s(vUv + vec2( 1,-1)*t) + 2.0*s(vUv + vec2( 1, 0)*t) + s(vUv + vec2( 1, 1)*t);
      vec3 gy =
        -s(vUv + vec2(-1,-1)*t) - 2.0*s(vUv + vec2( 0,-1)*t) - s(vUv + vec2( 1,-1)*t)
        +s(vUv + vec2(-1, 1)*t) + 2.0*s(vUv + vec2( 0, 1)*t) + s(vUv + vec2( 1, 1)*t);

      float lum = vec3(0.299, 0.587, 0.114).x; // évite dot() en GLSL ES
      float gxL = dot(gx, vec3(0.299, 0.587, 0.114));
      float gyL = dot(gy, vec3(0.299, 0.587, 0.114));

      // Angle du gradient → rotation du kernel
      float angle = atan(gyL, gxL);
      float ca = cos(angle);
      float sa = sin(angle);

      float n = float((RADIUS + 1) * (RADIUS + 1));
      vec3 m0=vec3(0), m1=vec3(0), m2=vec3(0), m3=vec3(0);
      vec3 s0=vec3(0), s1=vec3(0), s2=vec3(0), s3=vec3(0);
      vec3 c;

      // Quadrant haut-gauche
      for (int j = -RADIUS; j <= 0; j++) {
        for (int i = -RADIUS; i <= 0; i++) {
          vec2 off = vec2(ca*float(i) - sa*float(j)*ANISOTROPY,
                          sa*float(i) + ca*float(j)*ANISOTROPY) * t;
          c = s(vUv + off); m0 += c; s0 += c*c;
        }
      }
      // Quadrant haut-droite
      for (int j = -RADIUS; j <= 0; j++) {
        for (int i = 0; i <= RADIUS; i++) {
          vec2 off = vec2(ca*float(i) - sa*float(j)*ANISOTROPY,
                          sa*float(i) + ca*float(j)*ANISOTROPY) * t;
          c = s(vUv + off); m1 += c; s1 += c*c;
        }
      }
      // Quadrant bas-droite
      for (int j = 0; j <= RADIUS; j++) {
        for (int i = 0; i <= RADIUS; i++) {
          vec2 off = vec2(ca*float(i) - sa*float(j)*ANISOTROPY,
                          sa*float(i) + ca*float(j)*ANISOTROPY) * t;
          c = s(vUv + off); m2 += c; s2 += c*c;
        }
      }
      // Quadrant bas-gauche
      for (int j = 0; j <= RADIUS; j++) {
        for (int i = -RADIUS; i <= 0; i++) {
          vec2 off = vec2(ca*float(i) - sa*float(j)*ANISOTROPY,
                          sa*float(i) + ca*float(j)*ANISOTROPY) * t;
          c = s(vUv + off); m3 += c; s3 += c*c;
        }
      }

      float minSigma = 1e10;
      vec3 result = vec3(0.0);

      m0 /= n; s0 = abs(s0/n - m0*m0);
      float sig0 = s0.r + s0.g + s0.b;
      if (sig0 < minSigma) { minSigma = sig0; result = m0; }

      m1 /= n; s1 = abs(s1/n - m1*m1);
      float sig1 = s1.r + s1.g + s1.b;
      if (sig1 < minSigma) { minSigma = sig1; result = m1; }

      m2 /= n; s2 = abs(s2/n - m2*m2);
      float sig2 = s2.r + s2.g + s2.b;
      if (sig2 < minSigma) { minSigma = sig2; result = m2; }

      m3 /= n; s3 = abs(s3/n - m3*m3);
      float sig3 = s3.r + s3.g + s3.b;
      if (sig3 < minSigma) { minSigma = sig3; result = m3; }

      gl_FragColor = vec4(result, 1.0);
    }
  `,
};

export { KuwaharaShader };
