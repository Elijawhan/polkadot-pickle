class RenderedObject {
    constructor(app, mode) {
        this.app = app;           // reference to Space2d
        this.gl  = app.gl;
        this.uniforms = app.uniforms;  // shortcut to cached locations
        this.mode = mode;         // 0, 1, 2, 3, …
    }

    draw() {
        this.gl.uniform1i(this.uniforms.mode, this.mode);
        // subclasses override the rest
    }
}
export default RenderedObject;