/****************************

TRY: LINKED REPRESENTATIONS!

****************************/

var canvas = document.createElement("canvas");
canvas.style.width = 400;
canvas.style.height = 600;
canvas.width = parseInt(canvas.style.width)*2;
canvas.height = parseInt(canvas.style.height)*2;
canvas.style.border = "1px solid #bbb";
var ctx = canvas.getContext('2d');

// INIT
window.onload = function(){
	Mouse.init(canvas);
	init();
};

var population;
var populationSlider;
var hill;
var hillShaper;
var fish;
var moreButton, lessButton;

function init(){

	// Add Canvas
	document.body.appendChild(canvas);

	// Population
	population = new Population();
	populationSlider = new PopulationSlider(population);
	hill = new Hill(population);
	hillShaper = new HillShaper(population, hill);
	fish = new Fish(population);

	// Buttons
	var externalVelocity = 22;
	lessButton = new Button({
		x:200, y:25,
		width:150, height:35,
		label:labels.catchFish,
		onclick: function(){
			population.externalVelocity = -externalVelocity;
		}
	});
	moreButton = new Button({
		x:200, y:65,
		width:150, height:35,
		label:labels.releaseFish,
		onclick: function(){
			population.externalVelocity = externalVelocity;
		},
		fontsize:17
	});

	// Update
	update();

}

// UPDATE
function update(){

	// Model
	population.update();
	populationSlider.update();
	hill.update();
	hillShaper.update();
	fish.update();

	// Buttons
	lessButton.update();
	moreButton.update();

	// Draw
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.save();
	ctx.scale(2,2);
	{
	
		// Background
		//ctx.drawImage(images.placeholder, 0, 0, 400, 600);

		// The Water
		fish.draw(ctx);
		ctx.drawImage(
			(population.n>0) ? images.water1 : images.water2,
			0, 10, 400, 200
		);

		// The UI
		hill.draw(ctx);
		populationSlider.draw(ctx);
		hillShaper.draw(ctx);

		// Buttons
		lessButton.draw(ctx);
		moreButton.draw(ctx);

	}
	ctx.restore();

	// Mouse
	Mouse.update();

	// RAF
	requestAnimationFrame(update);

}


///////////////////////////////////////////////
// THE MODEL //////////////////////////////////
///////////////////////////////////////////////

// POPULATION
function Population(){

	var self = this;

	self.n = 350;
	self.thresholdUnder = 300;
	self.thresholdOver = 700;
	self.min = 0;
	self.max = 1000;

	self.disabled = false;
	self.disable = function(){ self.disabled=true; };
	self.enable = function(){ self.disabled=false; };

	self.externalVelocity = 0;

	self.calculateVelocity = function(n){
		var velocity = ((n-self.thresholdUnder) * (self.thresholdOver-n))*0.0001;
		//if(Math.abs(velocity)<0.01) velocity=0; // too small? forget it
		return velocity;
	};

	self.update = function(){

		// Velocity & Bounds
		if(!self.disabled){
			self.n += self.calculateVelocity(self.n);
		}
		if(self.n<self.min) self.n=self.min;
		if(self.n>self.max) self.n=self.max;

		// External velocity & bounds again
		if(!self.disabled){
			self.n += self.externalVelocity;
			self.externalVelocity *= 0.9;
		}else{
			self.externalVelocity = 0;
		}
		if(Math.abs(self.externalVelocity)<1) self.externalVelocity=0;
		if(self.n<self.min) self.n=self.min;
		if(self.n>self.max) self.n=self.max;

	}

}

function Fish(population){

	var self = this;

	self.population = population;

	self.top = 145;
	self.height = 65;
	self.width = 400;

	self.fishes = [];
	for(var i=0; i<100; i++){
		self.fishes.push({
			x: Math.random()*self.width,
			y: self.top+Math.random()*self.height,
			speed: (Math.random()>0.5?-1:1) * (0.05+Math.random()*0.15)
		});
	}
	var buffer = 50;
	self.update = function(){
		for(var i=0; i<self.fishes.length; i++){
			var fish = self.fishes[i];
			fish.x += fish.speed;
			if(fish.x<-buffer) fish.x=self.width+buffer;
			if(fish.x>self.width+buffer) fish.x=-buffer;
		}
	};
	self.draw = function(){
		var pop = self.population;
		var count = Math.ceil(self.fishes.length * (pop.n/pop.max));
		for(var i=0; i<count; i++){
			var fish = self.fishes[i];
			var img = images.fish;
			var w = 40;
			var h = w/2;
			ctx.save();
			ctx.translate(fish.x, fish.y);
			if(fish.speed<0) ctx.scale(-1,1);
			ctx.drawImage(img, -w/2, -h/2, w, h);
			ctx.restore();
		}
	};


}

