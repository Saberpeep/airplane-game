/*
The BSD 3-Clause License

Copyright (c) 2015, Nop Jiarathanakul
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import * as THREE from 'three';
class Cloud extends THREE.Group {

    constructor(){
        super();
        // this.width, this.height;
        this.cameraPos = new THREE.Vector3();
        this.lightC = [];
        this.lightP = [];
        this.addLight(new THREE.Vector3(-2, 1, -3), new THREE.Vector3(1.0, 1.0, 1.0));
        this.addLight(new THREE.Vector3(2, 2, 1), new THREE.Vector3(0.4, 0.7, 1.0));
        this.init();
        this.negativeY = new THREE.Vector3(1,-1,1);
    
        // this.time = 0.0;
    }
    
    // this.renderer.autoClear = false;
    // this.renderer.sortObjects = false;

    // inputs THREE.Vector3
    addLight(pos, col) {
        var light;
        light = new THREE.PointLight();
        light.position.set(pos.x, pos.y, pos.z);
        light.color.setRGB(col.x, col.y, col.z);
        this.add(light);

        // add geometry
        var mat = new THREE.MeshBasicMaterial();
        mat.color = light.color;
        var shape = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            mat
        );
        shape.position.copy(light.position);
        this.add(shape);

        this.lightP.push(light.position);
        this.lightC.push(col);
    }

    init() {
        // var voltex = THREE.ImageUtils.loadTexture("bunny_fill_100x.png");
        var voltex = new THREE.TextureLoader().load("bunny_fill_100x.png");
        voltex.minFilter = voltex.magFilter = THREE.LinearFilter;
        voltex.wrapS = voltex.wrapT = THREE.ClampToEdgeWrapping;
        var SIDESIZE = 100;
        var voltexDim = new THREE.Vector3(SIDESIZE, SIDESIZE, SIDESIZE);

        var volcol = new THREE.Vector3(1.0, 1.0, 1.0);

        var cameraPos = new THREE.Vector3();

        this.offset = new THREE.Vector3();

        this.uniforms = {
            uCamPos: { type: "v3", value: cameraPos },
            uLightP: { type: "v3v", value: this.lightP },
            uLightC: { type: "v3v", value: this.lightC },
            uColor: { type: "v3", value: volcol },
            uTex: { type: "t", value: voltex },
            uTexDim: { type: "v3", value: voltexDim },
            uOffset: { type: "v3", value: this.offset },
            uTMK: { type: "f", value: 16.0 }
        };

        Promise.all([this.loadTextFile("vol-vs.glsl"), this.loadTextFile("vol-fs.glsl")]).then(function(res){
            var shader = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: res[0],
                fragmentShader: res[1],
                depthWrite: false,
                transparent: true,
            });
    
            this.cube = new THREE.Mesh(
                new THREE.BoxBufferGeometry( 1, 1, 1 ), // must be unit cube
                shader //new THREE.MeshLambertMaterial( { color: 0xCCCCCC } )
            );
            this.cube.userData.name = "cloud";
            this.cube.layers.set(this.layer);
            this.add(this.cube);
            this.scale.y = -1;
            this.scale.multiplyScalar(100, 100, 100);
            
        }.bind(this));
        

    }

    update(cameraPosition) {
        if(this.cube){
            this.cube.material.uniforms[ 'uCamPos' ].value.multiplyVectors(cameraPosition, this.negativeY);
        }
    }
    setLayer(num){
        if(this.cube){
            this.cube.layers.set(this.layer);
        }else{
            this.layer = num;
        }
    }

    loadTextFile(url){
        return new Promise((resolve, reject)=>{
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    if(this.status == 200){
                        resolve(this.responseText);
                    }else{
                        reject(this);
                    }
                }
            };
            xhttp.open("GET", url, true);
            xhttp.setRequestHeader('Accept', 'x-shader/*');
            xhttp.send();
        });
    }
}
export default Cloud;