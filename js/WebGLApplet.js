class WebGLApplet {
    constructor(vertexPath = "glsl/vertex.glsl", fragmentPath = "glsl/fragment.glsl", height = 1080, width = 1920) {
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        document.getElementById('loading')?.remove();

        this.offsetX = 0.0;
        this.offsetY = 0.0;
        this.zoom = 1.0;

        Object.assign(this.canvas.style, {
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000'
        });

        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) { alert('WebGL2 not supported by your browser.'); return; }

        this.resolutionHeight = height;
        this.resolutionWidth = width;

        this.loadShaders(vertexPath, fragmentPath).then(() => {
            this.program = this.createProgram();
            this.gl.useProgram(this.program);
            this.initScene();  // now safe
        });

        // Mouse controls
        this.setupControls();
    }

    async loadShaders(vp, fp) {
        const [vs, fs] = await Promise.all([
            fetch(vp).then(r => r.text()),
            fetch(fp).then(r => r.text())
        ]);
        this.vsSource = vs;
        this.fsSource = fs;
    }

    createShader(type, source) {
        const s = this.gl.createShader(type);
        this.gl.shaderSource(s, source);
        this.gl.compileShader(s);
        if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(s));
            this.gl.deleteShader(s);
            return null;
        }
        return s;
    }

    createProgram() {
        const p = this.gl.createProgram();
        this.gl.attachShader(p, this.createShader(this.gl.VERTEX_SHADER, this.vsSource));
        this.gl.attachShader(p, this.createShader(this.gl.FRAGMENT_SHADER, this.fsSource));
        this.gl.linkProgram(p);
        if (!this.gl.getProgramParameter(p, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(p));
            return null;
        }
        return p;
    }

    resize() {
        const w = this.resolutionWidth;
        const h = this.resolutionHeight;
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            this.gl.viewport(0, 0, w, h);
        }
    }

    initScene() { this.resize(); window.addEventListener('resize', () => this.resize()); requestAnimationFrame(() => this.render()); }
    render() { requestAnimationFrame(() => this.render()); }

    setupControls() {
        let dragging = false;
        let lastX = 0, lastY = 0;

        this.canvas.addEventListener("mousedown", e => {
            if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
                dragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });
        this.canvas.addEventListener("mousemove", e => {
            if (!dragging) return;
            this.offsetX += (e.clientX - lastX) / this.canvas.width * 4 / this.zoom;
            this.offsetY -= (e.clientY - lastY) / this.canvas.height * 4 / this.zoom;
            lastX = e.clientX; lastY = e.clientY;
        });
        this.canvas.addEventListener("mouseup", () => dragging = false);
        this.canvas.addEventListener("wheel", e => {
            e.preventDefault();
            this.zoom *= e.deltaY > 0 ? 1.1 : 0.9;
        });
    }
}

export default WebGLApplet;