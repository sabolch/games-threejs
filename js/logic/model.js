

if (!Detector.webgl) Detector.addGetWebGLMessage();

var container, stats, controls;
var camera, scene, renderer, light;
var Airplane;
var sound;
var clock = new THREE.Clock();

var mixers = [];

init();
animate();
var action;
var duration = 2;




function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    controls = new THREE.OrbitControls(camera);
    controls.target.set(0, 100, 0);
    controls.update();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog(0xa0a0a0, 200, 1000);



    var listener = new THREE.AudioListener();
    camera.add( listener );

    sound = new THREE.Audio( listener );

    var audioLoader = new THREE.AudioLoader();
    audioLoader.load( 'sounds/Somber.ogg', function( buffer ) {
        sound.setBuffer( buffer );
        sound.setLoop( true );
        sound.setVolume( 0.5 );
        //sound.play();
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

    // model
    var loader = new THREE.FBXLoader();
    loader.load('models/test.fbx',

        function ( object ) {

            object.mixer = new THREE.AnimationMixer( object );
            mixers.push( object.mixer );



            action = object.mixer.clipAction( object.animations[ 0 ] );

            //console.log(THREE.AnimationClip.toJSON(object.animations[ 0 ]));

            //action.play();

            object.traverse( function ( child ) {

                if ( child.isMesh ) {

                    child.castShadow = true;
                    child.receiveShadow = true;

                }

            } );
            Airplane = object;
            object.mixer.addEventListener( 'finished', function( e ) {
                action.stop();
            } );
            scene.add( object );

        }
        ,

        // onProgress callback
        function (xhr) {
            //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            setLoading(100);

            // $('.loader').fadeOut(3000);

        }

        // onError callback

    )
    ;

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
        //console.log(THREE.AnimationClip.toJSON(Airplane.animations[ 0 ]));
        //var walkClip = THREE.AnimationUtils.splitClip( Airplane.animations[ 0 ], 'walk', 0, 1 );
        var clip = THREE.AnimationClip.parse( THREE.AnimationClip.toJSON(Airplane.animations[ 0 ]) );
        const walkClip = THREE.AnimationUtils.subclip( clip, 'walk', 0, 2).optimize();
        const run = THREE.AnimationUtils.subclip( clip, 'ok', 2, 4).optimize();

        action = Airplane.mixer.clipAction( walkClip );
        Airplane.mixer.clipAction( run ).play();
        action.play();

    },3000);


}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

$(document).keydown(function (e) {
    //p
    if (e.keyCode == 80) {
        action.stop();
    }
    //s
    if (e.keyCode == 83) {
        action.play();
    }
    //+
    if (e.keyCode == 107) {
        action.setDuration(++duration);
        console.log(duration);
    }
    //-
    if (e.keyCode == 109) {
        action.setDuration(--duration);
        console.log(duration);
    }
});

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

    stats.update();

}

