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

function sec2str(t){
    var d = Math.floor(t/86400),
        h = ('0'+Math.floor(t/3600) % 24).slice(-2),
        m = ('0'+Math.floor(t/60)%60).slice(-2),
        s = ('0' + t % 60).slice(-2);
    return (d>0?d+'d ':'')+(h>0?h+':':'')+(m>0?m+':':'')+(t>60?s:s+'s');
}
/*********************************************************************/
/**************************** Varriables *****************************/
/*********************************************************************/
var PAUSE = false;
var ROLL = 0, PITCH = 0, SPEED = 1, ALTITUDE = 0;
var SOUNDS = {};
var keyboard;
var TARGETS = 10;
var TIME = 120;

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

var FCONTROLL;

/*********************************************************************/
/************************** Init Functions ************************/
/*********************************************************************/

init();
DrawIsland();
animate();


function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 300000);
    camera.position.set(100, 200, 300);

    keyboard = new KeyboardState();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    //scene.fog = new THREE.Fog(0xa0a0a0, 20, 100);


    /*********************************************************************/
    /******************************** Sounds *****************************/
    /*********************************************************************/

    var listener = new THREE.AudioListener();
    camera.add(listener);

    var audioLoader = new THREE.AudioLoader();

    SOUNDS.music = new THREE.Audio(listener);
    audioLoader.load('sounds/music.ogg', function (buffer) {
        SOUNDS.music.setBuffer(buffer);
        SOUNDS.music.setLoop(true);
        SOUNDS.music.setVolume(0.5);

    });

    SOUNDS.engine = new THREE.Audio(listener);
    audioLoader.load('sounds/engine.ogg', function (buffer) {
        SOUNDS.engine.setBuffer(buffer);
        SOUNDS.engine.setLoop(true);
        SOUNDS.engine.setPlaybackRate(THROTTLE / 10 + 0.3);
        SOUNDS.engine.setVolume(1.5);
    });

    SOUNDS.effects = new THREE.Audio(listener);
    audioLoader.load('sounds/ring.mp3', function (buffer) {
        SOUNDS.effects.setBuffer(buffer);
        SOUNDS.effects.setLoop(false);
        SOUNDS.effects.setVolume(1);
    });

    // var sound1 = new THREE.PositionalAudio( listener );
    // audioLoader.load( 'sounds/358232_j_s_song.ogg', function( buffer ) {
    //     sound1.setBuffer( buffer );
    //     sound1.setRefDistance( 20 );
    //     sound1.play();
    // });
    // mesh1.add( sound1 );

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
        setLoading(100);
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
    loader.load('models/ok2.fbx',

        function (object) {

            object.mixer = new THREE.AnimationMixer(object);
            mixers.push(object.mixer);


            action = object.mixer.clipAction(object.animations[0]);
            //console.log(THREE.AnimationClip.toJSON(object.animations[ 0 ]));
            //flying.play();

            object.traverse(function (child) {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                }

            });
            Airplane = object;
            Airplane.position.set(0, 100, 0);
            Airplane.scale.set(5, 5, 5);

            scene.add(Airplane);

            // Airplane.add(camera);
            camera.position.set(0, 110, -200);
            camera.rotateY(Math.PI);
            camera.rotateX(-Math.PI / 10);
            // camera.rotateX(Math.PI / 16);


            GROUP2 = new THREE.Object3D();
            GROUP2.scale.set(0.01, 0.01, 0.01);
            GROUP2.position.set(0, 100, -20);
            GROUP2.add(Airplane);

            GROUP = new THREE.Object3D();
            GROUP.position.set(0, 100, 0);
            // GROUP.add(Airplane);
            GROUP.add(GROUP2);
            GROUP.add(camera);
            scene.add(GROUP);

            //
            // FCONTROLL = new THREE.FlyControls( Airplane );
            // FCONTROLL.movementSpeed = 1000;
            // FCONTROLL.domElement = renderer.domElement;
            // FCONTROLL.rollSpeed = Math.PI / 24;
            // FCONTROLL.autoForward = false;
            // FCONTROLL.dragToLook = false;

        }
    );

    /**************************************************************/
    /************************ Render Setup ************************/
    /**************************************************************/
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);


    /**************************************************************/
    /************************ Cerate Ocean ************************/
    /**************************************************************/
    var waterGeometry = new THREE.CircleGeometry(10000, 16);
    water = new THREE.Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            alpha: 1.0,
            sunDirection: light.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
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
        water.material.uniforms.sunDirection.value.copy(light.position).normalize();
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
    var uniforms = water.material.uniforms;
    var folder = gui.addFolder('Water');
    folder.add(uniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
    folder.add(uniforms.size, 'value', 0.1, 10, 0.1).name('size');
    folder.add(uniforms.alpha, 'value', 0.9, 1, .001).name('alpha');
    folder.open();
    gui.close();
    /************************************************************/
    window.addEventListener('resize', onWindowResize, false);

    // stats
    stats = new Stats();
    container.appendChild(stats.dom);


    /**************************************************************/
    /****************** Activate Animations ***********************/
    /**************************************************************/
    setTimeout(function () {
        //console.log(Airplane.animations[0].tracks);
        //var walkClip = THREE.AnimationUtils.splitClip( Airplane.animations[ 0 ], 'walk', 0, 1 );
        var clip = THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(Airplane.animations[0]));
        const up = THREE.AnimationUtils.subclip(clip, 'down', ['stab_flap.quaternion'], 0, 2).optimize();
        const down = THREE.AnimationUtils.subclip(clip, 'up', ['stab_flap.quaternion'], 2, 4).optimize();

        const tail_left = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion', 'pt_tail.quaternion'], 0, 2).optimize();
        const tail_left_back = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion', 'pt_tail.quaternion'], 1, 3).optimize();

        const tail_right = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion', 'pt_tail.quaternion'], 2, 4).optimize();
        //const tail_left_back = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion','pt_tail.quaternion'], 1,5).optimize();

        const spinner = THREE.AnimationUtils.subclip(clip, 'propeller', ['pt_spinner.quaternion', 'pt_spinner01.quaternion', 'pt_spinner02.quaternion', 'pt_spinner03.quaternion', 'pt_spinner04.quaternion', 'pt_spinner05.quaternion', 'pt_spinner06.quaternion', 'pt_spinner07.quaternion'], 0, 100).optimize();

        AirplaneAnimations.up = Airplane.mixer.clipAction(up);
        AirplaneAnimations.up.setLoop(1, 0);
        AirplaneAnimations.up.setDuration(1);

        AirplaneAnimations.down = Airplane.mixer.clipAction(down);
        AirplaneAnimations.down.setLoop(1, 0);
        AirplaneAnimations.down.setDuration(1);

        AirplaneAnimations.left_back = Airplane.mixer.clipAction(tail_left_back);
        AirplaneAnimations.left_back.setLoop(1, 0);
        AirplaneAnimations.left_back.setDuration(1);

        AirplaneAnimations.right = Airplane.mixer.clipAction(tail_right);
        AirplaneAnimations.right.setLoop(1, 0);
        AirplaneAnimations.right.setDuration(1);

        AirplaneAnimations.left = Airplane.mixer.clipAction(tail_left);
        AirplaneAnimations.left.setLoop(1, 0);
        AirplaneAnimations.left.setDuration(1);

        AirplaneAnimations.spinner = Airplane.mixer.clipAction(spinner).play();

    }, 3000);


}


