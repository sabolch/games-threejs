var webglExists = (function () {
    try {
        var canvas = document.createElement('canvas');
        return !!window.WebGLRenderingContext && ( canvas.getContext('webgl') || canvas.getContext('experimental-webgl') );
    } catch (e) {
        return false;
    }
})(); // jscs:ignore

if (!webglExists) {
    alert('Your browser does not appear to support WebGL. You can try viewing this page anyway, but it may be slow and some things may not look as intended. Please try viewing on desktop Firefox or Chrome.');
}

if (/&?webgl=0\b/g.test(location.hash)) {
    webglExists = !confirm('Are you sure you want to disable WebGL on this page?');
    if (webglExists) {
        location.hash = '#';
    }
}

if (!Detector.webgl) Detector.addGetWebGLMessage();

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

Math.degrees = function (radians) {
    return radians * 180 / Math.PI;
};

function sec2str(t) {
    var d = Math.floor(t / 86400),
        h = ('0' + Math.floor(t / 3600) % 24).slice(-2),
        m = ('0' + Math.floor(t / 60) % 60).slice(-2),
        s = ('0' + t % 60).slice(-2);
    return (d > 0 ? d + 'd ' : '') + (h > 0 ? h + ':' : '') + (m > 0 ? m + ':' : '') + (t > 60 ? s : s + 's');
}

/*********************************************************************/
/**************************** Varriables *****************************/
/*********************************************************************/
var PAUSE = false;
var BRAKE = true;

var ROLL = 0, PITCH = 0, SPEED = 1, ALTITUDE = 0;
var SOUNDS = {};
var keyboard;
var TARGETS = 25;
var TIME = 100;
var ANGLE = 14;

var TENT;

var collidableMeshList = [];

var terrainScene, ISLANDS = [];

var GROUP, GROUP2;

var dir = 0;
var container, stats, controls;
var camera, scene, renderer, light;
var water, sphere;
var Airplane;
var clock = new THREE.Clock();

var mixers = [];
var action;
var AirplaneAnimations = {};
var start_controll = false;

ENGINE = false;


// Physics variables
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var physicsWorld;

var syncList = [];
var time = 0;
var objectTimePeriod = 3;
var timeNextSpawn = time + objectTimePeriod;
var maxNumObjects = 30;

var sphereBBB;
/*********************************************************************/
/************************** Init Functions ************************/
/*********************************************************************/

init();
initCannon();
DrawIsland();
animate();


function initCannon() {
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    var solver = new CANNON.GSSolver();

    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;

    solver.iterations = 7;
    solver.tolerance = 0.1;
    var split = true;
    if (split)
        world.solver = new CANNON.SplitSolver(solver);
    else
        world.solver = solver;

    world.gravity.set(0, 0, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    // Create a slippery material (friction coefficient = 0.0)
    physicsMaterial = new CANNON.Material("slipperyMaterial");
    var physicsContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
        physicsMaterial,
        0.0, // friction coefficient
        0.3  // restitution
    );
    // We must add the contact materials to the world
    world.addContactMaterial(physicsContactMaterial);


    var sphere = new CANNON.Sphere(1);
    sphereBBB = new CANNON.Body({mass: 1});
    sphereBBB.addShape(sphere);
    // var pos = new CANNON.Vec3(0,0,size);
    sphereBBB.position.set(0, 1, 0);
    world.add(sphereBBB);
    sphereBBB.addEventListener("collide", function (e) {
        if (e.body.id) {
            if ((e.body.id < 0) && !(sphereBBB.position.x < 25 && sphereBBB.position.x > -25
                    && sphereBBB.position.z > -10 && sphereBBB.position.z < 900)) {
                console.log("Collided with body: ID ", e.body.id);
                gameOver();
            } else {

                console.log("Collided with body: ID ", e.body.id);
                console.log(sphereBBB.position.y);
            }
        }
        // console.log();
        // console.log("Contact between bodies:",e.contact);
    });

    // Create a plane
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({mass: 0, material: physicsMaterial});
    groundBody.id = -1;
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.add(groundBody);
}


