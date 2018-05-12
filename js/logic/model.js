if (!Detector.webgl) Detector.addGetWebGLMessage();

var container, stats, controls,keyboard;
var camera, scene, renderer, light;
var Airplane;
var sound;
var clock = new THREE.Clock();

var mixers = [];
var mixer2;

init();
animate();
var action, flying;
var duration_AirplaneSpeed = 2;

var AirplaneAnimations = {};

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(100, 200, 300);

   keyboard = new KeyboardState();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);


    var listener = new THREE.AudioListener();
    camera.add(listener);

    sound = new THREE.Audio(listener);

    var audioLoader = new THREE.AudioLoader();
    audioLoader.load('sounds/Somber.ogg', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });


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
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshPhongMaterial({
        color: 0x999999,
        depthWrite: false
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    var grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);


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
            Airplane.add(camera);
            scene.add(Airplane);
            camera.position.set(0, 150, -400);
            camera.rotateY(Math.PI);
            camera.rotateX(-Math.PI/16);

        }
    );

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    // stats
    stats = new Stats();
    container.appendChild(stats.dom);

    setTimeout(function () {
       console.log(Airplane.animations[0].tracks);
        //var walkClip = THREE.AnimationUtils.splitClip( Airplane.animations[ 0 ], 'walk', 0, 1 );
        var clip = THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(Airplane.animations[0]));
        const up = THREE.AnimationUtils.subclip(clip, 'down', ['stab_flap.quaternion'], 0, 2).optimize();
        const down = THREE.AnimationUtils.subclip(clip, 'up', ['stab_flap.quaternion'], 2, 4).optimize();

        const tail_left = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion','pt_tail.quaternion'], 0,2).optimize();
        const tail_left_back = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion','pt_tail.quaternion'], 1,3).optimize();

        const tail_right = THREE.AnimationUtils.subclip(clip, 'tail', ['st_tail.quaternion','pt_tail.quaternion'], 2,4).optimize();
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
    if(keyboard.up("down") || keyboard.up("S")) {
        controls = false;
        AirplaneAnimations.down.stop();
    }
    if(keyboard.pressed("down") || keyboard.pressed("S")) {
        if(!controls){
            AirplaneAnimations.down.reset();
            AirplaneAnimations.down.play();
            setTimeout(function () {
                AirplaneAnimations.down.halt(0);
            }, 500);
            controls = true;
        }
    }

    if(keyboard.up("up") || keyboard.up("W")) {
        controls = false;
        AirplaneAnimations.up.stop();
    }
    if(keyboard.pressed("up") || keyboard.pressed("W")) {
        if(!controls){
            AirplaneAnimations.up.reset();
            AirplaneAnimations.up.play();
            setTimeout(function () {
                AirplaneAnimations.up.halt(0);
            }, 500);
            controls = true;
        }
    }

    if(keyboard.up("left") || keyboard.up("A")) {
        controls = false;
        AirplaneAnimations.left.stop();
    }
    if(keyboard.pressed("left") || keyboard.pressed("A")) {
        if(!controls){
            AirplaneAnimations.left.reset();
            AirplaneAnimations.left.play();
            setTimeout(function () {
                AirplaneAnimations.left.halt(0);
            }, 700);
            controls = true;
        }
    }

    if(keyboard.up("right") || keyboard.up("D")) {
        controls = false;
        AirplaneAnimations.right.stop();
    }
    if(keyboard.pressed("right") || keyboard.pressed("D")) {
        if(!controls){
            AirplaneAnimations.right.reset();
            AirplaneAnimations.right.play();
            setTimeout(function () {
                AirplaneAnimations.right.halt(0);
            }, 700);
            controls = true;
        }
    }


    if(keyboard.pressed("E") && duration_AirplaneSpeed < 10){
       // console.log(duration_AirplaneSpeed);
        duration_AirplaneSpeed += 0.02;
        AirplaneAnimations.spinner.setDuration(duration_AirplaneSpeed);
    }

    if(keyboard.pressed("R") && duration_AirplaneSpeed > 0){
        //console.log(duration_AirplaneSpeed);
        duration_AirplaneSpeed -= 0.02;
        AirplaneAnimations.spinner.setDuration(duration_AirplaneSpeed);
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
    if (mixers.length > 0) {

        for (var i = 0; i < mixers.length; i++) {
            mixers[i].update(clock.getDelta());
        }

    }
    if (Airplane) {
        // Airplane.rotateY(0.002);
    }

    renderer.render(scene, camera);
    key();
    stats.update();

}

