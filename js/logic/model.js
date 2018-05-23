if (!Detector.webgl) Detector.addGetWebGLMessage();

Math.degrees = function (radians) {
    return radians * 180 / Math.PI;
};
var PAUSE = false;
var THROTTLE = 0, ROLL = 0, PITCH = 0, SPEED = 1, ALTITUDE = 0;
var SOUNDS = {};
var keyboard;

var dir = 0;
var container, stats, controls;
var camera, scene, renderer, light;
var water, sphere;
var Airplane;
var sound;
var clock = new THREE.Clock();

var mixers = [];
var mixer2;
var sound1;


init();
animate();
var action, flying;
var duration_AirplaneSpeed = 2;

var AirplaneAnimations = {};

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 300000);
    camera.position.set(100, 200, 300);

    keyboard = new KeyboardState();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    //scene.fog = new THREE.Fog(0xa0a0a0, 20, 100);


    //// Sounds

    var listener = new THREE.AudioListener();
    camera.add(listener);

    var audioLoader = new THREE.AudioLoader();

    SOUNDS.music = new THREE.Audio(listener);
    audioLoader.load('sounds/Somber.ogg', function (buffer) {
        SOUNDS.music.setBuffer(buffer);
        SOUNDS.music.setLoop(true);
        SOUNDS.music.setVolume(0.5);
        SOUNDS.music.play();
    });

    SOUNDS.engine = new THREE.Audio(listener);
    audioLoader.load('sounds/engine.ogg', function (buffer) {
        SOUNDS.engine.setBuffer(buffer);
        SOUNDS.engine.setLoop(true);
        SOUNDS.engine.setPlaybackRate(0.3);
        SOUNDS.engine.setVolume(1.5);
        SOUNDS.engine.play();
    });

    // var sound1 = new THREE.PositionalAudio( listener );
    // audioLoader.load( 'sounds/358232_j_s_song.ogg', function( buffer ) {
    //     sound1.setBuffer( buffer );
    //     sound1.setRefDistance( 20 );
    //     sound1.play();
    // });
    // mesh1.add( sound1 );

    /*********************************************************************/
    light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 200, 0);
    scene.add(light);

    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 200, 100);
    light.castShadow = true;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = -100;
    light.shadow.camera.left = -120;
    light.shadow.camera.right = 120;
    scene.add(light);

    // scene.add( new THREE.CameraHelper( light.shadow.camera ) );

    // ground
    /* var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshPhongMaterial({
         color: 0x999999,
         depthWrite: false
     }));
     mesh.rotation.x = -Math.PI / 2;
     mesh.receiveShadow = true;
     scene.add(mesh);

     var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
     grid.material.opacity = 0.2;
     grid.material.transparent = true;
     scene.add(grid);*/


    var manager = new THREE.LoadingManager();
    manager.onStart = function (url, itemsLoaded, itemsTotal) {
        console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onLoad = function () {
        console.log('Loading complete!');
        setLoading(100);
    };


    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
        console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
    };

    manager.onError = function (url) {
        console.log('There was an error loading ' + url);
    };

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
            Airplane.scale.set(0.1,0.1,0.1);
            Airplane.add(camera);
            scene.add(Airplane);
            camera.position.set(0, 150, -400);
            camera.rotateY(Math.PI);
            camera.rotateX(-Math.PI / 8);

        }
    );

    var b = new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshPhongMaterial({color: 0x55FF55}));
    b.position.set(0, 0, 300);
    scene.add(b);
    var b2 = new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshPhongMaterial({color: 0x55FF55}));
    b2.position.set(0, 0, -300);
    scene.add(b2);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);


    /************************************************************/

    // Water
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


    // GUI
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

function key() {

    if(PAUSE) return;
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
        // Move
        Airplane.translateZ(-0.5);

    }

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
        /// MOve
        Airplane.translateZ(0.5);
    }

    if (keyboard.up("left") || keyboard.up("A")) {
        controls = false;
        AirplaneAnimations.left.stop();
    }
    if (keyboard.pressed("left") || keyboard.pressed("A")) {
        Airplane.rotateY(-0.02);
        dir -= 0.02;
        if (!controls) {
            AirplaneAnimations.left.reset();
            AirplaneAnimations.left.play();
            setTimeout(function () {
                AirplaneAnimations.left.halt(0);
            }, 700);
            controls = true;
        }


        var compassDisc = document.getElementById("compassDiscImg");
        compassDisc.style.webkitTransform = "rotate(" + Math.degrees(dir) + "deg)";
        compassDisc.style.MozTransform = "rotate(" + Math.degrees(dir) + "deg)";
        compassDisc.style.transform = "rotate(" + Math.degrees(dir) + "deg)";
    }


    if (keyboard.up("right") || keyboard.up("D")) {
        controls = false;
        AirplaneAnimations.right.stop();
    }
    if (keyboard.pressed("right") || keyboard.pressed("D")) {
        Airplane.rotateY(0.02);
        dir += 0.02;
        if (!controls) {
            AirplaneAnimations.right.reset();
            AirplaneAnimations.right.play();
            setTimeout(function () {
                AirplaneAnimations.right.halt(0);
            }, 700);
            controls = true;
        }

        var compassDisc = document.getElementById("compassDiscImg");
        compassDisc.style.webkitTransform = "rotate(" + Math.degrees(dir) + "deg)";
        compassDisc.style.MozTransform = "rotate(" + Math.degrees(dir) + "deg)";
        compassDisc.style.transform = "rotate(" + Math.degrees(dir) + "deg)";


    }


    if (keyboard.pressed("E") && duration_AirplaneSpeed < 10) {
        // console.log(duration_AirplaneSpeed);
        duration_AirplaneSpeed -= 0.02;
        AirplaneAnimations.spinner.setDuration(duration_AirplaneSpeed);
    }

    if (keyboard.pressed("R") && duration_AirplaneSpeed > 0) {
        //console.log(duration_AirplaneSpeed);
        duration_AirplaneSpeed += 0.02;
        AirplaneAnimations.spinner.setDuration(duration_AirplaneSpeed);
    }


    if (keyboard.pressed("M")) {
        Airplane.translateZ(5);
    }


    if (keyboard.pressed("J")) {
        Airplane.rotateX(0.02);
    }
    if (keyboard.pressed("K")) {
        Airplane.rotateX(-0.02);

    }
    keyboard.update();

}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}


function animate() {

    requestAnimationFrame(animate);

    if (PAUSE) return;

    if (mixers.length > 0) {

        for (var i = 0; i < mixers.length; i++) {
            mixers[i].update(clock.getDelta());
        }

        Airplane.translateZ(SPEED);

        $('#altitude_value').html(Math.round(Airplane.position.y * 3));
        $('#speed_value').html(Math.round(1.852 * SPEED * 100 * 2));
    }

    var time = performance.now() * 0.001;
    water.material.uniforms.time.value += 1.0 / 60.0;
    key();
    stats.update();
    renderer.render(scene, camera);


}