var camera_timer;
var camera_rotate = 0;

function camera_fexing() {

    if (Math.round(camera_rotate * 1000) > 0) {
        camera.rotateX(-0.001);
        camera_rotate -= 0.001;
        camera.translateY(-0.001);
        camera_timer = setTimeout(camera_fexing, 1);

    } else if (Math.round(camera_rotate * 1000) < 0) {
        camera.rotateX(0.001);
        camera_rotate += 0.001;
        camera.translateY(0.001);

        camera_timer = setTimeout(camera_fexing, 1);
    } else {
    }
    console.log(Math.round(camera_rotate * 1000));

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
    } else if (pitch > 0) {
        GROUP.translateY(-pitch / 100);
    } else {
    }

    if (roll < 0) {
        GROUP.rotateY(-0.0001 - (roll / 10000));
        ROLL -= -0.0001 - (roll / 10000);

    } else if (roll > 0) {
        GROUP.rotateY(0.0001 - (roll / 10000));
        ROLL += 0.0001 - (roll / 10000);
    } else {
    }
}

function key() {
    if (PAUSE) return;
    forces();
    /************************************************************/
    /************************ FEL *******************************/
    /************************************************************/
    if (keyboard.up("down") || keyboard.up("S")) {
        controls = false;
        AirplaneAnimations.down.stop();
    }

    if (keyboard.pressed("down") || keyboard.pressed("S")) {
        if (!controls) {
            AirplaneAnimations.down.reset();
            AirplaneAnimations.down.play();
            setTimeout(function () {
                AirplaneAnimations.down.halt(0);
            }, 500);
            controls = true;
        }

        if (Math.degrees(PITCH) > -34) {
            if (ENGINE) {
                PITCH -= 0.008;
                GROUP2.rotateX(-0.004);
                camera.rotateX(-0.002);
            }
        }

    }
    /************************************************************/
    /************************ LE ********************************/
    /************************************************************/
    if (keyboard.up("up") || keyboard.up("W")) {
        controls = false;
        AirplaneAnimations.up.stop();

    }
    if (keyboard.pressed("up") || keyboard.pressed("W")) {
        if (!controls) {
            AirplaneAnimations.up.reset();
            AirplaneAnimations.up.play();
            setTimeout(function () {
                AirplaneAnimations.up.halt(0);
            }, 500);
            controls = true;
        }
        if (Math.degrees(PITCH) < 34) {
            if (ENGINE){
                PITCH += 0.008;
            camera.rotateX(0.002);
            GROUP2.rotateX(0.004);
            }
        }
    }

    /************************************************************/
    /************************ BALRA *****************************/
    /************************************************************/
    if (keyboard.up("left") || keyboard.up("A")) {
        controls = false;
        AirplaneAnimations.right.stop();

    }
    if (keyboard.pressed("left") || keyboard.pressed("A")) {
        if (Math.degrees(dir) > -35) {
            dir -= 0.008;
            Airplane.rotateZ(-0.008);
        }

        // console.log("  X : " + Math.round(Airplane.position.x) + "|  Y : " + Math.round(Airplane.position.y) + "|  Z : " + Math.round(Airplane.position.z));
        if (!controls) {
            AirplaneAnimations.right.reset();
            AirplaneAnimations.right.play();
            setTimeout(function () {
                AirplaneAnimations.right.halt(0);
            }, 700);
            controls = true;
        }
    }

    /************************************************************/
    /************************ JOBBRA ****************************/
    /************************************************************/

    if (keyboard.up("right") || keyboard.up("D")) {
        controls = false;
        AirplaneAnimations.left.stop();
    }
    if (keyboard.pressed("right") || keyboard.pressed("D")) {
        if (Math.degrees(dir) < 35) {
            dir += 0.008;
            Airplane.rotateZ(0.008);
        }
        if (!controls) {
            AirplaneAnimations.left.reset();
            AirplaneAnimations.left.play();
            setTimeout(function () {
                AirplaneAnimations.left.halt(0);
            }, 700);
            controls = true;
        }

    }

    /************************************************************/
    /************************ TESTEL ****************************/
    /************************************************************/

    if (keyboard.pressed("M")) {
        Airplane.translateZ(5);
    }

    if (keyboard.pressed("J")) {
        // camera.rotateX(0.02);

    }
    if (keyboard.pressed("K")) {
        console.log(GROUP.position);

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
function DrawIsland() {
    var heightmapImage = new Image();
    heightmapImage.src = 'images/heightmap.png';

    function Settings(pos, okey) {
        var that = this;
        var blend;
        var loader = new THREE.TextureLoader();
        loader.load('images/sand1.jpg', function (t1) {
            t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
            loader.load('images/grass1.jpg', function (t2) {
                loader.load('images/stone1.jpg', function (t3) {
                    loader.load('images/snow1.jpg', function (t4) {
                        // t2.repeat.x = t2.repeat.y = 2;
                        blend = THREE.Terrain.generateBlendedMaterial([
                            {texture: t1},
                            {texture: t2, levels: [10, 20, 40, 70]},
                            {texture: t3, levels: [40, 70, 80, 120]},
                            {
                                texture: t4,
                                glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 120.0, vPosition.z)'
                            },
                            {
                                texture: t3,
                                glsl: 'slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2'
                            }, // between 27 and 45 degrees
                        ]);
                        that.Regenerate();
                    });
                });
            });
        });
        this.easing = 'Linear';
        this.heightmap = 'HillIsland';
        this.smoothing = 'None';
        this.maxHeight = 100;
        this.segments = webglExists ? 30 : 15;
        this.steps = 1;
        this.turbulent = false;
        this.size = 2048;
        this.texture = webglExists ? 'Blended' : 'Wireframe';
        this.edgeDirection = 'Normal';
        this.edgeType = 'Box';
        this.edgeDistance = 512;
        this.edgeCurve = 'EaseInOut';
        this['width:length ratio'] = 1.0;
        this['Flight mode'] = false;
        this['Light color'] = '#' + light.color.getHexString();

        window.rebuild = this.Regenerate = function () {
            var s = parseInt(that.segments, 10);
            var o = {
                after: that.after,
                easing: THREE.Terrain[that.easing],
                heightmap: THREE.Terrain[that.heightmap],
                material: blend,
                maxHeight: that.maxHeight - 50,
                minHeight: -20,
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
            //scene.remove(terrainScene);
            okey = THREE.Terrain(o);
            okey.position.set(pos[0], pos[1], pos[2]);
            scene.add(okey);
        };

    }

    var settings = new Settings([0, 15, 0], ISLANDS[0]);
    var settings = new Settings([2000, 15, 1000], ISLANDS[1]);


    /*** Darw  Targets ***/
    for (var i = 0; i < TARGETS; i++) {
        var geometry = new THREE.TorusGeometry(9, 4, 16, 32);
        var material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            map: new THREE.TextureLoader().load('images/torus.jpg')
        });
        var torus = new THREE.Mesh(geometry, material);
        torus.position.set(getRandomInt(-2000, 2000), getRandomInt(110, 300), getRandomInt((-i - 100)-1500, (i + 100) + 1500));
        scene.add(torus);
        collidableMeshList.push(torus);
    }
}