function PopulationSlider(population){

	var self = this;

	self.population = population;
	var pop = self.population;

	self.left = 50;
	self.top = 280;
	self.width = 300;
	self.buttonRadius = 25;
	self.buttonX = self.left;

	self.isDragging = false;
	self.dragOffset = 0;

	self.update = function(){

		// If you clicked this, drag it! (and disable population)
		if(!Mouse.lastPressed && Mouse.pressed){
			var isHittingButton = hitCircle(self.buttonX, self.top, Mouse.x, Mouse.y, self.buttonRadius);
			if(isHittingButton){
				self.isDragging = true;
				self.dragOffset = Mouse.x-self.buttonX;
				population.disable();
			}
		}

		// Drag it!
		if(self.isDragging){
			self.buttonX = Mouse.x - self.dragOffset;
			// Bounds
			if(self.buttonX<self.left) self.buttonX=self.left;
			if(self.buttonX>self.left+self.width) self.buttonX=self.left+self.width;
		}

		// Or... NOT.
		if(self.isDragging && !Mouse.pressed){
			self.isDragging = false;
			population.enable();
		}

		// Slider -> Population, or Population -> Slider?
		var p = population;
		if(p.disabled){
			p.n = p.min + ((self.buttonX-self.left)/(self.width))*(p.max-p.min);
		}else{
			self.buttonX = self.left + ((p.n-p.min)/(p.max-p.min))*self.width;
		}

	};

	self.draw = function(ctx){

		// Label
		var label = labels.population+" "+Math.ceil(pop.n/10);
		ctx.font = '23px sans-serif';
		ctx.fillStyle = "#000";
		ctx.textAlign = "left";
		ctx.fillText(label, self.left-self.buttonRadius, self.top-35);

		// Slider
		ctx.fillStyle = "#eee";
		ctx.beginPath();
		ctx.arc(self.left, self.top, self.buttonRadius, 0, Math.TAU);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(self.left+self.width, self.top, self.buttonRadius, 0, Math.TAU);
		ctx.fill();
		ctx.beginPath();
		ctx.rect(self.left, self.top-self.buttonRadius, self.width, self.buttonRadius*2);
		ctx.fill();

		// Button
		ctx.fillStyle = "#ee4040";
		ctx.beginPath();
		ctx.arc(self.buttonX, self.top, self.buttonRadius, 0, Math.TAU);
		ctx.fill();

		// Velocity Arrow
		ctx.fillStyle = "#fff";
		var velocity = pop.calculateVelocity(pop.n);
		var w = 10;
		var h = 15;
		var s = velocity*0.15;
		if(s>1.1) s=1.1;
		if(s<-1.1) s=-1.1;
		ctx.save();
		ctx.translate(self.buttonX, self.top);
		ctx.scale(s,s);
		ctx.translate(-w*0.6, 0);
			ctx.beginPath();
			ctx.moveTo(-w, -h/2); // top-left
			ctx.lineTo(w, -h/2); // middle-top
			ctx.lineTo(w, -h/2-w); // arrow-top
			ctx.lineTo(w+w*1.5, 0); // arrow-end
			ctx.lineTo(w, h/2+w); // arrow-bottom
			ctx.lineTo(w, h/2); // middle-bottom
			ctx.lineTo(-w, h/2); // bottom-left
			ctx.fill();
		ctx.restore();

		// Arrows & Labels
		ctx.strokeStyle = "#ccc";
		ctx.lineWidth = 2;
		ctx.save();
		ctx.translate(0, self.top+40);
			_drawArrow(ctx, pop.min-36, pop.thresholdUnder, -1);
			_drawArrow(ctx, pop.thresholdUnder, pop.thresholdOver, 1);
			_drawArrow(ctx, pop.thresholdOver, pop.max+36, -1);
		ctx.restore();

	};

	var _drawArrow = function(ctx, from, to, direction){
		
		from = _popToSlider(from);
		to = _popToSlider(to);
		
		from += 10;
		to -= 10;
		if(to-from<10) return;

		ctx.beginPath();
		ctx.moveTo(from, 0);
		ctx.lineTo(to, 0);
		ctx.stroke();

		// arrow head
		ctx.save();
		ctx.translate((direction>0)?to:from, 0);
		ctx.rotate((direction>0)?0:Math.TAU/2, 0);
			ctx.beginPath();
			ctx.moveTo(-5, -5);
			ctx.lineTo(0,0);
			ctx.lineTo(-5, 5);
			ctx.stroke();
		ctx.restore();

	}

	var _popToSlider = function(n){
		return self.left + ((n-pop.min)/(pop.max-pop.min))*self.width;
	};

}


