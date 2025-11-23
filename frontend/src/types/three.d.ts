declare module 'three' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const THREE: any;
  export = THREE;
  export as namespace THREE;
}

declare global {
  namespace THREE {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const WebGLRenderer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ShaderMaterial: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BufferGeometry: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Color: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Vector2: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Vector3: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const MathUtils: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Scene: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OrthographicCamera: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Mesh: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PlaneGeometry: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRGBColorSpace: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NoToneMapping: any;
  }
}
