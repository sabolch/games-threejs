var webglExists = ( function () { try { var canvas = document.createElement( 'canvas' ); return !!window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ); } catch( e ) { return false; } } )(); // jscs:ignore

if (!webglExists) {
    alert('Your browser does not appear to support WebGL. You can try viewing this page anyway, but it may be slow and some things may not look as intended. Please try viewing on desktop Firefox or Chrome.');
}

if (/&?webgl=0\b/g.test(location.hash)) {
    webglExists = !confirm('Are you sure you want to disable WebGL on this page?');
    if (webglExists) {
        location.hash = '#';
    }
}

// Workaround: in Chrome, if a page is opened with window.open(),
// window.innerWidth and window.innerHeight will be zero.
if ( window.innerWidth === 0 ) {
    window.innerWidth = parent.innerWidth;
    window.innerHeight = parent.innerHeight;
}

var camera, scene, renderer, clock, player, terrainScene, decoScene, lastOptions, controls = {}, fpsCamera, skyDome, skyLight, sand, water; // jscs:ignore requireLineBreakAfterVariableAssignment
var INV_MAX_FPS = 1 / 100,
    frameDelta = 0,
    paused = true,
    mouseX = 0,
    mouseY = 0,
    useFPS = false;

function animate() {
    draw();


    if (!paused) {
        requestAnimationFrame(animate);
    }
}

function startAnimating() {
    if (paused) {
        paused = false;
        clock.start();
        requestAnimationFrame(animate);
    }
}

function stopAnimating() {
    paused = true;
    controls.freeze = true;
    clock.stop();
}

function setup() {
    setupThreeJS();
    // setupControls();
    setupWorld();
    // watchFocus();
    setupDatGui();
    startAnimating();
}

function setupThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x868293, 0.0007);

    renderer = webglExists ? new THREE.WebGLRenderer({ antialias: true }) : new THREE.CanvasRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', -1);

    camera = new THREE.PerspectiveCamera(60, renderer.domElement.width / renderer.domElement.height, 1, 10000);
    scene.add(camera);
    camera.position.x = 500;
    camera.position.y = 311;
    camera.position.z = 580;
    camera.rotation.x = -52 * Math.PI / 180;
    camera.rotation.y = 35 * Math.PI / 180;
    camera.rotation.z = 37 * Math.PI / 180;

    clock = new THREE.Clock(false);
}