function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 300000);
    camera.position.set(100, 200, 300);

    keyboard = new KeyboardState();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xdddddd, 300, 800);


    /*********************************************************************/
    /******************************** Sounds *****************************/
    /*********************************************************************/

    var listener = new THREE.AudioListener();
    camera.add(listener);


    /*********************************************************************/
    /************************** Lighting Settings ************************/
    /*********************************************************************/
    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 200, 100);
    light.castShadow = true;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = -100;
    light.shadow.camera.left = -120;
    light.shadow.camera.right = 120;
    scene.add(light);
    /*********************************************************************/
    /***************************** Loader manager ************************/
    /*********************************************************************/

    var manager = new THREE.LoadingManager();
    manager.onStart = function (url, itemsLoaded, itemsTotal) {
        // console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onLoad = function () {
        // console.log('Loading complete!');
        setTimeout(function () {
            setLoading(100);

        }, 1000);
    };


    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        // console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onError = function (url) {
        // console.log('There was an error loading ' + url);
    };

    /**************************************************************/
    /******************** FXB LOADER LOAD OBJECT ******************/
    /**************************************************************/
    var loader = new THREE.FBXLoader(manager);
    loader.load('models/ww1.fbx',

        function (object) {
            object.mixer = new THREE.AnimationMixer(object);
            mixers.push(object.mixer);

            AirplaneAnimations.spinner = object.mixer.clipAction(object.animations[0]);
            // AirplaneAnimations.spinner.play();
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            // Airplane
            Airplane = object;
            Airplane.position.set(0, 100, 0);
            Airplane.scale.set(15,15,15);
            Airplane.rotateY(Math.PI / 64);
            scene.add(Airplane);


            loader.load('models/tent.fbx',

                function (object) {
                    object.traverse(function (child) {
                        if (child.isMesh) {
                            // child.castShadow = true;
                            // child.receiveShadow = true;
                        }

                    });
                    TENT = object;
                    TENT.rotateY(Math.PI);
                    TENT.scale.set(0.8,0.8,0.8);


                    for(var i = 0; i < 5; i ++ ){
                        var tent = TENT.clone();
                        tent.position.set(80, 0, i*200);
                        scene.add(tent);

                        var airplane = Airplane.clone();
                        airplane.position.set(80,0,(i*200) +100);
                        airplane.scale.set(0.3,0.3,0.3);
                        airplane.rotateY(-Math.PI/2);
                        airplane.rotateX(-Math.PI/16);
                        scene.add(airplane);


                    }
                    var boxShape = new CANNON.Box(new CANNON.Vec3(50, 17, 550));
                    var boxBody = new CANNON.Body();
                    boxBody.addShape(boxShape);
                    boxBody.id =( -2);
                    world.add(boxBody);
                    boxBody.position.set(80, 0, 500);
                }
            );



            loader.load('models/tent2.fbx',

                function (object) {
                    object.traverse(function (child) {
                        if (child.isMesh) {
                            // child.castShadow = true;
                            // child.receiveShadow = true;
                        }

                    });
                    object.rotateY(Math.PI);
                    object.scale.set(0.07,0.07,0.07);


                    for(var i = 0; i < 5; i ++ ){
                        var tent = object.clone();
                        tent.position.set(-80, 0, i*200);
                        scene.add(tent);

                    }

                    var bs = new CANNON.Box(new CANNON.Vec3(50, 17, 550));
                    var bb = new CANNON.Body();
                    bb.addShape(bs);
                    bb.id =( -3);
                    world.add(bb);
                    bb.position.set(-80, 0, 500);
                }
            );

            loader.load('models/camp.fbx',

                function (object) {
                    object.traverse(function (child) {
                        if (child.isMesh) {

                        }

                    });
                    object.rotateY(Math.PI);
                    object.scale.set(0.15,0.15,0.15);


                    for(var i = 0; i < 5; i ++ ){
                        var camp = object.clone();
                        camp.position.set(-80, 0, (i*200)+100);
                        scene.add(camp);
                    }

                }
            );


            // Airplane Camera
            camera.position.set(0, 10, -200);
            camera.rotateY(Math.PI);
            camera.rotateX(-Math.PI / 16);
            // camera.rotateX(Math.PI / 16);

            // Pivot 2
            GROUP2 = new THREE.Object3D();
            GROUP2.scale.set(0.01, 0.01, 0.01);
            GROUP2.position.set(0, 0, -20);
            GROUP2.add(Airplane);

            // Pivot 1
            GROUP = new THREE.Object3D();
            GROUP.position.set(0, 0, 500);
            // GROUP.add(Airplane);
            GROUP.add(GROUP2);
            GROUP.add(camera);
            scene.add(GROUP);
        }
    );




    var audioLoader = new THREE.AudioLoader(manager);

    SOUNDS.music = new THREE.Audio(listener);
    audioLoader.load('sounds/Celeb.mp3', function (buffer) {
        SOUNDS.music.setBuffer(buffer);
        SOUNDS.music.setLoop(true);
        SOUNDS.music.setVolume(0.5);

    });

    SOUNDS.engine = new THREE.Audio(listener);
    audioLoader.load('sounds/engine.ogg', function (buffer) {
        SOUNDS.engine.setBuffer(buffer);
        SOUNDS.engine.setLoop(true);
        SOUNDS.engine.setPlaybackRate(THROTTLE / 10 + 0.3);
        SOUNDS.engine.setVolume(0.9);
    });

    SOUNDS.effects = new THREE.Audio(listener);
    audioLoader.load('sounds/ring.mp3', function (buffer) {
        SOUNDS.effects.setBuffer(buffer);
        SOUNDS.effects.setLoop(false);
        SOUNDS.effects.setVolume(1);
    });

    /**************************************************************/
    /************************ Render Setup ************************/
    /**************************************************************/
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    var l = new THREE.TextureLoader();
    plane = l.load('images/mudroad.jpg', function (texture) {
        var geometry = new THREE.PlaneGeometry(50, 1100, 16);
        var material = new THREE.MeshPhongMaterial({map: texture});
        plane = new THREE.Mesh(geometry, material);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 4);
        plane.rotation.x = -(Math.PI / 2);
        plane.position.set(0, 0, 480);
        scene.add(plane)
    });

    /**************************************************************/
    /************************ Cerate Ocean ************************/
    /**************************************************************/

    // Skybox
    var sky = new THREE.Sky();
    sky.scale.setScalar(10000);

    scene.add(sky);
    var uniforms = sky.material.uniforms;
    uniforms.turbidity.value = 10;
    uniforms.rayleigh.value = 2;
    uniforms.luminance.value = 1;
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;
    var parameters = {
        distance: 400,
        inclination: 0.2,
        azimuth: 0.205
    };
    var cubeCamera = new THREE.CubeCamera(1, 20000, 256);
    cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;

    function updateSun() {
        var theta = Math.PI * ( parameters.inclination - 0.5 );
        var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
        light.position.x = parameters.distance * Math.cos(phi);
        light.position.y = parameters.distance * Math.sin(phi) * Math.sin(theta);
        light.position.z = parameters.distance * Math.sin(phi) * Math.cos(theta);
        sky.material.uniforms.sunPosition.value = light.position.copy(light.position);
        cubeCamera.update(renderer, scene);
    }

    updateSun();
    //

    /**************************************************************/
    /************************ GUI Controll ************************/
    /**************************************************************/
    var gui = new dat.GUI();
    var folder = gui.addFolder('Sky');
    folder.add(parameters, 'inclination', 0, 0.5, 0.0001).onChange(updateSun);
    folder.add(parameters, 'azimuth', 0, 1, 0.0001).onChange(updateSun);
    folder.open();
    gui.close();
    /************************************************************/
    window.addEventListener('resize', onWindowResize, false);

    // stats
    stats = new Stats();
    container.appendChild(stats.dom);


}


