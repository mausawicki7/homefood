( function () {
	'use strict';

	var root = document.querySelector( '[data-hf-carousel]' );
	if ( ! root ) return;

	var track = root.querySelector( '.hf-carousel__track' );
	var slides = Array.prototype.slice.call( root.querySelectorAll( '.hf-carousel__slide' ) );
	var dotsWrap = root.querySelector( '[data-hf-carousel-dots]' );
	var prevBtn = root.querySelector( '[data-hf-carousel-prev]' );
	var nextBtn = root.querySelector( '[data-hf-carousel-next]' );
	var index = 0;
	var timer = null;
	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	if ( ! slides.length ) return;

	slides.forEach( function ( slide, i ) {
		var dot = document.createElement( 'button' );
		dot.type = 'button';
		dot.className = 'hf-carousel__dot';
		dot.setAttribute( 'aria-label', 'Ir al testimonio ' + ( i + 1 ) );
		dot.addEventListener( 'click', function () {
			goTo( i );
			restartAutoplay();
		} );
		dotsWrap.appendChild( dot );
	} );

	var dots = Array.prototype.slice.call( dotsWrap.children );

	function update() {
		track.style.transform = 'translateX(-' + ( index * 100 ) + '%)';
		dots.forEach( function ( dot, i ) {
			dot.classList.toggle( 'is-active', i === index );
		} );
	}

	function goTo( i ) {
		index = ( i + slides.length ) % slides.length;
		update();
	}

	function next() { goTo( index + 1 ); }
	function prev() { goTo( index - 1 ); }

	function restartAutoplay() {
		if ( reduceMotion ) return;
		clearInterval( timer );
		timer = setInterval( next, 6000 );
	}

	prevBtn.addEventListener( 'click', function () { prev(); restartAutoplay(); } );
	nextBtn.addEventListener( 'click', function () { next(); restartAutoplay(); } );

	root.addEventListener( 'mouseenter', function () { clearInterval( timer ); } );
	root.addEventListener( 'mouseleave', restartAutoplay );
	root.addEventListener( 'focusin', function () { clearInterval( timer ); } );
	root.addEventListener( 'focusout', restartAutoplay );

	// Swipe táctil
	var startX = null;
	track.addEventListener( 'touchstart', function ( e ) { startX = e.touches[0].clientX; }, { passive: true } );
	track.addEventListener( 'touchend', function ( e ) {
		if ( startX === null ) return;
		var delta = e.changedTouches[0].clientX - startX;
		if ( Math.abs( delta ) > 40 ) {
			delta < 0 ? next() : prev();
			restartAutoplay();
		}
		startX = null;
	} );

	update();
	restartAutoplay();
} )();