SPEED = Math.round(1.852 * (1 * (THROTTLE / 10) + 0.4) * 100);
/**************************************************************/
/*************************** ANIMATE **************************/

/**************************************************************/

function removeA(array, element) {
    const index = array.indexOf(element);
    if (index !== -1) {
        array.splice(index, 1);
    }
}


function animate() {
    var delta = clock.getDelta(); // seconds.
    requestAnimationFrame(animate);
    if (PAUSE) return;
    if (mixers.length > 0) {

        for (var i = 0; i < mixers.length; i++) {
            mixers[i].update(delta);
        }

        if(SPEED != 0) GROUP.translateZ(SPEED / 185.2);

        // Altitude
        ALTITUDE = Math.round(GROUP.position.y * 3) + 300;

        /**************************************************************/
        /******************* Write datas to Panel *********************/
        /**************************************************************/
        $('#altitude_value').html(ALTITUDE);
        $('#speed_value').html(SPEED);
        $('.bottom-meter').css({"-webkit-transform": "translateY(" + Math.degrees(PITCH) + "px) rotate(" + Math.degrees(dir) + "deg)"});
        $('#pitch').html(Math.round(Math.degrees(PITCH)) + "&deg;");
        $('#roll').html(Math.round(Math.degrees(dir)) + "&deg;");
        $('#targets').html("10/" + TARGETS);

        var compassDisc = document.getElementById("compassDiscImg");
        compassDisc.style.webkitTransform = "rotate(" + Math.degrees(ROLL) + "deg)";
        compassDisc.style.MozTransform = "rotate(" + Math.degrees(ROLL) + "deg)";
        compassDisc.style.transform = "rotate(" + Math.degrees(ROLL) + "deg)";


        // FCONTROLL.update( delta );

        /**************************************************************/
        /******************* Target Collosion *************************/
        /**************************************************************/
        for (var i = 0; i < collidableMeshList.length; i++) {
            var coll = 25;
            if (collidableMeshList[i].position.x + coll > GROUP.position.x && collidableMeshList[i].position.x - coll < GROUP.position.x
                && collidableMeshList[i].position.y + coll > (GROUP.position.y + 100) && collidableMeshList[i].position.y - coll < (GROUP.position.y + 100)
                && collidableMeshList[i].position.z + coll > GROUP.position.z && collidableMeshList[i].position.z - coll < GROUP.position.z
            ) {
                console.log(collidableMeshList[i].position);
                console.log(GROUP.position);
                scene.remove(collidableMeshList[i]);
                removeA(collidableMeshList, collidableMeshList[i]);
                if (!SOUNDS.effects.isPlaying) SOUNDS.effects.play();
                TIME += 10;
                TARGETS--;
                if(TARGETS == 4){sessionStorage['Level2'] = true;};

            }
        }

    }

    if(ALTITUDE < 0) { pausing();$('.game-over').show(); }
    if(TARGETS == 0) { pausing();$('.game-win').show(); }

    var time = performance.now() * 0.001;
    water.material.uniforms.time.value += 1.0 / 60.0;

    key();
    if (!PAUSE) keyboard.update();
    stats.update();
    renderer.render(scene, camera);
}

var TIMER = setInterval(function () {
    if (PAUSE) return;
    TIME --;
    var minutes = Math.floor(TIME / 60);
    document.getElementById("time").innerHTML = " " + sec2str(TIME);//+ minutes + ":" + ( TIME - (minutes * 60));
    if (TIME == 0) {
        clearInterval(TIMER);
        pausing();
        $('.game-over').show();
    }
}, 1000);