function start_camera() {
    camera.position.z += 2;
    if (camera.position.z < -50) {
        setTimeout(start_camera, 5);
    }
}


function forces() {
    var pitch = Math.round(Math.degrees(PITCH));
    var roll = Math.round(Math.degrees(dir));

    if (pitch < 0) {
        GROUP.translateY(-pitch / 100);
        sphereBBB.position.y += -pitch / 100;

    } else if (pitch > 0) {
        GROUP.translateY(-pitch / 100);
        sphereBBB.position.y += -pitch / 100;

    } else {
    }

    var roll_delay = 5000;
    if (roll < 0) {
        // sphereBBB.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),(-0.0001 - (roll / 10)));
        // sphereBBB.quaternion.y +=  (-0.0001 - (roll / 10));
        var rotationQuaternion = new CANNON.Quaternion();
        rotationQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (-0.0001 - (roll / roll_delay)));
        sphereBBB.quaternion = sphereBBB.quaternion.mult(rotationQuaternion);
        ROLL += -0.0001 - (roll / roll_delay);

    } else if (roll > 0) {
        // sphereBBB.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),(-0.0001 - (roll / 10)));
        var rotationQuaternion = new CANNON.Quaternion();
        rotationQuaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), (-0.0001 - (roll / roll_delay)));
        sphereBBB.quaternion = sphereBBB.quaternion.mult(rotationQuaternion);
        // sphereBBB.quaternion.y +=  (-0.0001 - (roll / 10));

        ROLL += -0.0001 - (roll / roll_delay);
    } else {
    }
}

