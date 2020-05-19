import * as THREE from 'three';
import THREEx from './threex.noiseshadermaterial.js';

var Clouds = function(anchorObj, width, height, depth, nPlanes){

    nPlanes	= nPlanes || 100;
    width = width || 20;
    height = height || 20;
    depth = depth || 20;

    var fragmentShader	= [
        THREEx.NoiseShaderMaterial.noiseFragmentShader,
        '',
        '',
        'uniform float time;',
        'varying vec2 vUv;',
        '',
        'float surface3( vec3 coord ){',
            'float height	= 0.0;',
            'coord	*= 0.8;',
            'height	+= abs(snoise(coord      )) * 1.0;',
            'height	+= abs(snoise(coord * 2.0)) * 0.5;',
            'height	+= abs(snoise(coord * 4.0)) * 0.25;',
            'height	+= abs(snoise(coord * 8.0)) * 0.125;',
            'return height;',
        '}',
        '',
        'void main( void ) {',
            'vec3 coord	= vec3( vUv, time );',
            'float height	= surface3( coord );',
            'if( height < 0.8 ) discard;',
            'height = (height-0.8)/0.2;',
            'float alpha = height/1.0;',
            'if(height < 0.9){',
                'alpha = (height/0.9);',
            '}else{',
                'alpha = 1.0;',
            '}',
            'alpha = alpha / 2.0;',
            'height = height*0.4 + 0.4;',
            'gl_FragColor	= vec4( vec3(height, height, height), alpha );',
        '}',
    ].join('\n')
    var planes = [];
    var lastTime = performance.now();

    //generate slices
    for(var i = 0; i < nPlanes; i++){
        ;(function(){
            // var geometry	= new THREE.SphereGeometry( 0.5, 32, 32);
            var geometry	= new THREE.PlaneBufferGeometry(width,height, 1, 1);
            var material	= new THREEx.NoiseShaderMaterial({
                fragmentShader	: fragmentShader,
                depthWrite	: false,
                transparent	: true,
            })
            var mesh = new THREE.Mesh( geometry, material );
            // mesh.position.z	= (i-nPlanes/2) / 2
            mesh.position.y = (depth / nPlanes) * i;
            mesh.position.z	= height / 2;
            mesh.rotation.x = Math.PI / 2;
            
            material.uniforms[ "time" ].value	+= i/50

            planes.push({
                mesh: mesh,
                update: function(delta, now){
                    material.uniforms[ "time" ].value	+= -delta/2;
                }
            });
            anchorObj.add( mesh );
        })()   
    }

    this.update = update;
    function update(now){

        for (let p of planes){
            p.update(now - lastTime, now)
        }

        lastTime = now;
    }
}
export default Clouds;
