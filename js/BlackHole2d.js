import WebGLApplet from "./WebGLApplet.js";
import RenderedObject from "./RenderedObject.js"

const c = 299792458.0;
const G = 6.67430e-11;

class BlackHole extends RenderedObject {
    constructor(app, position, mass) {
        super(app, 1)
        this.gl = app.gl;
        this.position = position;
        this.mass = mass;
        this.r_s = (2.0 * G * mass) / (c * c); // schwarschild radius: Will map to protospace

    }
    draw() {
        super.draw();
        const gl = this.gl;
        const u = this.uniforms;

        gl.uniform2f(u.center, this.position.x, this.position.y);
        gl.uniform1f(u.radius, this.r_s);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.bindVertexArray(this.app.circleVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disable(gl.BLEND);
    }

}
class BackgroundRenderer extends RenderedObject {
    constructor(app) { super(app, 0); }   // mode 0

    draw() {
        super.draw();
        this.gl.bindVertexArray(this.app.quadVAO);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
class Ray {
    constructor(pos, dir, blackHole, maxDistance = 200000000000.0, maxTrailLength=500) {
        this.x = pos.x;
        this.y = pos.y;
        this.blackHole = blackHole;
        this.alive = true;
        // Get Polar Coordinates
        this.r = Math.hypot(this.x, this.y);
        this.phi = Math.atan2(pos.y, pos.x);
        // Seed Velocities
        this.dr = dir.x * Math.cos(this.phi) + dir.y * Math.sin(this.phi);
        this.dphi = (- dir.x * Math.sin(this.phi) + dir.y * Math.cos(this.phi)) / this.r;
        // store conserved quantities
        this.L = this.r * this.r * this.dphi;
        const f = 1.0 - blackHole.r_s / this.r;
        const dt_dλ = Math.sqrt((this.dr * this.dr) / (f * f) + (this.r * this.r * this.dphi * this.dphi) / f);
        this.E = f * dt_dλ;
        // start a trail
        this.trail = [{ x: this.x, y: this.y }];
        this.maxTrailLength = maxTrailLength;
        this.maxDistance = maxDistance ;
    }
    step(dλ) {
        // ignore this point if it already was consumed
        if (!this.alive || this.r < this.blackHole.r_s || this.r > this.maxDistance) {
            if (this.trail.length) {
                this.trail.shift();
            }
            this.alive = false;
            return;
        }
        // Peform integration
        // (r,φ,dr,dφ)
        rk4Step(this, dλ);

        // convert to Cartesian Coordinates
        this.x = this.r * Math.cos(this.phi);
        this.y = this.r * Math.sin(this.phi);

        //record trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }
    clone() {
        let newClone = new Ray({ x: 0.0, y: 0.0 }, { x: 1.0, y: 1.0 }, this.blackHole);
        newClone.x = this.x;
        newClone.y = this.y;
        newClone.r = this.r;
        newClone.phi = this.phi;
        newClone.dr = this.dr;
        newClone.dphi = this.dphi;
        newClone.L = this.L;
        newClone.E = this.E;
        return newClone;
    }
}
class RayRenderer extends RenderedObject {
    constructor(app, blackHole) {
        super(app, 2);
        this.blackHole = blackHole;
        this.rays = [];

        // The one buffer to rule them all...
        this.trailBuffer = app.gl.createBuffer();
        this.createSharedTrailVAO();
    }
    spawnRay(pos, dir) {
        this.rays.push(new Ray(pos, dir, this.blackHole));
    }
    update(dλ = 10e7) {
        this.rays.forEach(r => r.step(dλ));
        this.rays = this.rays.filter(r => r.alive || r.trail.length > 0);
    }
    draw() {
        const gl = this.gl;
        const u = this.uniforms;

        // Coalessence of the points
        if (this.rays.length === 0) return;
        this.update();

        let numPoints = 0;
        const maxPoints = 2 << 20;
        const data = new Float32Array(maxPoints * 2); // double up because x AND y

        // populate ray buffer
        for (const ray of this.rays) {
            if (ray.trail.length < 2) continue;
            for (const p of ray.trail) {
                data[numPoints * 2] = p.x;
                data[numPoints * 2 + 1] = p.y;
                numPoints++;
                if (numPoints >= maxPoints) break;
            }
            if (numPoints >= maxPoints) break;
            data[numPoints*2] = Number.MAX_VALUE; // Restart line
            data[numPoints*2+1] = Number.MAX_VALUE; // Restart line
            numPoints++;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.trailBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, numPoints * 2), gl.DYNAMIC_DRAW);

        super.draw();
        gl.bindVertexArray(this.trailVAO);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.LINE_STRIP, 0, numPoints);
        gl.disable(gl.BLEND);

    }
    createSharedTrailVAO() {
        const vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.trailBuffer);
        const loc = this.gl.getAttribLocation(this.app.program, "a_position");
        this.gl.enableVertexAttribArray(loc);
        this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.bindVertexArray(null);
        this.trailVAO = vao;
    }
    setupRaySpawner() {
        this.app.canvas.addEventListener("click", (e) => {
            // console.log("Click with data: ", e);
            const clip_x = (e.clientX / this.app.canvas.clientWidth * 2) -1;
            const clip_y = (e.clientY / this.app.canvas.clientHeight * 2) -1;
            // console.log("Translated x, y :", clip_x, clip_y);
            const world_x = clip_x * this.app.worldWidth / this.app.zoom;
            const world_y = -1 * clip_y * this.app.worldHeight / this.app.zoom;

            const numRays = 100;
            for (let i = 0; i < numRays; i++) {
                const radians = (2 * Math.PI / numRays) * i;
                const dirX = Math.cos(radians);
                const dirY = Math.sin(radians);
                this.spawnRay({x:world_x, y:world_y},
                    {x: dirX, y: dirY}
                );
            }
        });
    }
}
function addState(a = [0, 0, 0, 0], b = [0, 0, 0, 0], factor = 0.5) {
    return a.map((el, i) => el + b[i] * factor);
}
function geodesicRHS(ray) {
    const f = 1.0 - (ray.blackHole.r_s / ray.r);
    const dt_dλ = ray.E / f;

    const RHS = [ray.dr, ray.dphi,
    - (ray.blackHole.r_s / (2 * ray.r * ray.r)) * f * (dt_dλ * dt_dλ)
    + (ray.blackHole.r_s / (2 * ray.r * ray.r * f)) * (ray.dr * ray.dr)
    + (ray.r - ray.blackHole.r_s) * (ray.dphi * ray.dphi),
    -2.0 * ray.dr * ray.dphi / ray.r
    ];
    // RHS[0] dr/dλ = dr
    // RHS[1] dφ/dλ = dphi
    // RHS[2] d²r/dλ² from Schwarzschild null geodesic
    // RHS[3] d²φ/dλ² = -2*(dr * dphi) / r
    return RHS;
}
function rk4Step(ray, dλ) {
    const r_s = ray.blackHole.r_s;
    const y0 = [ray.r, ray.phi, ray.dr, ray.dphi];

    // Kick off the party
    const k1 = geodesicRHS(ray);

    // get rk2
    let temp = addState(y0, k1, dλ / 2.0);
    const r2 = ray.clone(); r2.r = temp[0]; r2.phi = temp[1]; r2.dr = temp[2]; r2.dphi = temp[3];
    const k2 = geodesicRHS(r2);

    // get rk3
    temp = addState(y0, k2, dλ / 2.0);
    const r3 = ray.clone(); r3.r = temp[0]; r3.phi = temp[1]; r3.dr = temp[2]; r3.dphi = temp[3];
    const k3 = geodesicRHS(r3);

    // get rk3
    temp = addState(y0, k3, dλ / 2.0);
    const r4 = ray.clone(); r4.r = temp[0]; r4.phi = temp[1]; r4.dr = temp[2]; r4.dphi = temp[3];
    const k4 = geodesicRHS(r4);

    ray.r += (dλ / 6.0) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    ray.phi += (dλ / 6.0) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    ray.dr += (dλ / 6.0) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    ray.dphi += (dλ / 6.0) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
}


class BlackHole2d extends WebGLApplet {
    constructor() {
        super("./glsl/black_hole_2d.vert", "./glsl/black_hole_2d.frag", 800, 600);
        this.worldWidth = 100000000000.0;
        this.worldHeight = 75000000000.0;
        this.renderers = [];           // all objects that can draw themselves
        this.uniforms = {};            // cached locations
    }
    initScene() {
        const gl = this.gl;
        const p = this.program;



        this.uniforms = {
            resolution: gl.getUniformLocation(p, "u_resolution"),
            translation: gl.getUniformLocation(p, "u_translation"),
            zoom: gl.getUniformLocation(p, "u_zoom"),
            mode: gl.getUniformLocation(p, "u_mode"),
            center: gl.getUniformLocation(p, "u_center"),
            radius: gl.getUniformLocation(p, "u_radius"),
            color: gl.getUniformLocation(p, "u_color"),
            time: gl.getUniformLocation(p, "u_time"),
            worldHeight: gl.getUniformLocation(p, "u_worldHeight"),
            worldWidth: gl.getUniformLocation(p, "u_worldWidth")
        }

        this.quadVAO = this.createQuadVAO();
        this.circleVAO = this.createCircleVAO();

        this.blackHole = new BlackHole(this, { x: 0.0, y: 0.0 }, 8.54e36) // Sagittarius A Black Hole
        this.rayRenderer = new RayRenderer(this, this.blackHole);


        this.renderers.push(new BackgroundRenderer(this));
        this.renderers.push(this.blackHole);
        this.renderers.push(this.rayRenderer);

        this.rayRenderer.spawnRay({ x: this.worldWidth / -2, y: this.worldHeight / 2 }, { x: 1, y: -0.10484016 });
        this.rayRenderer.spawnRay({ x: this.worldWidth / 2, y: this.worldHeight / 2 }, { x: -1, y: -0.10484016 });

        this.rayRenderer.spawnRay({ x: this.worldWidth * -1, y: this.worldHeight }, { x: 1, y: -0.3 });
        this.rayRenderer.spawnRay({ x: this.worldWidth , y: this.worldHeight }, { x: -1, y: -0.3});

        super.initScene();
        this.rayRenderer.setupRaySpawner();
    }

    createQuadVAO() { return this.createVAO([-1, -1, -1, 1, 1, -1, 1, 1], "a_position"); }
    createCircleVAO() { return this.createVAO([-1, -1, -1, 1, 1, -1, 1, 1], "a_corner"); }

    createVAO(data, attribName) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(this.program, attribName);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        return vao;
    }

    render() {
        const gl = this.gl;

        this.gl.clearColor(0.02, 1, 0.04, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        // Global uniforms (same for every object)
        gl.uniform2f(this.uniforms.resolution, this.resolutionWidth, this.resolutionHeight);
        gl.uniform2f(this.uniforms.translation, this.offsetX, this.offsetY);
        gl.uniform1f(this.uniforms.zoom, this.zoom);
        gl.uniform1f(this.uniforms.time, performance.now() * 0.001);
        gl.uniform1f(this.uniforms.worldHeight, this.worldHeight);
        gl.uniform1f(this.uniforms.worldWidth, this.worldWidth);


        // Let every renderer draw itself
        for (const r of this.renderers) {
            r.draw();
        }

        super.render();
    }
}
export default BlackHole2d;