function key() {
    if (PAUSE) return;
    forces();
    /************************************************************/
    /************************ FEL *******************************/
    /************************************************************/
    if (keyboard.pressed("down") || keyboard.pressed("S")) {
        if (Math.degrees(PITCH) > -ANGLE && start_controll) {
            PITCH -= 0.008;
            GROUP2.rotateX(-0.004);
            camera.rotateX(-0.002);
        }
    }
    /************************************************************/
    /************************ LE ********************************/
    /************************************************************/
    if (keyboard.pressed("up") || keyboard.pressed("W")) {
        if (Math.degrees(PITCH) < ANGLE && start_controll) {
            PITCH += 0.008;
            camera.rotateX(0.002);
            GROUP2.rotateX(0.004);
        }
    }

    /************************************************************/
    /************************ BALRA *****************************/
    /************************************************************/
    if (keyboard.pressed("left") || keyboard.pressed("A")) {
        if (Math.degrees(dir) > -ANGLE && start_controll) {
            dir -= 0.008;
            Airplane.rotateZ(-0.008);
        }
    }

    /************************************************************/
    /************************ JOBBRA ****************************/
    /************************************************************/

    if (keyboard.pressed("right") || keyboard.pressed("D")) {
        if (Math.degrees(dir) < ANGLE && start_controll) {
            dir += 0.008;
            Airplane.rotateZ(0.008);
        }
    }

    /************************************************************/
    /************************ TESTEL ****************************/
    /************************************************************/
    if (keyboard.down("F")) {
        function goFullscreen() {
            // Must be called as a result of user interaction to work
            mf = document.documentElement;
            mf.webkitRequestFullscreen();
            mf.style.display = "";
        }

        function fullscreenChanged() {
            if (document.webkitFullscreenElement == null) {
                mf = document.documentElement;
                // mf.style.display="none";
            }
        }

        // document.onwebkitfullscreenchange = fullscreenChanged;
        // document.documentElement.onclick = goFullscreen;
        document.onkeydown = goFullscreen;

        goFullscreen();
    }

    if (keyboard.pressed("N")) {
        sphereBBB.position.z += 2;
    }
    if (keyboard.pressed("M")) {
        sphereBBB.position.z -= 2;
    }
    if (keyboard.pressed("J")) {
        sphereBBB.position.x += 2;
    }
    if (keyboard.pressed("K")) {
        sphereBBB.position.x -= 2;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**************************************************************/
/*************************** Island ***************************/

/**************************************************************/
function buildTree() {
    var material = [
        new THREE.MeshLambertMaterial({color: 0x3d2817}), // brown
        new THREE.MeshLambertMaterial({color: 0x2d4c1e}), // green
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

function DrawIsland() {
    var loader = new THREE.TextureLoader();
    var t1 = loader.load('images/sand1.jpg', function (t1) {
        t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
    });
    var t2 = loader.load('images/grass1.jpg');
    var t3 = loader.load('images/stone1.jpg');
    var t4 = loader.load('images/snow1.jpg');

    var material = THREE.Terrain.generateBlendedMaterial([
        // The first texture is the base; other textures are blended in on top.
        {texture: t1},
        // Start blending in at height -80; opaque between -35 and 20; blend out by 50
        {texture: t2, levels: [-80, -35, 20, 50]},
        {texture: t3, levels: [20, 50, 60, 85]},
        // How quickly this texture is blended in depends on its x-position.
        {
            texture: t4,
            glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'
        },
        // Use this texture if the slope is between 27 and 45 degrees
        {
            texture: t3,
            glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2'
        },
    ]);
// Generate a terrain
    var xS = 32, yS = 32;
    terrainScene = THREE.Terrain({
        easing: THREE.Terrain.Linear,
        frequency: 2.5,
        heightmap: THREE.Terrain.Perlin,
        material: material,
        maxHeight: 50,
        minHeight: -15,
        steps: 1,
        useBufferGeometry: false,
        xSegments: xS,
        xSize: 20000,
        ySegments: yS,
        ySize: 20000,
    });
// Assuming you already have your global scene, add the terrain to it
    scene.add(terrainScene);

// Optional:
// Get the geometry of the terrain across which you want to scatter meshes
    var mesh = buildTree();
    var geo = terrainScene.children[0].geometry;
// Add randomly distributed foliage
    decoScene = THREE.Terrain.ScatterMeshes(geo, {
        mesh: mesh,
        w: xS,
        h: yS,
        smoothSpread: 0.2,
        maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
        maxTilt: 0.15707963267948966,
        spread: 0.5,
        randomness: Math.random,
    });
    terrainScene.add(decoScene);
    terrainScene.position.set(0, -50, 0);
    /*** Darw  Targets ***/
    var material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        map: new THREE.TextureLoader().load('images/torus.jpg')
    });
    for (var i = 0; i < TARGETS; i++) {
        var geometry = new THREE.TorusGeometry(9, 4, 16, 32);
        var torus = new THREE.Mesh(geometry, material);
        torus.position.set(getRandomInt(-2000, 2000), getRandomInt(110, 300), getRandomInt((-i - 100) - 1500, (i + 100) + 1500));
        scene.add(torus);
        collidableMeshList.push(torus);
    }
}


// SPEED = Math.round(1.852 * (1 * (THROTTLE / 10) + 0.4) * 100);
SPEED = 0;
/**************************************************************/
/*************************** ANIMATE **************************/

/**************************************************************/

function removeA(array, element) {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
}


var dt = 1 / 60;

function updatePhysics() {
    world.step(dt);
    GROUP.position.copy(sphereBBB.position);
    GROUP.quaternion.copy(sphereBBB.quaternion);
}

function starting() {
    if (!(sphereBBB.position.x < 25 && sphereBBB.position.x > -25
            && sphereBBB.position.z > -10 && sphereBBB.position.z < 980) && sphereBBB.position.y < 1) {
        gameOver();
    }

    if (sphereBBB.position.y > 10) START = false;
    if (SPEED > 60) {
        setTimeout(function () {
            start_controll = true;
        }, 2000);
        setTimeout(function () {
            ANGLE = 34;
        }, 6000);
    }
}


function animate() {
    var delta = clock.getDelta(); // seconds.
    requestAnimationFrame(animate);
    if (PAUSE) return;

    if (mixers.length > 0) {
        updatePhysics();

        // Landing
        // if(sphereBBB.position.y < 10){ ANGLE = 14}else {ANGLE = 34;}

        if (sphereBBB.position.y < 10 && sphereBBB.position.x < 25 && sphereBBB.position.x > -25
            && sphereBBB.position.z > -300 && sphereBBB.position.z < 1300) {
            START = true;
        }


        for (var i = 0; i < mixers.length; i++) {
            mixers[i].update(delta);
        }
        //
        // Airplane mooving
        if (SPEED >= 0) sphereBBB.quaternion.vmult(new CANNON.Vec3(0, 0, (SPEED / 185.2) * (START ? 100 : 80)), sphereBBB.velocity);
        if(SPEED < 0) SPEED = 0;

        // Altitude
        ALTITUDE = Math.round(GROUP.position.y * 3);

        /**************************************************************/
        /******************* Write datas to Panel *********************/
        /**************************************************************/
        $('#altitude_value').html(ALTITUDE);
        $('#speed_value').html(SPEED);
        $('.bottom-meter').css({"-webkit-transform": "translateY(" + Math.degrees(PITCH) + "px) rotate(" + Math.degrees(dir) + "deg)"});
        $('#pitch').html(Math.round(Math.degrees(PITCH)) + "&deg;");
        $('#roll').html(Math.round(Math.degrees(dir)) + "&deg;");
        $('#targets').html("25/" + TARGETS);

        var compassDisc = document.getElementById("compassDiscImg");
        compassDisc.style.webkitTransform = "rotate(" + Math.degrees(ROLL) + "deg)";
        compassDisc.style.MozTransform = "rotate(" + Math.degrees(ROLL) + "deg)";
        compassDisc.style.transform = "rotate(" + Math.degrees(ROLL) + "deg)";

        // FCONTROLL.update( delta );

        /**************************************************************/
        /******************* Target Collosion *************************/
        /**************************************************************/
        //
        if (START) starting();

        /**************************************************************/
        /******************* Target Collosion *************************/
        /**************************************************************/
        for (var i = 0; i < collidableMeshList.length; i++) {
            var coll = 25;
            if (collidableMeshList[i].position.x + coll > sphereBBB.position.x && collidableMeshList[i].position.x - coll < sphereBBB.position.x
                && collidableMeshList[i].position.y + coll > (sphereBBB.position.y) && collidableMeshList[i].position.y - coll < (sphereBBB.position.y)
                && collidableMeshList[i].position.z + coll > sphereBBB.position.z && collidableMeshList[i].position.z - coll < sphereBBB.position.z
            ) {
                scene.remove(collidableMeshList[i]);
                removeA(collidableMeshList, collidableMeshList[i]);
                if (!SOUNDS.effects.isPlaying) SOUNDS.effects.play();
                TIME += 10;
                TARGETS--;

            }
        }


    }

    if (ALTITUDE < 0) {
        gameOver();
    }
    if (TARGETS == 0) {
        gameWin();
    }

    var time = performance.now() * 0.001;

    key();
    if (!PAUSE) keyboard.update();
    stats.update();
    renderer.render(scene, camera);
}

var TIMER = setInterval(function () {
    if (PAUSE) return;
    TIME--;
    var minutes = Math.floor(TIME / 60);
    document.getElementById("time").innerHTML = " " + sec2str(TIME);//+ minutes + ":" + ( TIME - (minutes * 60));
    if (TIME == 0) {
        gameOver();
    }
}, 1000);

function gameOver() {
    clearInterval(TIMER);
    pausing();
    $('.game-over').show();
    $('.pause-conteiner').hide();
}

function gameWin() {
    clearInterval(TIMER);
    pausing();
    $('.game-win').show();
    $('.pause-conteiner').hide();
}