function Hill(population){

	var self = this;

	self.population = population;

	self.left = 50;
	self.top = 360;
	self.width = 300;
	self.height = 150;

	self.update = function(){
	}

	self.draw = function(ctx){

		// Calculate hill
		var points = [];
		var pop = self.population;
		var x = pop.min;
		var y = 600;
		points.push([x,y]);
		var ymin = y;
		var ymax = y;
		while(x<pop.max){
			var slope = pop.calculateVelocity(x);
			y += slope;
			x += 10;
			if(ymin>y) ymin=y;
			if(ymax<y) ymax=y;
			points.push([x,y]);
		}

		// Re-normalize...
		points.forEach(function(point){
			var x = self.left + ((point[0]-pop.min)/(pop.max-pop.min))*self.width;
			var y = self.top + ((point[1]-ymin)/(ymax-ymin))*self.height;
			point[0] = x;
			point[1] = y;
		});

		// Draw hill
		var p = points[0];
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(p[0], p[1]);
		for(var i=1; i<points.length; i++){
			var p = points[i];
			ctx.lineTo(p[0], p[1]);
		}
		ctx.stroke();

		// Calculate Ball's position...
		var x = self.left + ((pop.n-pop.min)/(pop.max-pop.min))*self.width;
		var a, b;
		for(var i=0; i<points.length; i++){
			if(x<points[i][0]){
				a = points[i-1];
				b = points[i];
				break;
			}
		}
		if(!a){ // IF NO THING? Just LAST POINT
			y = points[points.length-1][1];
		}else{
			var t = (x-a[0])/(b[0]-a[0]);
			var y = a[1] + t*(b[1]-a[1]);
		}

		// Draw slider to ball dotted line...
		ctx.strokeStyle = "#000";
		ctx.beginPath();
		ctx.lineWidth = 1;
		var line_dot = 0;
		for(var line_y=y; line_y>300; line_y-=2){
			if(line_dot%4==0){
				ctx.moveTo(x, line_y);
			}else if(line_dot%4==1){
				ctx.lineTo(x, line_y);
			}
			line_dot++;
		}
		ctx.stroke();

		// Draw Ball
		var ballRadius = 12;
		var angle = (x/(ballRadius*Math.TAU))*Math.TAU;
		ctx.save();
		ctx.translate(x, y-ballRadius);
		ctx.rotate(angle);
		ctx.fillStyle = "#000";
		ctx.beginPath(); ctx.arc(0, 0, ballRadius, 0, Math.TAU); ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.beginPath(); ctx.arc(0, ballRadius*0.5, ballRadius*0.25, 0, Math.TAU); ctx.fill();
		ctx.restore();

	};

}

