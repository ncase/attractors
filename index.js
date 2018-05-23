window.onscroll = function(){

	// Playable Iframes
	var iframes = document.querySelectorAll("iframe");
	var scrollY = window.pageYOffset;
	var innerHeight = window.innerHeight;
	for(var i=0;i<iframes.length;i++){
		var iframe = iframes[i];
		var frameTopIsAboveScreenBottom = iframe.offsetTop<scrollY+innerHeight;
		var frameBottomIsBelowScreenTop = iframe.offsetTop+parseInt(iframe.height)>scrollY;
		iframe.contentWindow.IS_IN_SIGHT = frameTopIsAboveScreenBottom && frameBottomIsBelowScreenTop;
	}

};
window.onload = function(){
	window.onscroll();
};