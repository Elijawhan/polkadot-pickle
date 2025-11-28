import WebGLApplet from "./WebGLApplet.js";


class SpinningTriangle extends WebGLApplet {
    constructor() {
        super("./glsl/vertex.glsl", "./glsl/fragment.glsl")
    }

    initScene() {
        this.program = this.createProgram();
        this.vao = this.createTriangle();
        this.matrixLoc = this.gl.getUniformLocation(this.program, 'u_matrix');

        this.angle = 0;
        this.animationSpeed = 1.0;
        this.backgroundColor = [0.05, 0.05, 0.1, 1];
        super.initScene();
    }
    render() {
        this.angle += 0.01 * this.animationSpeed;

        const c = Math.cos(this.angle);
        const s = Math.sin(this.angle);
        const matrix = new Float32Array([
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        this.gl.clearColor(...this.backgroundColor);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.program);
        this.gl.bindVertexArray(this.vao);
        this.gl.uniformMatrix4fv(this.matrixLoc, false, matrix);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        super.render();
    }

    createTriangle() {
        const positions = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5]);
        const colors = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]);

        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);

        const posBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(0);
        this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);

        const colBuf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colBuf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(1);
        this.gl.vertexAttribPointer(1, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindVertexArray(null);
        return vao;
    }
}
export default SpinningTriangle;