function HillShaper(population, hill){

	var self = this;
	self.population = population;
	self.hill = hill;

	self.top = 255;
	self.height = 320;

	// Convert positions...
	var pop = self.population;
	var hill = self.hill;
	var _popToHill = function(n){
		return hill.left + ((n-pop.min)/(pop.max-pop.min))*hill.width;
	};
	var _hillToPop = function(x){
		return pop.min + ((x-hill.left)/(hill.width))*(pop.max-pop.min);
	}
	self.buttonRadius = 25;
	self.underButtonX = _popToHill(pop.thresholdUnder);
	self.underButtonY = 550;
	self.overButtonY = self.underButtonY;
	self.overButtonX = _popToHill(pop.thresholdOver);

	self.isDraggingUnder = false;
	self.isDraggingOver = false;
	self.dragOffset = 0;

	// Dragging sliders -- the thresholds!
	self.update = function(){

		// Clicked...
		if(!Mouse.lastPressed && Mouse.pressed){

			// Clicked Under...
			if( !self.isDraggingUnder
				&& Mouse.x<self.underButtonX // left side
				&& hitCircle(self.underButtonX,self.underButtonY,Mouse.x,Mouse.y,self.buttonRadius)
			){
				self.isDraggingUnder = true;
				self.dragOffset = Mouse.x-self.underButtonX;
			}

			// Clicked Over...
			if( !self.isDraggingOver
				&& Mouse.x>self.overButtonX // right side
				&& hitCircle(self.overButtonX,self.overButtonY,Mouse.x,Mouse.y,self.buttonRadius)
			){
				self.isDraggingOver = true;
				self.dragOffset = Mouse.x-self.overButtonX;
			}

		}
		if(!Mouse.pressed){
			self.isDraggingUnder = false;
			self.isDraggingOver = false;
		}

		// Dragging...
		if(Mouse.pressed){
			if(self.isDraggingUnder){
				self.underButtonX = Mouse.x-self.dragOffset;

				// Bounds & Push
				if(self.underButtonX<hill.left) self.underButtonX=hill.left;
				if(self.underButtonX>hill.left+hill.width) self.underButtonX=hill.left+hill.width;
				if(self.underButtonX>self.overButtonX) self.overButtonX=self.underButtonX;

			}
			if(self.isDraggingOver){
				self.overButtonX = Mouse.x-self.dragOffset;

				// Bounds & Push
				if(self.overButtonX<hill.left) self.overButtonX=hill.left;
				if(self.overButtonX>hill.left+hill.width) self.overButtonX=hill.left+hill.width;
				if(self.underButtonX>self.overButtonX) self.underButtonX=self.overButtonX;

			}
			pop.thresholdUnder = _hillToPop(self.underButtonX);
			pop.thresholdOver = _hillToPop(self.overButtonX);
		}


	};

	self.draw = function(ctx){

		// Draw Under tab
		ctx.fillStyle = "#ee4040";
		ctx.beginPath();
		ctx.arc(self.underButtonX, self.underButtonY, self.buttonRadius, Math.TAU/4, -Math.TAU/4);
		ctx.fill();

		// Draw Over tab
		ctx.beginPath();
		ctx.arc(self.overButtonX, self.overButtonY, self.buttonRadius, -Math.TAU/4, Math.TAU/4);
		ctx.fill();

		// Thresholds...
		ctx.strokeStyle = "rgba(0,0,0,0.25)";
		ctx.lineWidth = 1;
		var x = _popToHill(pop.thresholdUnder);
		ctx.beginPath();
		ctx.moveTo(x, self.top);
		ctx.lineTo(x, self.top+self.height);
		var x = _popToHill(pop.thresholdOver);
		ctx.moveTo(x, self.top);
		ctx.lineTo(x, self.top+self.height);
		ctx.stroke();

	}

}

function Button(config){

	var self = this;

	self.x = config.x;
	self.y = config.y;
	self.width = config.width;
	self.height = config.height;
	self.onclick = config.onclick;
	self.label = config.label;
	self.fontsize = config.fontsize||20;

	self.update = function(){

		// If you clicked this...
		if(!Mouse.lastPressed && Mouse.pressed){
			var clickedButton = hitRectangle(
				Mouse.x, Mouse.y,
				self.x, self.y, self.width, self.height
			);
			if(clickedButton){
				self.onclick();
			}
		}

	};

	self.draw = function(ctx){
		
		ctx.fillStyle = "#ee4040";
		drawRoundedRectangle(ctx, self.x, self.y, self.width, self.height, 15);

		ctx.font = self.fontsize+'px sans-serif';
		ctx.fillStyle = "#fff";
		ctx.textAlign = "center";
		ctx.textBaseline="middle"; 
		ctx.fillText(self.label, self.x+self.width/2, self.y+self.height/2);

	};

}



///////////////////////////////////////////////
// META STUFF /////////////////////////////////
///////////////////////////////////////////////

// IMAGES
var images = {};
function addImage(name, src){
	images[name] = new Image();
	images[name].src = src;
}
//addImage("placeholder", "bg.png");
addImage("water1", "water1.png");
addImage("water2", "water2.png");
addImage("fish", "fish.png");

// LABELS
var labels = {
	population: "POPULATION:",
	catchFish: "CATCH FISH!",
	releaseFish: "RELEASE FISH!",
};