function setupWorld() {
    new THREE.TextureLoader().load('images/sky1.jpg', function(t1) {
        t1.minFilter = THREE.LinearFilter; // Texture is not a power-of-two size; use smoother interpolation.
        skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(8192, 16, 16, 0, Math.PI*2, 0, Math.PI*0.5),
            new THREE.MeshBasicMaterial({map: t1, side: THREE.BackSide, fog: false})
        );
        skyDome.position.y = -99;
        scene.add(skyDome);
    });

    water = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(16384+1024, 16384+1024, 16, 16),
        new THREE.MeshLambertMaterial({color: 0x006ba0, transparent: true, opacity: 0.6})
    );
    water.position.y = -99;
    water.rotation.x = -0.5 * Math.PI;
    scene.add(water);

    skyLight = new THREE.DirectionalLight(0xe8bdb0, 1.5);
    skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
    scene.add(skyLight);
    var light = new THREE.DirectionalLight(0xc3eaff, 0.75);
    light.position.set(-1, -0.5, -1);
    scene.add(light);

}
function setupDatGui() {
    var heightmapImage = new Image();
    heightmapImage.src = 'images/heightmap.png';

    function Settings() {
        var that = this;
        var mat = new THREE.MeshBasicMaterial({color: 0x5566aa, wireframe: true});
        var gray = new THREE.MeshPhongMaterial({ color: 0x88aaaa, specular: 0x444455, shininess: 10 });
        var blend;
        var elevationGraph = document.getElementById('elevation-graph'),
            slopeGraph = document.getElementById('slope-graph'),
            analyticsValues = document.getElementsByClassName('value');
        var loader = new THREE.TextureLoader();
        loader.load('images/sand1.jpg', function(t1) {
            t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
            sand = new THREE.Mesh(
                new THREE.PlaneBufferGeometry(16384+1024, 16384+1024, 64, 64),
                new THREE.MeshLambertMaterial({map: t1})
            );
            sand.position.y = -101;
            sand.rotation.x = -0.5 * Math.PI;
            scene.add(sand);
            loader.load('images/grass1.jpg', function(t2) {
                loader.load('images/stone1.jpg', function(t3) {
                    loader.load('images/snow1.jpg', function(t4) {
                        // t2.repeat.x = t2.repeat.y = 2;
                        blend = THREE.Terrain.generateBlendedMaterial([
                            {texture: t1},
                            {texture: t2, levels: [-80, -35, 20, 50]},
                            {texture: t3, levels: [20, 50, 60, 85]},
                            {texture: t4, glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
                            {texture: t3, glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2'}, // between 27 and 45 degrees
                        ]);
                        that.Regenerate();
                    });
                });
            });
        });
        this.easing = 'Linear';
        this.heightmap = 'HillIsland';
        this.smoothing = 'None';
        this.maxHeight = 180;
        this.segments = webglExists ? 45 : 29;
        this.steps = 1;
        this.turbulent = false;
        this.size = 1024;
        this.sky = true;
        this.texture = webglExists ? 'Blended' : 'Wireframe';
        this.edgeDirection = 'Normal';
        this.edgeType = 'Box';
        this.edgeDistance = 256;
        this.edgeCurve = 'EaseInOut';
        this['width:length ratio'] = 1.0;
        this['Flight mode'] = useFPS;
        this['Light color'] = '#' + skyLight.color.getHexString();
        this.spread = 60;
        this.scattering = 'PerlinAltitude';
        this.after = function(vertices, options) {
            if (that.edgeDirection !== 'Normal') {
                (that.edgeType === 'Box' ? THREE.Terrain.Edges : THREE.Terrain.RadialEdges)(
                    vertices,
                    options,
                    that.edgeDirection === 'Up' ? true : false,
                    that.edgeType === 'Box' ? that.edgeDistance : Math.min(options.xSize, options.ySize) * 0.5 - that.edgeDistance,
                    THREE.Terrain[that.edgeCurve]
                );
            }
        };
        window.rebuild = this.Regenerate = function() {
            var s = parseInt(that.segments, 10);
            var o = {
                after: that.after,
                easing: THREE.Terrain[that.easing],
                heightmap: THREE.Terrain[that.heightmap],
                material: blend ,
                maxHeight: that.maxHeight - 100,
                minHeight: -100,
                steps: that.steps,
                stretch: true,
                turbulent: that.turbulent,
                useBufferGeometry: false,
                xSize: that.size,
                ySize: Math.round(that.size * that['width:length ratio']),
                xSegments: s,
                ySegments: Math.round(s * that['width:length ratio']),
                _mesh: typeof terrainScene === 'undefined' ? null : terrainScene.children[0], // internal only
            };
            scene.remove(terrainScene);
            terrainScene = THREE.Terrain(o);
            // applySmoothing(that.smoothing, o);
            //terrainScene.position.y = 200;
            scene.add(terrainScene);
        };


        function buildTree() {
            var material = [
                new THREE.MeshLambertMaterial({ color: 0x3d2817 }), // brown
                new THREE.MeshLambertMaterial({ color: 0x2d4c1e }), // green
            ];

            var c0 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 6, 1, true));
            c0.position.y = 6;
            var c1 = new THREE.Mesh(new THREE.CylinderGeometry(0, 10, 14, 8));
            c1.position.y = 18;
            var c2 = new THREE.Mesh(new THREE.CylinderGeometry(0, 9, 13, 8));
            c2.position.y = 25;
            var c3 = new THREE.Mesh(new THREE.CylinderGeometry(0, 8, 12, 8));
            c3.position.y = 32;

            var g = new THREE.Geometry();
            c0.updateMatrix();
            c1.updateMatrix();
            c2.updateMatrix();
            c3.updateMatrix();
            g.merge(c0.geometry, c0.matrix);
            g.merge(c1.geometry, c1.matrix);
            g.merge(c2.geometry, c2.matrix);
            g.merge(c3.geometry, c3.matrix);

            var b = c0.geometry.faces.length;
            for (var i = 0, l = g.faces.length; i < l; i++) {
                g.faces[i].materialIndex = i < b ? 0 : 1;
            }

            var m = new THREE.Mesh(g, material);

            m.scale.x = m.scale.z = 5;
            m.scale.y = 1.25;
            return m;
        }

        var mesh = buildTree();
        var decoMat = mesh.material.map(
            function(mat) {
                return mat.clone();
            }); // new THREE.MeshBasicMaterial({color: 0x229966, wireframe: true});
        decoMat[0].wireframe = true;
        decoMat[1].wireframe = true;
        this['Scatter meshes'] = function() {
            var s = parseInt(that.segments, 10),
                spread,
                randomness;
            var o = {
                xSegments: s,
                ySegments: Math.round(s * that['width:length ratio']),
            };
            if (that.scattering === 'Linear') {
                spread = that.spread * 0.0005;
                randomness = Math.random;
            }
            else if (that.scattering === 'Altitude') {
                spread = that.altitudeSpread;
            }
            else if (that.scattering === 'PerlinAltitude') {
                spread = (function() {
                    var h = THREE.Terrain.ScatterHelper(THREE.Terrain.Perlin, o, 2, 0.125)(),
                        hs = THREE.Terrain.InEaseOut(that.spread * 0.01);
                    return function(v, k) {
                        var rv = h[k],
                            place = false;
                        if (rv < hs) {
                            place = true;
                        }
                        else if (rv < hs + 0.2) {
                            place = THREE.Terrain.EaseInOut((rv - hs) * 5) * hs < Math.random();
                        }
                        return Math.random() < altitudeProbability(v.z) * 5 && place;
                    };
                })();
            }
            else {
                spread = THREE.Terrain.InEaseOut(that.spread*0.01) * (that.scattering === 'Worley' ? 1 : 0.5);
                randomness = THREE.Terrain.ScatterHelper(THREE.Terrain[that.scattering], o, 2, 0.125);
            }
            var geo = terrainScene.children[0].geometry;
            terrainScene.remove(decoScene);
            decoScene = THREE.Terrain.ScatterMeshes(geo, {
                mesh: mesh,
                w: s,
                h: Math.round(s * that['width:length ratio']),
                spread: spread,
                smoothSpread: that.scattering === 'Linear' ? 0 : 0.2,
                randomness: randomness,
                maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
                maxTilt: 0.15707963267948966, //  9deg or  9 / 180 * Math.PI. Trees grow up regardless of slope but we can allow a small variation
            });
            if (decoScene) {
                if (that.texture == 'Wireframe') {
                    decoScene.children[0].material = decoMat;
                }
                else if (that.texture == 'Grayscale') {
                    decoScene.children[0].material = gray;
                }
                terrainScene.add(decoScene);
            }
        };
    }
    var settings = new Settings();


}

window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = renderer.domElement.width / renderer.domElement.height;
    camera.updateProjectionMatrix();
    draw();
}, false);

function draw() {
    renderer.render(scene, camera);
}

function update(delta) {
    if (terrainScene) terrainScene.rotation.z = Date.now() * 0.00001;
    if (controls.update) controls.update(delta);
}


