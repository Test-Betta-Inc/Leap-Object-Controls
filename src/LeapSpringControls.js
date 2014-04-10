/**
 * @author cabbibo / http://cabbibo.com
 *
 * Pinch to create a new anchor! 
 * Will need to pass in a Scene, as well as a leap controller
 * In order to create the camera, so that you can place the 
 * UI elements
 *
 * TODO: Add a places traveled array which will only be of a certain length
 *
 */

THREE.LeapSpringControls = function ( object , controller , scene , domElement ) {

  this.object     = object;
  this.controller = controller;
  this.scene      = scene;
  this.domElement = ( domElement !== undefined ) ? domElement : document;

  // API
  
  this.enable = true;

  this.velocity = new THREE.Vector3();
  this.acceleration = new THREE.Vector3();

  this.dampening = ( object.dampening !== undefined ) ? object.dampening : .95;

  this.weakDampening    = .99;
  this.strongDampening  = .8;

  this.dampening        = this.strongDampening;

  this.size             = 120;
  this.springConstant   = 7;
  this.staticLength     = this.size ;
  this.mass             = 1000;

  this.anchorToTarget   = 24;


  this.interactionBox   = {
    center: [ 0 , 0 , 0 ],
    size:   [ 0 , 0 , 0 ]
  }

  this.placesTraveled   = [];
  

  // Creates the Target Object ( object that will tween to anchor )
  this.target = new THREE.Object3D();
  this.targetIndicator = new THREE.Mesh( 
    new THREE.IcosahedronGeometry( this.size / 250 , 1 ), 
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: .5 , transparent:true }) 
  );
  this.target.add( this.targetIndicator );
  this.scene.add( this.target );


  // Creates the Anchor Object ( object that will switch instantly )
  this.anchor = new THREE.Object3D();
  this.anchorIndicator = new THREE.Mesh( 
    new THREE.IcosahedronGeometry( this.size/10, 1 ),
    new THREE.MeshBasicMaterial({ color:0xffffff  }) 
  );
  //this.anchor.add( this.anchorIndicator ); // Uncomment , so show where target is tweening
  this.scene.add( this.anchor );


  // Lets us know where our finger is
  this.fingerIndicator = new THREE.Mesh(
    new THREE.IcosahedronGeometry( this.size/200 , 1 ),
    new THREE.MeshBasicMaterial({ color:0xffffff , opacity: .5 , transparent:true }) 
  );
  scene.add( this.fingerIndicator );

  this.getForce = function(){

    var difference = new THREE.Vector3();
    difference.subVectors( this.object.position , this.anchor.position );

    var l = difference.length();
    var x = l - this.staticLength;


    // Hooke's Law
    var f = difference.normalize().multiplyScalar(x).multiplyScalar( this.springConstant );

    return f;

  }

  this.applyForce = function( f ){

    this.acceleration = f.multiplyScalar( 1 / this.mass );

    this.velocity.add( this.acceleration );

    this.velocity.multiplyScalar( this.dampening );

    this.object.position.sub( this.velocity );

  }

  this.leapToScene = function( position ){

    var x = position[0] - this.interactionBox.center[0];
    var y = position[1] - this.interactionBox.center[1];
    var z = position[2] - this.interactionBox.center[2];
      
    x /= this.interactionBox.size[0];
    y /= this.interactionBox.size[1];
    z /= this.interactionBox.size[2];

    x *= this.size;
    y *= this.size;
    z *= this.size;

    return new THREE.Vector3( x , y , z );

  }


  this.checkForNewAnchor = function(){

    // getting our frame object
    this.frame = this.controller.frame();

    // If this is the first frame, assign an old frame,
    // and also the interaction box
    if( !this.oFrame ){
      this.oFrame = this.frame;
    }

    if( this.frame.valid ){
      this.interactionBox = this.frame.data.interactionBox;
    }


  
    if( this.frame ){

      if( this.frame.hands[0] && this.frame.pointables.length ){

        /*

           First off move the finger indicator to the correct position

        */
        var position    = this.leapToScene( this.frame.hands[0].palmPosition );
        position.z     -= this.size;
        position.applyMatrix4( this.object.matrix ); 

        this.fingerIndicator.position = position;

        /*
         
           If the user is pinching, add

        */
        var pinchStrength = this.frame.hands[0].pinchStrength;
        if( pinchStrength > .5 ){
    
          this.target.position = position;

          //Uncomment to keep track of places traveled ( MEMORY LEAK WARNING )
          //this.placesTraveled.push( position ); 
       
        }

      }else{

        this.fingerIndicator.position.x = this.size * 10000;

      }

    }

    this.oFrame = this.frame;

  }

  this.update = function(){

    // Just incase this is overwritten somewhere else in the code
    this.object.matrixAutoUpdate = true;


    /*
     
       Since we always want to look at the anchor,
       This means that we want to make sure that it doesn't jump
       from position to position whenever we select a new target

       Because of this, always move the anchor towards the target

    */

    var a = this.anchor.position;
    var t = this.target.position;
   
    // Moves the anchor towards the target
    a.x   = a.x - ( a.x - t.x ) / this.anchorToTarget;
    a.y   = a.y - ( a.y - t.y ) / this.anchorToTarget;
    a.z   = a.z - ( a.z - t.z ) / this.anchorToTarget;
   

    // Get and apply the spring forces
    f = this.getForce();
    this.applyForce( f );

    // Makes sure that we are always looking at the 
    // anchor position
    this.object.lookAt( this.anchor.position );


    this.checkForNewAnchor();

  }

}
